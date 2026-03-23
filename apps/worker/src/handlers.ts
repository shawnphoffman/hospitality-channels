import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { writeFile, unlink } from 'node:fs/promises'
import { createLogger, PATHS } from '@hospitality-channels/common'
import { capturePageVideo } from '@hospitality-channels/render-core'
import { publishArtifact } from '@hospitality-channels/publish'
import { eq } from 'drizzle-orm'
import { db, pages, publishedArtifacts } from './db.js'
import type { Job } from './queue.js'

const logger = createLogger('worker:handlers')

function generateId(): string {
	return randomBytes(12).toString('hex')
}

const WEB_URL = process.env.WEB_URL || 'http://localhost:3000'

async function resolveAudioForPage(pageId: string): Promise<{ audioPath?: string; matchAudioDuration?: boolean; tempFile?: string }> {
	try {
		const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1)
		if (!page) return {}

		const data = (page.dataJson ?? {}) as Record<string, string>
		const audioUrl = data.backgroundAudioUrl
		const matchDuration = data.matchAudioDuration === 'true'

		if (!audioUrl) return {}

		// If it's an internal asset serve URL, download via the web server
		if (audioUrl.startsWith('/api/assets/serve')) {
			const fullUrl = `${WEB_URL}${audioUrl}`
			const res = await fetch(fullUrl)
			if (!res.ok) {
				logger.warn('Failed to fetch audio asset', { url: fullUrl, status: res.status })
				return {}
			}
			const buffer = Buffer.from(await res.arrayBuffer())
			const ext = path.extname(new URL(fullUrl, 'http://localhost').searchParams.get('path') ?? '.mp3') || '.mp3'
			const tempPath = path.join(path.resolve(PATHS.renders), `_audio-${Date.now()}${ext}`)
			await writeFile(tempPath, buffer)
			return { audioPath: tempPath, matchAudioDuration: matchDuration, tempFile: tempPath }
		}

		// If it's an absolute URL, download it
		if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
			const res = await fetch(audioUrl)
			if (!res.ok) {
				logger.warn('Failed to fetch audio URL', { url: audioUrl, status: res.status })
				return {}
			}
			const buffer = Buffer.from(await res.arrayBuffer())
			const tempPath = path.join(path.resolve(PATHS.renders), `_audio-${Date.now()}.mp3`)
			await writeFile(tempPath, buffer)
			return { audioPath: tempPath, matchAudioDuration: matchDuration, tempFile: tempPath }
		}

		// Otherwise treat as a filesystem path
		return { audioPath: audioUrl, matchAudioDuration: matchDuration }
	} catch (err) {
		logger.warn('Failed to resolve audio for page', { pageId, error: String(err) })
		return {}
	}
}

export async function handleRenderJob(job: Job): Promise<string> {
	const payload = job.payload as {
		durationSec: number
		pageTitle: string
		pageSlug: string
	}

	const pageId = job.pageId ?? 'unknown'
	const url = `${WEB_URL}/pages/${pageId}/render`
	const slug = payload.pageSlug || pageId
	const now = new Date()
	const ts = now
		.toISOString()
		.replace(/[:T]/g, '-')
		.replace(/\.\d+Z$/, '')
	const outputDir = path.resolve(PATHS.renders)
	const finalPath = path.join(outputDir, `${slug}_${ts}.mp4`)

	const audio = await resolveAudioForPage(pageId)

	logger.info('Starting render', { pageId, url, durationSec: payload.durationSec, hasAudio: !!audio.audioPath })

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

	logger.info('Render complete', { pageId, outputPath: finalPath })
	return finalPath
}

export async function handlePublishJob(job: Job): Promise<string> {
	const payload = job.payload as {
		sourcePath: string
		pageTitle: string
		pageSlug: string
		durationSec: number
		exportPath: string
		fileNamingPattern: string | null
		outputFormat: string
	}

	const pageId = job.pageId ?? 'unknown'
	const profileId = job.profileId ?? 'unknown'

	if (!payload.sourcePath) {
		throw new Error('publish job requires sourcePath in payload')
	}

	logger.info('Starting publish', { pageId, exportPath: payload.exportPath })

	const result = await publishArtifact({
		sourcePath: payload.sourcePath,
		pageId,
		pageTitle: payload.pageTitle,
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
		pageId,
		publishProfileId: profileId,
		outputPath: result.outputPath,
		posterPath: result.posterPath ?? null,
		durationSec: payload.durationSec,
		renderVersion: '1',
		status: 'published',
		publishedAt: new Date().toISOString(),
	})

	logger.info('Publish complete', { pageId, outputPath: result.outputPath, artifactId })
	return result.outputPath
}

export async function handleRenderPublishJob(job: Job): Promise<string> {
	const payload = job.payload as {
		durationSec: number
		pageTitle: string
		pageSlug: string
		exportPath: string
		fileNamingPattern: string | null
		outputFormat: string
	}

	const pageId = job.pageId ?? 'unknown'
	const profileId = job.profileId ?? 'unknown'

	// Step 1: Render
	const url = `${WEB_URL}/pages/${pageId}/render`
	const slug = payload.pageSlug || pageId
	const now = new Date()
	const ts = now
		.toISOString()
		.replace(/[:T]/g, '-')
		.replace(/\.\d+Z$/, '')
	const outputDir = path.resolve(PATHS.renders)
	const renderPath = path.join(outputDir, `${slug}_${ts}.mp4`)

	const audio = await resolveAudioForPage(pageId)

	logger.info('Starting render+publish', { pageId, url, durationSec: payload.durationSec, hasAudio: !!audio.audioPath })

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

	logger.info('Render complete, publishing...', { pageId, renderPath })

	// Step 2: Publish
	const result = await publishArtifact({
		sourcePath: renderPath,
		pageId,
		pageTitle: payload.pageTitle,
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
		pageId,
		publishProfileId: profileId,
		outputPath: result.outputPath,
		posterPath: result.posterPath ?? null,
		durationSec: payload.durationSec,
		renderVersion: '1',
		status: 'published',
		publishedAt: new Date().toISOString(),
	})

	logger.info('Render+publish complete', { pageId, outputPath: result.outputPath, artifactId })
	return result.outputPath
}
