import { execFile } from 'node:child_process'
import { access, constants, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { PATHS } from '@hospitality-channels/common'

/** Maximum thumbnail dimension (width or height). */
const THUMB_MAX = 480

/**
 * Extract a thumbnail frame from a video file using ffmpeg.
 * Grabs a frame ~1 second in to avoid black fade-in frames.
 * Returns the path to the extracted JPEG, or null on failure.
 */
export async function extractVideoThumbnail(videoPath: string, assetId: string): Promise<string | null> {
	const thumbsDir = path.join(path.resolve(PATHS.assets), 'thumbnails')
	await mkdir(thumbsDir, { recursive: true })

	const outputPath = path.join(thumbsDir, `${assetId}.jpg`)

	const extracted = await new Promise<boolean>(resolve => {
		execFile(
			'ffmpeg',
			[
				'-y',
				'-ss',
				'1',
				'-i',
				videoPath,
				'-frames:v',
				'1',
				'-vf',
				`scale=${THUMB_MAX}:${THUMB_MAX}:force_original_aspect_ratio=decrease`,
				'-q:v',
				'3',
				outputPath,
			],
			{ timeout: 15000 },
			err => {
				if (err) {
					// Retry at frame 0 in case the video is shorter than 1s
					execFile(
						'ffmpeg',
						[
							'-y',
							'-i',
							videoPath,
							'-frames:v',
							'1',
							'-vf',
							`scale=${THUMB_MAX}:${THUMB_MAX}:force_original_aspect_ratio=decrease`,
							'-q:v',
							'3',
							outputPath,
						],
						{ timeout: 15000 },
						retryErr => {
							resolve(!retryErr)
						}
					)
				} else {
					resolve(true)
				}
			}
		)
	})

	if (!extracted) return null

	try {
		await access(outputPath, constants.R_OK)
		return outputPath
	} catch {
		return null
	}
}
