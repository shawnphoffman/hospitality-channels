import { execFile } from 'node:child_process'
import { access, constants, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { PATHS } from '@hospitality-channels/common'

/**
 * Extract embedded cover art from an audio file using ffmpeg.
 * Returns the path to the extracted image, or null if none found.
 */
export async function extractCoverArt(audioPath: string, assetId: string): Promise<string | null> {
	// First, check if the file has an embedded image stream
	const hasArt = await new Promise<boolean>(resolve => {
		execFile('ffprobe', ['-v', 'quiet', '-print_format', 'json', '-show_streams', audioPath], { timeout: 10000 }, (err, stdout) => {
			if (err) {
				resolve(false)
				return
			}
			try {
				const info = JSON.parse(stdout)
				const videoStream = info.streams?.find(
					(s: { codec_type: string; codec_name?: string; disposition?: { attached_pic?: number } }) =>
						s.codec_type === 'video' || s.disposition?.attached_pic === 1
				)
				resolve(!!videoStream)
			} catch {
				resolve(false)
			}
		})
	})

	if (!hasArt) return null

	const coversDir = path.join(path.resolve(PATHS.assets), 'covers')
	await mkdir(coversDir, { recursive: true })

	const outputPath = path.join(coversDir, `${assetId}.jpg`)

	const extracted = await new Promise<boolean>(resolve => {
		execFile('ffmpeg', ['-i', audioPath, '-an', '-vcodec', 'mjpeg', '-frames:v', '1', '-y', outputPath], { timeout: 15000 }, err => {
			resolve(!err)
		})
	})

	if (!extracted) return null

	// Verify the file was actually created and has content
	try {
		await access(outputPath, constants.R_OK)
		return outputPath
	} catch {
		return null
	}
}
