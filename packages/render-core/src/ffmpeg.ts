import path from 'node:path'
import { createLogger } from '@hospitality-channels/common'
import { RENDER_DEFAULTS, RENDER_RESOLUTION } from '@hospitality-channels/common'
import { runFfmpeg } from './ffmpegSpawn.js'

const logger = createLogger('render-core:ffmpeg')

export interface FFmpegNormalizeOptions {
	inputPath: string
	outputPath: string
	trimSec?: number
	durationSec?: number
	fps?: number
	width?: number
	height?: number
}

export async function normalizeVideo(options: FFmpegNormalizeOptions): Promise<{ success: boolean; error?: string }> {
	const {
		inputPath,
		outputPath,
		trimSec = 3,
		durationSec = RENDER_DEFAULTS.durationSec,
		fps = RENDER_DEFAULTS.fps,
		width = RENDER_RESOLUTION.width,
		height = RENDER_RESOLUTION.height,
	} = options

	const outputDir = path.dirname(outputPath)
	await import('node:fs/promises').then(fs => fs.mkdir(outputDir, { recursive: true }))

	logger.info('Trimming video', { trimSec, durationSec })

	const vf = [
		`trim=start=${trimSec}`,
		'setpts=PTS-STARTPTS',
		`scale=${width}:${height}:force_original_aspect_ratio=decrease`,
		`pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
	].join(',')

	const args = [
		'-y',
		'-i',
		inputPath,
		'-vf',
		vf,
		'-c:v',
		'libx264',
		'-preset',
		'fast',
		'-crf',
		'18',
		'-tune',
		'animation',
		'-r',
		String(fps),
		'-t',
		String(durationSec),
		'-pix_fmt',
		'yuv420p',
		'-movflags',
		'+faststart',
		outputPath,
	]

	const timeoutMs = Math.max(60_000, durationSec * 10_000)
	const result = await runFfmpeg({ args, timeoutMs })

	if (result.success) {
		logger.info('FFmpeg normalization complete', { inputPath, outputPath })
	} else {
		logger.error('FFmpeg normalization failed', { error: result.error })
	}

	return result
}
