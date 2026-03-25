import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { writeFile, unlink } from 'node:fs/promises'
import { createLogger, PATHS } from '@hospitality-channels/common'
import { capturePageVideo } from '@hospitality-channels/render-core'
import { publishArtifact } from '@hospitality-channels/publish'
import { eq } from 'drizzle-orm'
import { db, clips, publishedArtifacts } from './db.js'
import type { Job } from './queue.js'

const logger = createLogger('worker:handlers')

function generateId(): string {
	return randomBytes(12).toString('hex')
}

const WEB_URL = process.env.WEB_URL || 'http://localhost:3000'

async function resolveAudioForClip(clipId: string): Promise<{ audioPath?: string; matchAudioDuration?: boolean; tempFile?: string }> {
	try {
		const [clip] = await db.select().from(clips).where(eq(clips.id, clipId)).limit(1)
		if (!clip) {
			logger.warn('resolveAudio: clip not found', { clipId })
			return {}
		}

		const data = (clip.dataJson ?? {}) as Record<string, string>
		const audioUrl = data.backgroundAudioUrl
		const matchDuration = data.matchAudioDuration === 'true'

		logger.info('resolveAudio: clip data', { clipId, audioUrl: audioUrl ?? '(none)', matchDuration, dataKeys: Object.keys(data) })

		if (!audioUrl) {
			logger.info('resolveAudio: no backgroundAudioUrl set — rendering without audio')
			return {}
		}

		const rendersDir = path.resolve(PATHS.renders)
		await import('node:fs/promises').then(fs => fs.mkdir(rendersDir, { recursive: true }))

		// If it's an internal asset serve URL, download via the web server
		if (audioUrl.startsWith('/api/assets/serve')) {
			const fullUrl = `${WEB_URL}${audioUrl}`
			logger.info('resolveAudio: fetching internal asset', { fullUrl })
			const res = await fetch(fullUrl)
			if (!res.ok) {
				logger.warn('resolveAudio: failed to fetch internal asset', { url: fullUrl, status: res.status, statusText: res.statusText })
				return {}
			}
			const buffer = Buffer.from(await res.arrayBuffer())
			logger.info('resolveAudio: downloaded internal asset', { bytes: buffer.length })
			const ext = path.extname(new URL(fullUrl, 'http://localhost').searchParams.get('path') ?? '.mp3') || '.mp3'
			const tempPath = path.join(rendersDir, `_audio-${Date.now()}${ext}`)
			await writeFile(tempPath, buffer)
			return { audioPath: tempPath, matchAudioDuration: matchDuration, tempFile: tempPath }
		}

		// If it's an absolute URL, download it
		if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
			logger.info('resolveAudio: fetching external URL', { audioUrl })
			const res = await fetch(audioUrl)
			if (!res.ok) {
				logger.warn('resolveAudio: failed to fetch external audio', { url: audioUrl, status: res.status, statusText: res.statusText })
				return {}
			}
			const buffer = Buffer.from(await res.arrayBuffer())
			logger.info('resolveAudio: downloaded external audio', { bytes: buffer.length })
			const tempPath = path.join(rendersDir, `_audio-${Date.now()}.mp3`)
			await writeFile(tempPath, buffer)
			return { audioPath: tempPath, matchAudioDuration: matchDuration, tempFile: tempPath }
		}

		// Otherwise treat as a filesystem path — verify it exists
		logger.info('resolveAudio: using filesystem path', { audioUrl })
		const { access } = await import('node:fs/promises')
		try {
			await access(audioUrl)
		} catch {
			logger.warn('resolveAudio: filesystem audio path not accessible', { audioUrl })
			return {}
		}
		return { audioPath: audioUrl, matchAudioDuration: matchDuration }
	} catch (err) {
		logger.warn('resolveAudio: unexpected error', { clipId, error: String(err) })
		return {}
	}
}

export async function handleRenderJob(job: Job): Promise<string> {
	const payload = job.payload as {
		durationSec: number
		clipTitle: string
		clipSlug: string
	}

	const clipId = job.clipId ?? 'unknown'
	const url = `${WEB_URL}/clips/${clipId}/render`
	const slug = payload.clipSlug || clipId
	const now = new Date()
	const ts = now
		.toISOString()
		.replace(/[:T]/g, '-')
		.replace(/\.\d+Z$/, '')
	const outputDir = path.resolve(PATHS.renders)
	const finalPath = path.join(outputDir, `${slug}_${ts}.mp4`)

	const audio = await resolveAudioForClip(clipId)

	logger.info('Starting render', { clipId, url, durationSec: payload.durationSec, hasAudio: !!audio.audioPath, audioPath: audio.audioPath, matchAudioDuration: audio.matchAudioDuration })

	const captureResult = await capturePageVideo({
		url,
		outputPath: finalPath,
		durationSec: payload.durationSec,
		audioPath: audio.audioPath,
		matchAudioDuration: audio.matchAudioDuration,
	})

	// Clean up temp audio file
	if (audio.tempFile) await unlink(audio.tempFile).catch(() => {})

	if (!captureResult.success) {
		throw new Error(`Capture failed: ${captureResult.error}`)
	}

	logger.info('Render complete', { clipId, outputPath: finalPath })
	return finalPath
}

export async function handlePublishJob(job: Job): Promise<string> {
	const payload = job.payload as {
		sourcePath: string
		clipTitle: string
		clipSlug: string
		durationSec: number
		exportPath: string
		fileNamingPattern: string | null
		outputFormat: string
	}

	const clipId = job.clipId ?? 'unknown'
	const profileId = job.profileId ?? 'unknown'

	if (!payload.sourcePath) {
		throw new Error('publish job requires sourcePath in payload')
	}

	logger.info('Starting publish', { clipId, exportPath: payload.exportPath })

	const result = await publishArtifact({
		sourcePath: payload.sourcePath,
		clipId,
		clipTitle: payload.clipTitle,
		profile: {
			name: '',
			exportPath: payload.exportPath,
			outputFormat: payload.outputFormat as 'mp4',
			fileNamingPattern: payload.fileNamingPattern ?? undefined,
		},
		durationSec: payload.durationSec,
	})

	if (!result.success) {
		throw new Error(`Publish failed: ${result.error}`)
	}

	const artifactId = generateId()
	await db.insert(publishedArtifacts).values({
		id: artifactId,
		clipId,
		publishProfileId: profileId,
		outputPath: result.outputPath,
		posterPath: result.posterPath ?? null,
		durationSec: payload.durationSec,
		renderVersion: '1',
		status: 'published',
		publishedAt: new Date().toISOString(),
	})

	logger.info('Publish complete', { clipId, outputPath: result.outputPath, artifactId })
	return result.outputPath
}

export async function handleRenderPublishJob(job: Job): Promise<string> {
	const payload = job.payload as {
		durationSec: number
		clipTitle: string
		clipSlug: string
		exportPath: string
		fileNamingPattern: string | null
		outputFormat: string
	}

	const clipId = job.clipId ?? 'unknown'
	const profileId = job.profileId ?? 'unknown'

	// Step 1: Render
	const url = `${WEB_URL}/clips/${clipId}/render`
	const slug = payload.clipSlug || clipId
	const now = new Date()
	const ts = now
		.toISOString()
		.replace(/[:T]/g, '-')
		.replace(/\.\d+Z$/, '')
	const outputDir = path.resolve(PATHS.renders)
	const renderPath = path.join(outputDir, `${slug}_${ts}.mp4`)

	const audio = await resolveAudioForClip(clipId)

	logger.info('Starting render+publish', { clipId, url, durationSec: payload.durationSec, hasAudio: !!audio.audioPath, audioPath: audio.audioPath, matchAudioDuration: audio.matchAudioDuration })

	const captureResult = await capturePageVideo({
		url,
		outputPath: renderPath,
		durationSec: payload.durationSec,
		audioPath: audio.audioPath,
		matchAudioDuration: audio.matchAudioDuration,
	})

	// Clean up temp audio file
	if (audio.tempFile) await unlink(audio.tempFile).catch(() => {})

	if (!captureResult.success) {
		throw new Error(`Capture failed: ${captureResult.error}`)
	}

	logger.info('Render complete, publishing...', { clipId, renderPath, actualDuration: captureResult.durationSec })

	const actualDuration = captureResult.durationSec

	// Step 2: Publish
	const result = await publishArtifact({
		sourcePath: renderPath,
		clipId,
		clipTitle: payload.clipTitle,
		profile: {
			name: '',
			exportPath: payload.exportPath,
			outputFormat: payload.outputFormat as 'mp4',
			fileNamingPattern: payload.fileNamingPattern ?? undefined,
		},
		durationSec: actualDuration,
	})

	if (!result.success) {
		throw new Error(`Publish failed: ${result.error}`)
	}

	const artifactId = generateId()
	await db.insert(publishedArtifacts).values({
		id: artifactId,
		clipId,
		publishProfileId: profileId,
		outputPath: result.outputPath,
		posterPath: result.posterPath ?? null,
		durationSec: actualDuration,
		renderVersion: '1',
		status: 'published',
		publishedAt: new Date().toISOString(),
	})

	logger.info('Render+publish complete', { clipId, outputPath: result.outputPath, artifactId })
	return result.outputPath
}
