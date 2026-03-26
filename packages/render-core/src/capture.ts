import { spawn, execFile } from 'node:child_process'
import path from 'node:path'
import { chromium } from 'playwright'
import { RENDER_DEFAULTS, RENDER_RESOLUTION, createLogger } from '@hospitality-channels/common'

const logger = createLogger('render-core:capture')

export function probeDuration(filePath: string): Promise<number> {
	return new Promise((resolve) => {
		execFile('ffprobe', [
			'-v', 'quiet',
			'-print_format', 'json',
			'-show_format',
			filePath,
		], (err, stdout) => {
			if (err) {
				logger.warn('ffprobe failed, using fallback duration', { error: String(err) })
				resolve(0)
				return
			}
			try {
				const info = JSON.parse(stdout)
				const dur = parseFloat(info.format?.duration ?? '0')
				resolve(dur)
			} catch {
				resolve(0)
			}
		})
	})
}

export interface CaptureOptions {
	url: string
	outputPath: string
	durationSec?: number
	fps?: number
	width?: number
	height?: number
	audioPath?: string
	matchAudioDuration?: boolean
}

export interface CaptureResult {
	outputPath: string
	durationSec: number
	trimSec: number
	success: boolean
	error?: string
}

export async function capturePageVideo(options: CaptureOptions): Promise<CaptureResult> {
	const {
		url,
		outputPath,
		durationSec = RENDER_DEFAULTS.durationSec,
		fps = RENDER_DEFAULTS.fps,
		width = RENDER_RESOLUTION.width,
		height = RENDER_RESOLUTION.height,
	} = options

	const outputDir = path.dirname(outputPath)
	const fs = await import('node:fs/promises')
	await fs.mkdir(outputDir, { recursive: true })

	const browser = await chromium.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
	})

	try {
		const ctx = await browser.newContext({
			viewport: { width, height },
			deviceScaleFactor: 1,
		})

		const page = await ctx.newPage()
		page.addInitScript(() => {
			;(window as unknown as { __RENDER_MODE__: boolean }).__RENDER_MODE__ = true
		})

		await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 })
		await page.evaluate(() => document.fonts.ready)
		await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))

		await page.evaluate(() => {
			window.dispatchEvent(new CustomEvent('render-start'))
		})

		// Let any enter-animations / initial paints settle
		await new Promise(resolve => setTimeout(resolve, 500))

		const screenshotPath = path.join(outputDir, `_frame-${Date.now()}.png`)
		await page.screenshot({ path: screenshotPath, type: 'png' })
		logger.info('Screenshot captured', { url, screenshotPath })

		await ctx.close()

		// Use FFmpeg to loop the single frame into a video of the requested duration
		const ffmpegArgs = ['-y', '-loop', '1', '-framerate', String(fps), '-i', screenshotPath]

		// Add audio input if provided
		if (options.audioPath) {
			ffmpegArgs.push('-i', options.audioPath)
		}

		ffmpegArgs.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-tune', 'stillimage')

		if (options.audioPath) {
			ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k')
			if (options.matchAudioDuration) {
				// Let video match audio length — -shortest ends when audio finishes
				ffmpegArgs.push('-shortest')
			} else {
				// Fixed duration — trim or pad audio to match
				ffmpegArgs.push('-t', String(durationSec), '-shortest')
			}
		} else {
			ffmpegArgs.push('-t', String(durationSec))
		}

		ffmpegArgs.push('-pix_fmt', 'yuv420p', '-movflags', '+faststart', outputPath)

		logger.info('FFmpeg command', { args: ffmpegArgs.join(' '), hasAudio: !!options.audioPath, matchAudioDuration: options.matchAudioDuration })

		const ffmpegResult = await new Promise<{ success: boolean; error?: string }>(resolve => {
			const proc = spawn('ffmpeg', ffmpegArgs, {
				stdio: ['ignore', 'pipe', 'pipe'],
			})

			let stderr = ''
			proc.stderr?.on('data', (chunk: Buffer) => {
				stderr += chunk.toString()
			})

			proc.on('close', code => {
				if (code === 0) {
					resolve({ success: true })
				} else {
					resolve({ success: false, error: stderr.slice(-500) })
				}
			})

			proc.on('error', err => {
				resolve({ success: false, error: err.message })
			})
		})

		// Clean up the temporary screenshot
		await fs.unlink(screenshotPath).catch(() => {})

		if (!ffmpegResult.success) {
			return {
				outputPath: '',
				durationSec: 0,
				trimSec: 0,
				success: false,
				error: `FFmpeg encoding failed: ${ffmpegResult.error}`,
			}
		}

		// Probe actual output duration (important when matchAudioDuration is used)
		const actualDuration = await probeDuration(outputPath)
		const finalDuration = actualDuration > 0 ? Math.round(actualDuration) : durationSec

		logger.info('Capture complete', { url, requestedDuration: durationSec, actualDuration: finalDuration, hasAudio: !!options.audioPath, outputPath })

		return {
			outputPath,
			durationSec: finalDuration,
			trimSec: 0,
			success: true,
		}
	} catch (err) {
		logger.error('Capture failed', { url, error: String(err) })
		return {
			outputPath: '',
			durationSec: 0,
			trimSec: 0,
			success: false,
			error: err instanceof Error ? err.message : String(err),
		}
	} finally {
		await browser.close()
	}
}
