import path from 'node:path'

/**
 * Pure helpers for mapping artifact paths to Tunarr externalKeys. Tunarr
 * indexes files by the path as IT sees them, which usually differs from the
 * path this app publishes to (different container mounts). Everything here is
 * I/O-free so it can be unit tested.
 */

/** Normalizes a path for comparison: posix separators, no trailing slash. */
export function normalizeKey(p: string): string {
	const posix = p.replace(/\\/g, '/')
	const normalized = path.posix.normalize(posix)
	return normalized.length > 1 ? normalized.replace(/\/+$/, '') : normalized
}

/**
 * Computes the externalKey for an artifact: if a Tunarr media path is
 * configured and the artifact lives under the export dir, remap it onto the
 * media path. Otherwise the artifact's own path is used as-is.
 */
export function buildExternalKey(outputPath: string, exportDir: string, tunarrMediaPath?: string | null): string {
	if (!tunarrMediaPath) return normalizeKey(outputPath)
	const normalizedOutput = normalizeKey(outputPath)
	const normalizedMediaPath = normalizeKey(tunarrMediaPath)
	if (normalizedOutput.startsWith(`${normalizedMediaPath}/`)) return normalizedOutput
	const relativePath = path.posix.relative(normalizeKey(exportDir), normalizedOutput)
	return normalizeKey(path.posix.join(normalizedMediaPath, relativePath))
}

export interface KeyMatchResult<T> {
	program: T | null
	/** How the program was found: exact key match or unique basename fallback. */
	matchedBy?: 'exact' | 'basename'
	/**
	 * When matched by basename, the media path the user should configure so
	 * future pushes match exactly.
	 */
	suggestedMediaPath?: string
}

function defaultGetKey(p: { externalKey?: string }): string | undefined {
	return p.externalKey
}

/**
 * Finds the program whose path key matches the given key. Falls back to a
 * unique basename match, which recovers from a misconfigured media path (the
 * file is indexed, just under a different prefix) and lets us suggest the
 * correct prefix. `getKey` extracts the path from a program entry; different
 * Tunarr versions expose it as externalKey or as program.externalId.
 */
export function findProgramByKey<T extends object>(
	programs: T[],
	externalKey: string,
	getKey: (p: T) => string | undefined = defaultGetKey as (p: T) => string | undefined
): KeyMatchResult<T> {
	const wanted = normalizeKey(externalKey)
	const exact = programs.find(p => {
		const key = getKey(p)
		return key && normalizeKey(key) === wanted
	})
	if (exact) return { program: exact, matchedBy: 'exact' }

	const wantedBase = path.posix.basename(wanted)
	const byBasename = programs.filter(p => {
		const key = getKey(p)
		return key && path.posix.basename(normalizeKey(key)) === wantedBase
	})
	if (byBasename.length === 1) {
		const matchedKey = normalizeKey(getKey(byBasename[0])!)
		return {
			program: byBasename[0],
			matchedBy: 'basename',
			suggestedMediaPath: suggestMediaPath(wanted, matchedKey),
		}
	}

	return { program: null }
}

/**
 * Given the key we computed and the key Tunarr actually has for the same
 * file, derives the media path prefix that would have produced an exact
 * match. Walks the shared relative suffix backwards from the basename.
 */
export function suggestMediaPath(computedKey: string, actualKey: string): string | undefined {
	const computed = normalizeKey(computedKey).split('/')
	const actual = normalizeKey(actualKey).split('/')
	let shared = 0
	while (
		shared < computed.length - 1 &&
		shared < actual.length - 1 &&
		computed[computed.length - 1 - shared] === actual[actual.length - 1 - shared]
	) {
		shared++
	}
	if (shared === 0) return undefined
	const prefix = actual.slice(0, actual.length - shared).join('/')
	return prefix || '/'
}

/** Picks up to `limit` sample path keys from a program list, for error messages. */
export function sampleExternalKeys<T extends object>(
	programs: T[],
	limit = 3,
	getKey: (p: T) => string | undefined = defaultGetKey as (p: T) => string | undefined
): string[] {
	return programs
		.map(getKey)
		.filter((k): k is string => !!k)
		.slice(0, limit)
}
