import path from 'node:path'
import { readdir, stat, unlink } from 'node:fs/promises'
import { createLogger, PATHS } from '@hospitality-channels/common'

const logger = createLogger('worker:maintenance')

/** How long a temp file may sit in the renders dir before it is considered abandoned. */
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000

/**
 * Deletes abandoned intermediate files from the renders directory.
 *
 * All intermediates (downloaded audio/video, per-clip segments, concat lists)
 * use an underscore prefix; render handlers normally delete them, but a crash
 * mid-job leaves them behind. Final render outputs (no underscore prefix) are
 * kept, since publish jobs may still reference them.
 */
export async function sweepStaleTempFiles(maxAgeMs: number = DEFAULT_MAX_AGE_MS): Promise<number> {
	const rendersDir = path.resolve(PATHS.renders)
	let entries: string[]
	try {
		entries = await readdir(rendersDir)
	} catch {
		return 0 // renders dir doesn't exist yet
	}

	const cutoff = Date.now() - maxAgeMs
	let deleted = 0

	for (const name of entries) {
		const isTempFile = name.startsWith('_') || name.endsWith('.list.txt')
		if (!isTempFile) continue

		const fullPath = path.join(rendersDir, name)
		try {
			const info = await stat(fullPath)
			if (!info.isFile() || info.mtimeMs > cutoff) continue
			await unlink(fullPath)
			deleted++
		} catch (err) {
			logger.warn('Failed to sweep temp file', { path: fullPath, error: String(err) })
		}
	}

	if (deleted > 0) {
		logger.info('Swept stale temp files from renders dir', { deleted })
	}
	return deleted
}
