import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'
import { writeFile, unlink, mkdir } from 'node:fs/promises'
import { createLogger, PATHS } from '@hospitality-channels/common'
import { capturePageVideo, captureScreenshot, probeDuration } from '@hospitality-channels/render-core'
import { publishArtifact, scanMediaSource } from '@hospitality-channels/publish'
import { eq, count } from 'drizzle-orm'
import { db, clips, assets, publishedArtifacts, settings } from './db.js'
import type { Job } from './queue.js'

const logger = createLogger('worker:handlers')

function generateId(): string {
	return randomBytes(12).toString('hex')
}

const WEB_URL = process.env.WEB_URL || 'http://localhost:3000'

/** Get the next sequence number for a publish profile (count of existing artifacts + 1). */
async function getNextSequenceNumber(profileId: string): Promise<number> {
	const [result] = await db.select({ total: count() }).from(publishedArtifacts).where(eq(publishedArtifacts.publishProfileId, profileId))
	return (result?.total ?? 0) + 1
}

/** Trigger a Tunarr media source rescan so newly published files are indexed. */
async function triggerTunarrRescan(): Promise<void> {
	try {
		const [urlSetting] = await db.select().from(settings).where(eq(settings.key, 'tunarr_url')).limit(1)
		const [sourceIdSetting] = await db.select().from(settings).where(eq(settings.key, 'tunarr_media_source_id')).limit(1)
		const [libraryIdSetting] = await db.select().from(settings).where(eq(settings.key, 'tunarr_library_id')).limit(1)

		if (!urlSetting?.value || !sourceIdSetting?.value) {
			logger.warn('Tunarr rescan skipped — missing settings', {
				hasUrl: !!urlSetting?.value,
				hasSourceId: !!sourceIdSetting?.value,
			})
			return
		}

		logger.info('Triggering Tunarr media source rescan after publish', {
			tunarrUrl: urlSetting.value,
			sourceId: sourceIdSetting.value,
			libraryId: libraryIdSetting?.value,
		})
		await scanMediaSource(urlSetting.value, sourceIdSetting.value, libraryIdSetting?.value ?? undefined)
		logger.info('Tunarr media source rescan triggered successfully')
	} catch (err) {
		logger.warn('Tunarr rescan failed (non-fatal)', { error: String(err) })
	}
}

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

		// If it's an internal asset serve URL, try direct filesystem access first
		if (audioUrl.startsWith('/api/assets/serve')) {
			const parsedUrl = new URL(audioUrl, 'http://localhost')
			const assetPath = parsedUrl.searchParams.get('path')
			if (assetPath) {
				const assetsDir = path.resolve(PATHS.assets)
				const resolved = path.isAbsolute(assetPath) ? assetPath : path.resolve(assetsDir, assetPath)
				try {
					const { access } = await import('node:fs/promises')
					await access(resolved)
					logger.info('resolveAudio: using direct filesystem path', { resolved })
					return { audioPath: resolved, matchAudioDuration: matchDuration }
				} catch {
					logger.info('resolveAudio: direct path not accessible, falling back to HTTP', { resolved })
				}
			}

			const fullUrl = `${WEB_URL}${audioUrl}`
			logger.info('resolveAudio: fetching internal asset', { fullUrl })
			const res = await fetch(fullUrl)
			if (!res.ok) {
				logger.warn('resolveAudio: failed to fetch internal asset', { url: fullUrl, status: res.status, statusText: res.statusText })
				return {}
			}
			const buffer = Buffer.from(await res.arrayBuffer())
			logger.info('resolveAudio: downloaded internal asset', { bytes: buffer.length })
			const ext = path.extname(assetPath ?? '.mp3') || '.mp3'
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

		// For internal asset URLs, try direct filesystem access first (avoids large HTTP transfer)
		if (videoUrl.startsWith('/api/assets/serve')) {
			const parsedUrl = new URL(videoUrl, 'http://localhost')
			const assetPath = parsedUrl.searchParams.get('path')
			if (assetPath) {
				// Try the path directly (it may be an absolute path or relative to assets dir)
				const assetsDir = path.resolve(PATHS.assets)
				const resolved = path.isAbsolute(assetPath) ? assetPath : path.resolve(assetsDir, assetPath)
				try {
					const { access } = await import('node:fs/promises')
					await access(resolved)
					logger.info('resolveVideo: using direct filesystem path', { resolved })
					return { videoPath: resolved }
				} catch {
					logger.info('resolveVideo: direct path not accessible, falling back to HTTP', { resolved })
				}
			}

			// Fallback: download via HTTP
			const fullUrl = `${WEB_URL}${videoUrl}`
			const res = await fetch(fullUrl)
			if (!res.ok) {
				logger.warn('resolveVideo: failed to fetch internal asset', { url: fullUrl, status: res.status })
				return {}
			}
			const buffer = Buffer.from(await res.arrayBuffer())
			const ext = path.extname(assetPath ?? '.mp4') || '.mp4'
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

	const seqNum = await getNextSequenceNumber(profileId)
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
		sequenceNumber: seqNum,
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
	const seqNum = await getNextSequenceNumber(profileId)
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
		sequenceNumber: seqNum,
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

	// Trigger Tunarr rescan so the new file is indexed immediately
	await triggerTunarrRescan()

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
		// First try: resolve directly via assetId (most reliable — avoids HTTP round-trip)
		if (track.assetId) {
			try {
				const [asset] = await db.select().from(assets).where(eq(assets.id, track.assetId)).limit(1)
				if (asset) {
					const { access } = await import('node:fs/promises')
					await access(asset.originalPath)
					logger.info('resolveAudioTracks: resolved via assetId', { assetId: track.assetId, path: asset.originalPath })
					paths.push(asset.originalPath)
					continue
				}
			} catch {
				logger.warn('resolveAudioTracks: assetId lookup failed, falling back to audioUrl', { assetId: track.assetId })
			}
		}

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
 * Builds a chained xfade filter for N clips.
 * For the simple (all-screenshot) pipeline, inputs are [0:v], [1:v], etc.
 * For the mixed pipeline, inputs are [v0], [v1], etc. (set labelPrefix='v').
 *
 * Example output for 3 clips, fade 0.5s, perClipDuration=10s:
 *   [0:v][1:v]xfade=transition=fade:duration=0.5:offset=9.5[xf0];
 *   [xf0][2:v]xfade=transition=fade:duration=0.5:offset=19.0[outv]
 */
function buildXfadeFilter(n: number, durations: number[], transitionType: string, transitionSec: number, labelPrefix?: string): string {
	let filter = ''
	// Track cumulative output time to compute each transition's offset
	let cumulativeTime = durations[0]
	for (let i = 0; i < n - 1; i++) {
		const inputA = i === 0 ? (labelPrefix ? `[${labelPrefix}0]` : '[0:v]') : `[xf${i - 1}]`
		const inputB = labelPrefix ? `[${labelPrefix}${i + 1}]` : `[${i + 1}:v]`
		const outputLabel = i === n - 2 ? '[outv]' : `[xf${i}]`
		const offset = cumulativeTime - transitionSec
		filter += `${inputA}${inputB}xfade=transition=${transitionType}:duration=${transitionSec}:offset=${offset.toFixed(3)}${outputLabel}`
		if (i < n - 2) filter += ';'
		// After this transition, combined duration grows by next clip minus overlap
		cumulativeTime = offset + durations[i + 1]
	}
	return filter
}

/**
 * Stitches multiple clip screenshots into a video with audio using FFmpeg.
 * Each screenshot is displayed for perClipDuration seconds.
 */
async function stitchProgramVideo(
	screenshotPaths: string[],
	audioPath: string | null,
	segmentDurations: number[],
	totalDuration: number,
	outputPath: string,
	transition?: { type: string; sec: number },
	ssOffset?: number
): Promise<{ success: boolean; error?: string }> {
	const ffmpegArgs: string[] = ['-y']

	// Add each screenshot as an input with its duration
	for (let i = 0; i < screenshotPaths.length; i++) {
		ffmpegArgs.push('-loop', '1', '-t', String(segmentDurations[i]), '-framerate', '30', '-i', screenshotPaths[i])
	}

	// Add audio if available
	if (audioPath) {
		ffmpegArgs.push('-i', audioPath)
	}

	const n = screenshotPaths.length
	let filterComplex = ''

	if (transition && n >= 2) {
		// Build chained xfade filter for transitions between clips
		filterComplex = buildXfadeFilter(n, segmentDurations, transition.type, transition.sec)
	} else {
		// Simple concat — no transitions
		for (let i = 0; i < n; i++) {
			filterComplex += `[${i}:v]`
		}
		filterComplex += `concat=n=${n}:v=1:a=0[outv]`
	}

	ffmpegArgs.push('-filter_complex', filterComplex)
	ffmpegArgs.push('-map', '[outv]')

	if (audioPath) {
		ffmpegArgs.push('-map', `${n}:a`, '-c:a', 'aac', '-b:a', '192k')
		if (ssOffset) {
			// Loop transition: trim front and cap duration so output matches totalDuration
			ffmpegArgs.push('-ss', String(ssOffset), '-t', String(totalDuration))
		} else {
			ffmpegArgs.push('-shortest')
		}
	} else {
		ffmpegArgs.push('-t', String(totalDuration))
		if (ssOffset) {
			ffmpegArgs.push('-ss', String(ssOffset))
		}
	}

	ffmpegArgs.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outputPath)

	logger.info('FFmpeg stitch command', { args: ffmpegArgs.join(' '), clips: n, totalDuration, hasAudio: !!audioPath, ssOffset })

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

/**
 * Stitches a mix of video segments (.mp4) and static images (.png) into a final video.
 * Videos are used as-is; images are looped for perClipDuration seconds.
 */
async function stitchMixedSegments(
	segments: string[],
	audioPath: string | null,
	segmentDurations: number[],
	totalDuration: number,
	outputPath: string,
	transition?: { type: string; sec: number },
	ssOffset?: number
): Promise<{ success: boolean; error?: string }> {
	const ffmpegArgs: string[] = ['-y']

	// Add each segment as an input
	for (let i = 0; i < segments.length; i++) {
		const seg = segments[i]
		const dur = segmentDurations[i]
		if (seg.endsWith('.mp4')) {
			ffmpegArgs.push('-t', String(dur), '-i', seg)
		} else {
			ffmpegArgs.push('-loop', '1', '-t', String(dur), '-framerate', '30', '-i', seg)
		}
	}

	if (audioPath) {
		ffmpegArgs.push('-i', audioPath)
	}

	const n = segments.length
	// Normalize all segments to 30fps and consistent size before concatenation
	let filterComplex = ''
	for (let i = 0; i < n; i++) {
		const seg = segments[i]
		if (seg.endsWith('.mp4')) {
			filterComplex += `[${i}:v]fps=30,scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}];`
		} else {
			filterComplex += `[${i}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}];`
		}
	}

	if (transition && n >= 2) {
		// Build chained xfade filter using normalized labels [v0], [v1], etc.
		filterComplex += buildXfadeFilter(n, segmentDurations, transition.type, transition.sec, 'v')
	} else {
		// Simple concat
		for (let i = 0; i < n; i++) filterComplex += `[v${i}]`
		filterComplex += `concat=n=${n}:v=1:a=0[outv]`
	}

	ffmpegArgs.push('-filter_complex', filterComplex)
	ffmpegArgs.push('-map', '[outv]')

	if (audioPath) {
		ffmpegArgs.push('-map', `${n}:a`, '-c:a', 'aac', '-b:a', '192k')
		if (ssOffset) {
			// Loop transition: trim front and cap duration so output matches totalDuration
			ffmpegArgs.push('-ss', String(ssOffset), '-t', String(totalDuration))
		} else {
			ffmpegArgs.push('-shortest')
		}
	} else {
		ffmpegArgs.push('-t', String(totalDuration))
		if (ssOffset) {
			ffmpegArgs.push('-ss', String(ssOffset))
		}
	}

	ffmpegArgs.push(
		'-r',
		'30',
		'-c:v',
		'libx264',
		'-preset',
		'fast',
		'-crf',
		'18',
		'-pix_fmt',
		'yuv420p',
		'-movflags',
		'+faststart',
		outputPath
	)

	logger.info('FFmpeg mixed stitch command', {
		args: ffmpegArgs.join(' '),
		segments: n,
		totalDuration,
		hasAudio: !!audioPath,
		ssOffset,
	})

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
		transitionType?: string
		transitionSec?: number
		loopTransition?: boolean
	}

	const programId = job.programId ?? 'unknown'
	const clipIds = payload.clipIds
	const totalDuration = payload.durationSec
	const transitionType = payload.transitionType ?? 'none'
	const transitionSec = payload.transitionSec ?? 0.5
	const useTransitions = transitionType !== 'none' && clipIds.length >= 2
	const loopTransition = payload.loopTransition === true && useTransitions

	// When transitions are enabled, each clip needs extra time to account for xfade overlap
	const perClipDuration =
		clipIds.length > 0
			? useTransitions
				? (totalDuration + (clipIds.length - 1) * transitionSec) / clipIds.length
				: totalDuration / clipIds.length
			: totalDuration

	logger.info('Starting program render', {
		programId,
		clipCount: clipIds.length,
		totalDuration,
		perClipDuration,
		transitionType,
		transitionSec: useTransitions ? transitionSec : 0,
		loopTransition,
		audioTrackCount: payload.audioTracks.length,
	})

	const outputDir = path.resolve(PATHS.renders)
	await mkdir(outputDir, { recursive: true })

	const slug = payload.programSlug || programId
	const ts = new Date()
		.toISOString()
		.replace(/[:T]/g, '-')
		.replace(/\.\d+Z$/, '')

	// Step 1: Render each clip — use capturePageVideo for clips with video backgrounds,
	// captureScreenshot for static clips
	const clipSegments: string[] = []
	const tempFiles: string[] = []
	let hasAnyVideoBackground = false

	for (let i = 0; i < clipIds.length; i++) {
		const url = `${WEB_URL}/programs/${programId}/render?clipIndex=${i}`
		const video = await resolveVideoForClip(clipIds[i])

		try {
			if (video.videoPath) {
				// Clip has a video background — render as a composited video segment
				hasAnyVideoBackground = true
				const segmentPath = path.join(outputDir, `_program-${programId}-clip${i}-${Date.now()}.mp4`)
				const result = await capturePageVideo({
					url,
					outputPath: segmentPath,
					durationSec: perClipDuration,
					backgroundVideoPath: video.videoPath,
				})
				if (video.tempFile) tempFiles.push(video.tempFile)
				if (!result.success) {
					throw new Error(`Capture failed: ${result.error}`)
				}
				clipSegments.push(segmentPath)
				tempFiles.push(segmentPath)
			} else {
				// Static clip — capture screenshot
				const screenshotPath = path.join(outputDir, `_program-${programId}-clip${i}-${Date.now()}.png`)
				await captureScreenshot({ url, outputPath: screenshotPath })
				clipSegments.push(screenshotPath)
				tempFiles.push(screenshotPath)
			}
		} catch (err) {
			logger.error('Failed to render clip segment', { programId, clipIndex: i, error: String(err) })
			for (const p of tempFiles) await unlink(p).catch(() => {})
			throw new Error(`Failed to render clip ${i}: ${err instanceof Error ? err.message : String(err)}`)
		}
	}

	// Step 1b: If loop transition is enabled, render a short copy of the first clip
	// to append at the end. This gives the xfade material to transition from the
	// last clip back into the first clip's opening frames.
	const loopTailDuration = transitionSec * 2
	if (loopTransition && clipSegments.length >= 2) {
		const firstClipId = clipIds[0]
		const url = `${WEB_URL}/programs/${programId}/render?clipIndex=0`
		const video = await resolveVideoForClip(firstClipId)

		try {
			if (video.videoPath) {
				hasAnyVideoBackground = true
				const segmentPath = path.join(outputDir, `_program-${programId}-looptail-${Date.now()}.mp4`)
				const result = await capturePageVideo({
					url,
					outputPath: segmentPath,
					durationSec: loopTailDuration,
					backgroundVideoPath: video.videoPath,
				})
				if (video.tempFile) tempFiles.push(video.tempFile)
				if (!result.success) {
					logger.warn('Loop tail video capture failed, skipping loop transition', { programId })
				} else {
					clipSegments.push(segmentPath)
					tempFiles.push(segmentPath)
				}
			} else {
				const screenshotPath = path.join(outputDir, `_program-${programId}-looptail-${Date.now()}.png`)
				await captureScreenshot({ url, outputPath: screenshotPath })
				clipSegments.push(screenshotPath)
				tempFiles.push(screenshotPath)
			}
			logger.info('Rendered loop tail segment', { programId, loopTailDuration })
		} catch (err) {
			logger.warn('Failed to render loop tail segment, skipping loop transition', {
				programId,
				error: String(err),
			})
		}
	}

	// Step 2: Resolve and concatenate audio tracks
	const audioResult = await resolveAudioTracks(payload.audioTracks)
	let combinedAudioPath: string | null = null

	if (audioResult.paths.length > 0) {
		combinedAudioPath = path.join(outputDir, `_program-audio-${programId}-${Date.now()}.mp3`)
		const concatOk = await concatenateAudio(audioResult.paths, combinedAudioPath)
		if (!concatOk) {
			logger.warn('Audio concatenation failed, rendering without audio', { programId })
			combinedAudioPath = null
		} else {
			tempFiles.push(combinedAudioPath)
		}
	}
	for (const p of audioResult.tempFiles) tempFiles.push(p)

	// Step 3: Stitch clip segments + audio into final video
	const finalPath = path.join(outputDir, `${slug}_${ts}.mp4`)
	let stitchResult: { success: boolean; error?: string }

	const transition = useTransitions ? { type: transitionType, sec: transitionSec } : undefined

	// Build per-segment durations array — the loop tail (if present) is shorter than regular clips
	const hasLoopTail = loopTransition && clipSegments.length > clipIds.length
	const segmentDurations = clipSegments.map((_, i) => {
		if (hasLoopTail && i === clipSegments.length - 1) return loopTailDuration
		return perClipDuration
	})

	// When loop transition is active, trim transitionSec from the front of the output
	// so the loop point aligns with where the tail transition ends
	const ssOffset = hasLoopTail ? transitionSec : undefined

	if (hasAnyVideoBackground) {
		// Mixed pipeline: some clips are .mp4, some are .png — use stitchMixedSegments
		stitchResult = await stitchMixedSegments(
			clipSegments,
			combinedAudioPath,
			segmentDurations,
			totalDuration,
			finalPath,
			transition,
			ssOffset
		)
	} else {
		// All static screenshots — use existing fast path
		stitchResult = await stitchProgramVideo(
			clipSegments,
			combinedAudioPath,
			segmentDurations,
			totalDuration,
			finalPath,
			transition,
			ssOffset
		)
	}

	// Clean up temp files
	for (const p of tempFiles) await unlink(p).catch(() => {})

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
	const seqNum = await getNextSequenceNumber(profileId)
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
		sequenceNumber: seqNum,
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

	// Trigger Tunarr rescan so the new file is indexed immediately
	await triggerTunarrRescan()

	return result.outputPath
}
