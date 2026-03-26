import path from 'node:path'
import { chromium } from 'playwright'
import { RENDER_RESOLUTION, createLogger } from '@hospitality-channels/common'

const logger = createLogger('render-core:screenshot')

export interface ScreenshotOptions {
	url: string
	outputPath: string
	width?: number
	height?: number
}

/**
 * Captures a single PNG screenshot of a page using headless Chromium.
 * Used by the program render pipeline to capture individual clip frames
 * before stitching them into a multi-clip video via FFmpeg.
 */
export async function captureScreenshot(options: ScreenshotOptions): Promise<string> {
	const {
		url,
		outputPath,
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

		await new Promise(resolve => setTimeout(resolve, 500))

		await page.screenshot({ path: outputPath, type: 'png' })
		logger.info('Screenshot captured', { url, outputPath })

		await ctx.close()
		return outputPath
	} finally {
		await browser.close()
	}
}
