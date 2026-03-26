import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { writeFile, unlink, mkdir } from 'node:fs/promises'
import { createLogger, PATHS } from '@hospitality-channels/common'
import { capturePageVideo, captureScreenshot, probeDuration } from '@hospitality-channels/render-core'
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

async function resolveVideoForClip(clipId: string): Promise<{ videoPath?: string; tempFile?: string }> {
	try {
		const [clip] = await db.select().from(clips).where(eq(clips.id, clipId)).limit(1)
		if (!clip) return {}

		const data = (clip.dataJson ?? {}) as Record<string, string>
		const videoUrl = data.backgroundVideoUrl
		if (!videoUrl) return {}

		logger.info('resolveVideo: found backgroundVideoUrl', { clipId, videoUrl })

		const rendersDir = path.resolve(PATHS.renders)
		await mkdir(rendersDir, { recursive: true })

		if (videoUrl.startsWith('/api/assets/serve')) {
			const fullUrl = `${WEB_URL}${videoUrl}`
			const res = await fetch(fullUrl)
			if (!res.ok) {
				logger.warn('resolveVideo: failed to fetch internal asset', { url: fullUrl, status: res.status })
				return {}
			}
			const buffer = Buffer.from(await res.arrayBuffer())
			const ext = path.extname(new URL(fullUrl, 'http://localhost').searchParams.get('path') ?? '.mp4') || '.mp4'
			const tempPath = path.join(rendersDir, `_bgvideo-${Date.now()}${ext}`)
			await writeFile(tempPath, buffer)
			return { videoPath: tempPath, tempFile: tempPath }
		}

		if (videoUrl.startsWith('http://') || videoUrl.startsWith('https://')) {
			const res = await fetch(videoUrl)
			if (!res.ok) {
				logger.warn('resolveVideo: failed to fetch external video', { url: videoUrl, status: res.status })
				return {}
			}
			const buffer = Buffer.from(await res.arrayBuffer())
			const tempPath = path.join(rendersDir, `_bgvideo-${Date.now()}.mp4`)
			await writeFile(tempPath, buffer)
			return { videoPath: tempPath, tempFile: tempPath }
		}

		// Filesystem path
		const { access } = await import('node:fs/promises')
		try {
			await access(videoUrl)
		} catch {
			logger.warn('resolveVideo: filesystem path not accessible', { videoUrl })
			return {}
		}
		return { videoPath: videoUrl }
	} catch (err) {
		logger.warn('resolveVideo: unexpected error', { clipId, error: String(err) })
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
	const video = await resolveVideoForClip(clipId)

	logger.info('Starting render', {
		clipId,
		url,
		durationSec: payload.durationSec,
		hasAudio: !!audio.audioPath,
		audioPath: audio.audioPath,
		matchAudioDuration: audio.matchAudioDuration,
		hasVideoBackground: !!video.videoPath,
	})

	const captureResult = await capturePageVideo({
		url,
		outputPath: finalPath,
		durationSec: payload.durationSec,
		audioPath: audio.audioPath,
		matchAudioDuration: audio.matchAudioDuration,
		backgroundVideoPath: video.videoPath,
	})

	// Clean up temp files
	if (audio.tempFile) await unlink(audio.tempFile).catch(() => {})
	if (video.tempFile) await unlink(video.tempFile).catch(() => {})

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
		generateNfo?: boolean
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
		generateNfo: payload.generateNfo ?? true,
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
		generateNfo?: boolean
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
	const video = await resolveVideoForClip(clipId)

	logger.info('Starting render+publish', {
		clipId,
		url,
		durationSec: payload.durationSec,
		hasAudio: !!audio.audioPath,
		audioPath: audio.audioPath,
		matchAudioDuration: audio.matchAudioDuration,
		hasVideoBackground: !!video.videoPath,
	})

	const captureResult = await capturePageVideo({
		url,
		outputPath: renderPath,
		durationSec: payload.durationSec,
		audioPath: audio.audioPath,
		matchAudioDuration: audio.matchAudioDuration,
		backgroundVideoPath: video.videoPath,
	})

	// Clean up temp files
	if (audio.tempFile) await unlink(audio.tempFile).catch(() => {})
	if (video.tempFile) await unlink(video.tempFile).catch(() => {})

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
		generateNfo: payload.generateNfo ?? true,
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

// ─── Program rendering ──────────────────────────────────────────────────────

interface AudioTrackPayload {
	assetId?: string | null
	audioUrl?: string | null
	position: number
	durationSec?: number | null
}

/**
 * Resolves audio tracks for a program by downloading/locating each track
 * and returning local file paths in order.
 */
async function resolveAudioTracks(tracks: AudioTrackPayload[]): Promise<{ paths: string[]; tempFiles: string[] }> {
	const paths: string[] = []
	const tempFiles: string[] = []
	const rendersDir = path.resolve(PATHS.renders)
	await mkdir(rendersDir, { recursive: true })

	for (const track of tracks) {
		const audioUrl = track.audioUrl
		if (!audioUrl) {
			logger.warn('resolveAudioTracks: track has no audioUrl, skipping', { position: track.position })
			continue
		}

		// Internal asset URL
		if (audioUrl.startsWith('/api/assets/serve')) {
			const fullUrl = `${WEB_URL}${audioUrl}`
			try {
				const res = await fetch(fullUrl)
				if (!res.ok) {
					logger.warn('resolveAudioTracks: failed to fetch internal asset', { url: fullUrl, status: res.status })
					continue
				}
				const buffer = Buffer.from(await res.arrayBuffer())
				const ext = path.extname(new URL(fullUrl, 'http://localhost').searchParams.get('path') ?? '.mp3') || '.mp3'
				const tempPath = path.join(rendersDir, `_audio-${Date.now()}-${track.position}${ext}`)
				await writeFile(tempPath, buffer)
				paths.push(tempPath)
				tempFiles.push(tempPath)
			} catch (err) {
				logger.warn('resolveAudioTracks: fetch error', { url: fullUrl, error: String(err) })
			}
			continue
		}

		// External URL
		if (audioUrl.startsWith('http://') || audioUrl.startsWith('https://')) {
			try {
				const res = await fetch(audioUrl)
				if (!res.ok) {
					logger.warn('resolveAudioTracks: failed to fetch external audio', { url: audioUrl, status: res.status })
					continue
				}
				const buffer = Buffer.from(await res.arrayBuffer())
				const tempPath = path.join(rendersDir, `_audio-${Date.now()}-${track.position}.mp3`)
				await writeFile(tempPath, buffer)
				paths.push(tempPath)
				tempFiles.push(tempPath)
			} catch (err) {
				logger.warn('resolveAudioTracks: fetch error', { url: audioUrl, error: String(err) })
			}
			continue
		}

		// Filesystem path
		try {
			const { access } = await import('node:fs/promises')
			await access(audioUrl)
			paths.push(audioUrl)
		} catch {
			logger.warn('resolveAudioTracks: filesystem path not accessible', { audioUrl })
		}
	}

	return { paths, tempFiles }
}

/**
 * Concatenates multiple audio files into a single file using FFmpeg concat demuxer.
 */
async function concatenateAudio(audioPaths: string[], outputPath: string): Promise<boolean> {
	if (audioPaths.length === 0) return false
	if (audioPaths.length === 1) {
		// Just copy the single file
		const fs = await import('node:fs/promises')
		await fs.copyFile(audioPaths[0], outputPath)
		return true
	}

	// Create concat list file
	const listPath = outputPath + '.list.txt'
	const listContent = audioPaths.map(p => `file '${p}'`).join('\n')
	await writeFile(listPath, listContent, 'utf-8')

	const result = await new Promise<{ success: boolean; error?: string }>(resolve => {
		const proc = spawn('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outputPath], {
			stdio: ['ignore', 'pipe', 'pipe'],
		})

		let stderr = ''
		proc.stderr?.on('data', (chunk: Buffer) => {
			stderr += chunk.toString()
		})
		proc.on('close', code => {
			if (code === 0) resolve({ success: true })
			else resolve({ success: false, error: stderr.slice(-500) })
		})
		proc.on('error', err => resolve({ success: false, error: err.message }))
	})

	await unlink(listPath).catch(() => {})

	if (!result.success) {
		logger.warn('Audio concatenation failed', { error: result.error })
		return false
	}
	return true
}

/**
 * Stitches multiple clip screenshots into a video with audio using FFmpeg.
 * Each screenshot is displayed for perClipDuration seconds.
 */
async function stitchProgramVideo(
	screenshotPaths: string[],
	audioPath: string | null,
	perClipDuration: number,
	totalDuration: number,
	outputPath: string
): Promise<{ success: boolean; error?: string }> {
	const ffmpegArgs: string[] = ['-y']

	// Add each screenshot as an input with its duration
	for (const screenshot of screenshotPaths) {
		ffmpegArgs.push('-loop', '1', '-t', String(perClipDuration), '-framerate', '30', '-i', screenshot)
	}

	// Add audio if available
	if (audioPath) {
		ffmpegArgs.push('-i', audioPath)
	}

	// Build the concat filter for video streams
	const n = screenshotPaths.length
	let filterComplex = ''
	for (let i = 0; i < n; i++) {
		filterComplex += `[${i}:v]`
	}
	filterComplex += `concat=n=${n}:v=1:a=0[outv]`

	ffmpegArgs.push('-filter_complex', filterComplex)
	ffmpegArgs.push('-map', '[outv]')

	if (audioPath) {
		ffmpegArgs.push('-map', `${n}:a`)
		ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k')
		ffmpegArgs.push('-shortest')
	} else {
		ffmpegArgs.push('-t', String(totalDuration))
	}

	ffmpegArgs.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outputPath)

	logger.info('FFmpeg stitch command', { args: ffmpegArgs.join(' '), clips: n, perClipDuration, totalDuration, hasAudio: !!audioPath })

	return new Promise(resolve => {
		const proc = spawn('ffmpeg', ffmpegArgs, {
			stdio: ['ignore', 'pipe', 'pipe'],
		})

		let stderr = ''
		proc.stderr?.on('data', (chunk: Buffer) => {
			stderr += chunk.toString()
		})
		proc.on('close', code => {
			if (code === 0) resolve({ success: true })
			else resolve({ success: false, error: stderr.slice(-500) })
		})
		proc.on('error', err => resolve({ success: false, error: err.message }))
	})
}

export async function handleRenderProgramJob(job: Job): Promise<string> {
	const payload = job.payload as {
		durationSec: number
		programTitle: string
		programSlug: string
		clipIds: string[]
		audioTracks: AudioTrackPayload[]
	}

	const programId = job.programId ?? 'unknown'
	const clipIds = payload.clipIds
	const totalDuration = payload.durationSec
	const perClipDuration = clipIds.length > 0 ? totalDuration / clipIds.length : totalDuration

	logger.info('Starting program render', {
		programId,
		clipCount: clipIds.length,
		totalDuration,
		perClipDuration,
		audioTrackCount: payload.audioTracks.length,
	})

	const outputDir = path.resolve(PATHS.renders)
	await mkdir(outputDir, { recursive: true })

	const slug = payload.programSlug || programId
	const ts = new Date()
		.toISOString()
		.replace(/[:T]/g, '-')
		.replace(/\.\d+Z$/, '')

	// Step 1: Capture screenshots for each clip
	const screenshotPaths: string[] = []
	for (let i = 0; i < clipIds.length; i++) {
		const url = `${WEB_URL}/programs/${programId}/render?clipIndex=${i}`
		const screenshotPath = path.join(outputDir, `_program-${programId}-clip${i}-${Date.now()}.png`)
		try {
			await captureScreenshot({ url, outputPath: screenshotPath })
			screenshotPaths.push(screenshotPath)
		} catch (err) {
			logger.error('Failed to capture clip screenshot', { programId, clipIndex: i, error: String(err) })
			// Clean up already-captured screenshots
			for (const p of screenshotPaths) await unlink(p).catch(() => {})
			throw new Error(`Failed to capture clip ${i}: ${err instanceof Error ? err.message : String(err)}`)
		}
	}

	// Step 2: Resolve and concatenate audio tracks
	const audioResult = await resolveAudioTracks(payload.audioTracks)
	let combinedAudioPath: string | null = null
	const tempAudioFiles = [...audioResult.tempFiles]

	if (audioResult.paths.length > 0) {
		combinedAudioPath = path.join(outputDir, `_program-audio-${programId}-${Date.now()}.mp3`)
		const concatOk = await concatenateAudio(audioResult.paths, combinedAudioPath)
		if (!concatOk) {
			logger.warn('Audio concatenation failed, rendering without audio', { programId })
			combinedAudioPath = null
		} else {
			tempAudioFiles.push(combinedAudioPath)
		}
	}

	// Step 3: Stitch screenshots + audio into final video
	const finalPath = path.join(outputDir, `${slug}_${ts}.mp4`)
	const stitchResult = await stitchProgramVideo(screenshotPaths, combinedAudioPath, perClipDuration, totalDuration, finalPath)

	// Clean up temp files
	for (const p of screenshotPaths) await unlink(p).catch(() => {})
	for (const p of tempAudioFiles) await unlink(p).catch(() => {})

	if (!stitchResult.success) {
		throw new Error(`Program video stitch failed: ${stitchResult.error}`)
	}

	// Probe actual duration
	const actualDuration = await probeDuration(finalPath)
	logger.info('Program render complete', {
		programId,
		outputPath: finalPath,
		requestedDuration: totalDuration,
		actualDuration: actualDuration > 0 ? Math.round(actualDuration) : totalDuration,
	})

	return finalPath
}

export async function handleRenderProgramPublishJob(job: Job): Promise<string> {
	const payload = job.payload as {
		durationSec: number
		programTitle: string
		programSlug: string
		programDescription?: string
		programSummary?: string
		clipIds: string[]
		audioTracks: AudioTrackPayload[]
		exportPath: string
		fileNamingPattern: string | null
		outputFormat: string
		generateNfo?: boolean
	}

	const programId = job.programId ?? 'unknown'
	const profileId = job.profileId ?? 'unknown'

	// Step 1: Render the program
	const renderPath = await handleRenderProgramJob(job)

	// Probe actual duration from rendered file
	const actualDuration = await probeDuration(renderPath)
	const finalDuration = actualDuration > 0 ? Math.round(actualDuration) : payload.durationSec

	logger.info('Program render complete, publishing...', { programId, renderPath, actualDuration: finalDuration })

	// Step 2: Publish
	const result = await publishArtifact({
		sourcePath: renderPath,
		programId,
		programTitle: payload.programTitle,
		programDescription: payload.programDescription,
		programSummary: payload.programSummary,
		profile: {
			name: '',
			exportPath: payload.exportPath,
			outputFormat: payload.outputFormat as 'mp4',
			fileNamingPattern: payload.fileNamingPattern ?? undefined,
		},
		durationSec: finalDuration,
		generateNfo: payload.generateNfo ?? true,
	})

	if (!result.success) {
		throw new Error(`Publish failed: ${result.error}`)
	}

	const artifactId = generateId()
	await db.insert(publishedArtifacts).values({
		id: artifactId,
		clipId: null,
		programId,
		publishProfileId: profileId,
		outputPath: result.outputPath,
		posterPath: result.posterPath ?? null,
		durationSec: finalDuration,
		renderVersion: '1',
		status: 'published',
		publishedAt: new Date().toISOString(),
	})

	logger.info('Program render+publish complete', { programId, outputPath: result.outputPath, artifactId })
	return result.outputPath
}
