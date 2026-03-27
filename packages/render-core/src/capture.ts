import { spawn, execFile } from 'node:child_process'
import path from 'node:path'
import { chromium } from 'playwright'
import { RENDER_DEFAULTS, RENDER_RESOLUTION, createLogger } from '@hospitality-channels/common'

const logger = createLogger('render-core:capture')

export function probeDuration(filePath: string): Promise<number> {
	return new Promise(resolve => {
		execFile('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_format', filePath], (err, stdout) => {
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
	backgroundVideoPath?: string
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

		const hasVideoBackground = Boolean(options.backgroundVideoPath)

		if (hasVideoBackground) {
			// Make every opaque layer transparent so the PNG has alpha for compositing.
			// Layers: html/body (root layout + globals.css bg-slate-950),
			// render layout div (#0f172a), viewport wrapper, scene root.
			// Content cards and semi-transparent overlays (rgba tints) are preserved.
			await page.addStyleTag({
				content: `
					html, body { background: transparent !important; }
					video { display: none !important; }
					div[style*="1920"], div[style*="1920"] > div { background: transparent !important; }
				`,
			})
			await new Promise(resolve => setTimeout(resolve, 200))
		}

		const screenshotPath = path.join(outputDir, `_frame-${Date.now()}.png`)
		await page.screenshot({ path: screenshotPath, type: 'png', omitBackground: hasVideoBackground })
		logger.info('Screenshot captured', { url, screenshotPath, transparent: hasVideoBackground })

		await ctx.close()

		const ffmpegArgs: string[] = ['-y']

		if (hasVideoBackground) {
			// Composite: loop background video + overlay transparent foreground PNG
			// Normalize the background video framerate to avoid inheriting high-fps sources
			ffmpegArgs.push('-stream_loop', '-1', '-i', options.backgroundVideoPath!)
			ffmpegArgs.push('-loop', '1', '-framerate', String(fps), '-i', screenshotPath)

			if (options.audioPath) {
				ffmpegArgs.push('-i', options.audioPath)
			}

			// fps= normalizes source framerate (e.g. 240fps .mov → 30fps)
			// format=rgba ensures pixel format compatibility before overlay (ProRes, etc.)
			ffmpegArgs.push(
				'-filter_complex',
				`[0:v]fps=${fps},scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,format=rgba[bg];[1:v]format=rgba[fg];[bg][fg]overlay=0:0:format=auto[outv]`,
				'-map',
				'[outv]'
			)

			if (options.audioPath) {
				const audioIdx = 2
				ffmpegArgs.push('-map', `${audioIdx}:a`, '-c:a', 'aac', '-b:a', '192k')
				if (options.matchAudioDuration) {
					ffmpegArgs.push('-shortest')
				} else {
					ffmpegArgs.push('-t', String(durationSec), '-shortest')
				}
			} else {
				ffmpegArgs.push('-t', String(durationSec))
			}

			ffmpegArgs.push('-r', String(fps), '-c:v', 'libx264', '-preset', 'slow', '-crf', '18')
		} else {
			// Standard single-frame loop approach
			ffmpegArgs.push('-loop', '1', '-framerate', String(fps), '-i', screenshotPath)

			if (options.audioPath) {
				ffmpegArgs.push('-i', options.audioPath)
			}

			ffmpegArgs.push('-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-tune', 'stillimage')

			if (options.audioPath) {
				ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k')
				if (options.matchAudioDuration) {
					ffmpegArgs.push('-shortest')
				} else {
					ffmpegArgs.push('-t', String(durationSec), '-shortest')
				}
			} else {
				ffmpegArgs.push('-t', String(durationSec))
			}
		}

		ffmpegArgs.push('-pix_fmt', 'yuv420p', '-movflags', '+faststart', outputPath)

		logger.info('FFmpeg command', {
			args: ffmpegArgs.join(' '),
			hasAudio: !!options.audioPath,
			hasVideoBackground,
			matchAudioDuration: options.matchAudioDuration,
		})

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

		logger.info('Capture complete', {
			url,
			requestedDuration: durationSec,
			actualDuration: finalDuration,
			hasAudio: !!options.audioPath,
			outputPath,
		})

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
