import { createLogger } from '@hospitality-channels/common'
import { findProgramByKey, sampleExternalKeys } from './tunarr-paths.js'

const logger = createLogger('tunarr')

/** Per-request time budget for Tunarr API calls. */
const TUNARR_FETCH_TIMEOUT_MS = Math.max(1_000, Number(process.env.TUNARR_FETCH_TIMEOUT_MS) || 15_000)
/** Total time to wait for a triggered scan to index a new file. */
const TUNARR_SCAN_WAIT_MS = Math.max(10_000, Number(process.env.TUNARR_SCAN_WAIT_MS) || 75_000)

/**
 * fetch with a hard timeout and a single retry on network-level failures
 * (connection refused, DNS, timeout). HTTP error statuses are not retried;
 * they reach the caller so the real status can be reported.
 */
async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await fetch(url, { ...init, signal: AbortSignal.timeout(TUNARR_FETCH_TIMEOUT_MS) })
		} catch (err) {
			if (attempt >= 1) {
				const reason = err instanceof Error && err.name === 'TimeoutError' ? `timed out after ${TUNARR_FETCH_TIMEOUT_MS}ms` : String(err)
				throw new Error(`Tunarr unreachable (${reason}). Check that the Tunarr URL is correct and Tunarr is running.`)
			}
			logger.warn('Tunarr request failed, retrying once', { url, error: String(err) })
		}
	}
}

export interface TunarrChannel {
	id: string
	number: number
	name: string
	icon?: { path?: string }
	programCount?: number
	duration?: number
}

// Program as returned by Tunarr (flexible to handle various fields).
// Older versions return flat objects with externalKey; newer versions wrap
// the details in a nested `program` object whose path field is externalId.
export interface TunarrProgram {
	type: string
	subtype?: string
	persisted?: boolean
	uniqueId?: string
	id?: string
	externalKey?: string
	externalId?: string
	externalSourceType?: string
	externalSourceName?: string
	externalSourceId?: string
	externalIds?: unknown[]
	duration?: number
	title?: string
	program?: TunarrProgram
	[key: string]: unknown
}

/** Extracts the file path Tunarr indexed a program under, across API shapes. */
export function getProgramPath(entry: TunarrProgram): string | undefined {
	return entry.externalKey ?? entry.program?.externalId ?? entry.program?.externalKey ?? entry.externalId
}

export interface ProgramMetadata {
	title: string
	summary?: string | null
	description?: string | null
	durationMs?: number | null
	icon?: string | null
}

/**
 * Applies our metadata onto a program entry before pushing it to a channel,
 * writing to the nested program object when present (newer Tunarr) and the
 * top level otherwise (older Tunarr). Duration lives on both levels in the
 * wrapped shape.
 */
export function enrichProgram(entry: TunarrProgram, meta: ProgramMetadata): void {
	const target = entry.program ?? entry
	target.title = meta.title
	if (meta.summary) target.summary = meta.summary
	if (meta.description) target.description = meta.description
	if (meta.icon) target.icon = meta.icon
	if (meta.durationMs) {
		target.duration = meta.durationMs
		if (entry.program) entry.duration = meta.durationMs
	}
}

interface CondensedProgramming {
	programs: Record<string, TunarrProgram> | TunarrProgram[]
	lineup: unknown[]
	schedule?: unknown
}

async function tunarrFetch<T>(tunarrUrl: string, path: string, init?: RequestInit): Promise<T> {
	const url = `${tunarrUrl.replace(/\/+$/, '')}/api${path}`
	const separator = url.includes('?') ? '&' : '?'
	const uncachedUrl = `${url}${separator}_t=${Date.now()}`
	const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) }
	if (init?.body) {
		headers['Content-Type'] = 'application/json'
	}
	const res = await fetchWithTimeout(uncachedUrl, {
		...init,
		headers,
	})
	if (!res.ok) {
		const text = await res.text().catch(() => '')
		throw new Error(`Tunarr API ${res.status}: ${text}`)
	}
	return res.json() as Promise<T>
}

export async function listChannels(tunarrUrl: string): Promise<TunarrChannel[]> {
	return tunarrFetch<TunarrChannel[]>(tunarrUrl, '/channels')
}

export async function getChannelProgramming(tunarrUrl: string, channelId: string): Promise<CondensedProgramming> {
	return tunarrFetch<CondensedProgramming>(tunarrUrl, `/channels/${channelId}/programming`)
}

export interface TunarrMediaLibrary {
	id?: string
	uuid?: string
	name: string
	externalKey?: string
	[key: string]: unknown
}

export interface TunarrMediaSource {
	id: string
	name: string
	type: string
	libraries: TunarrMediaLibrary[]
	paths?: string[]
}

export async function listMediaSources(tunarrUrl: string): Promise<TunarrMediaSource[]> {
	return tunarrFetch<TunarrMediaSource[]>(tunarrUrl, '/media-sources')
}

export async function getMediaSource(tunarrUrl: string, sourceId: string): Promise<TunarrMediaSource> {
	return tunarrFetch<TunarrMediaSource>(tunarrUrl, `/media-sources/${sourceId}`)
}

export async function scanMediaSource(tunarrUrl: string, sourceId: string, libraryId?: string): Promise<void> {
	logger.info('Triggering media source scan', { sourceId, libraryId })
	const base = tunarrUrl.replace(/\/+$/, '')
	const path = libraryId ? `/api/media-sources/${sourceId}/libraries/${libraryId}/scan` : `/api/media-sources/${sourceId}/scan`
	const url = `${base}${path}?_t=${Date.now()}`
	const res = await fetchWithTimeout(url, { method: 'POST' })
	if (!res.ok) {
		const text = await res.text().catch(() => '')
		logger.warn('Media source scan failed', { sourceId, libraryId, status: res.status, body: text })
	} else {
		logger.info('Media source scan request accepted', { sourceId, libraryId, status: res.status })
	}
}

function getLibraryId(library: TunarrMediaLibrary): string | undefined {
	// Tunarr may use 'id' or 'uuid' depending on version
	return library.id || library.uuid || ((library as Record<string, unknown>).libraryId as string | undefined)
}

export async function getLibraryPrograms(tunarrUrl: string, libraryId: string): Promise<TunarrProgram[]> {
	return tunarrFetch<TunarrProgram[]>(tunarrUrl, `/media-libraries/${libraryId}/programs`)
}

/** Turns a failed scan-and-find result into an actionable, user-facing message. */
export function describeScanFailure(result: ScanFindResult, externalKey: string): string {
	switch (result.failure) {
		case 'no-media-source':
			return `No Tunarr media source covers "${externalKey}". Select a media source and library in Settings, or add one in Tunarr whose path contains your exports.`
		case 'no-library':
			return 'The matched Tunarr media source has no usable library. Select a library in Settings.'
		default:
			return (
				`Tunarr did not index "${externalKey}" after scanning.` +
				(result.samplePaths?.length
					? ` The library contains paths like ${result.samplePaths.map(p => `"${p}"`).join(', ')}; if your file is there under a different prefix, correct the Tunarr media path in Settings.`
					: ' The library returned no programs; check that the export volume is mounted into Tunarr and the media path in Settings matches how Tunarr sees it.')
			)
	}
}

export interface ScanFindResult {
	program: TunarrProgram | null
	/** How the program was matched, when found. */
	matchedBy?: 'exact' | 'basename'
	/** When matched by basename only: the media path that would produce exact matches. */
	suggestedMediaPath?: string
	/** A few externalKeys from the library, to show what paths Tunarr actually has. */
	samplePaths?: string[]
	/** Why no program could be returned, when not found. */
	failure?: 'no-media-source' | 'no-library' | 'not-indexed'
}

/**
 * Scan the media source that contains the given path, then search its library
 * for the program matching the externalKey.
 *
 * When mediaSourceId and libraryId are provided, uses those directly instead of
 * auto-discovering from the path. These come from the user's Tunarr settings.
 *
 * Matching is normalized (separators, trailing slashes) and falls back to a
 * unique basename match, which recovers from a misconfigured Tunarr media
 * path and reports the prefix that would have matched exactly.
 */
export async function scanAndFindProgram(
	tunarrUrl: string,
	externalKey: string,
	opts?: { mediaSourceId?: string; libraryId?: string }
): Promise<ScanFindResult> {
	const sourceId: string | undefined = opts?.mediaSourceId
	let libraryId: string | undefined = opts?.libraryId

	if (sourceId && libraryId) {
		// Use configured source + library directly
		logger.info('Using configured media source and library', { sourceId, libraryId, externalKey })
		await scanMediaSource(tunarrUrl, sourceId, libraryId)
	} else {
		// Auto-discover from path; fall back to a sole local source, since
		// exports are always pushed through a local directory Tunarr mounts.
		const sources = await listMediaSources(tunarrUrl)
		const localSources = sources.filter(s => s.type === 'local')
		const matching =
			sources.find(
				s => s.paths?.some(p => externalKey.startsWith(p)) || s.libraries?.some(l => l.externalKey && externalKey.startsWith(l.externalKey))
			) ?? (localSources.length === 1 ? localSources[0] : undefined)

		if (!matching) {
			logger.warn('No matching media source found for path', { externalKey, sourceCount: sources.length })
			return { program: null, failure: 'no-media-source' }
		}

		// Fetch full source details (list endpoint may not include full library data)
		const fullSource = await getMediaSource(tunarrUrl, matching.id)
		logger.info('Scanning media source', {
			sourceId: fullSource.id,
			sourceName: fullSource.name,
			libraryCount: fullSource.libraries?.length,
		})

		// Find the matching library from the full source details
		const matchingLibrary =
			fullSource.libraries?.find(l => l.externalKey && externalKey.startsWith(l.externalKey)) ?? fullSource.libraries?.[0]

		libraryId = matchingLibrary ? getLibraryId(matchingLibrary) : undefined
		if (!libraryId) {
			logger.warn('No library with valid ID found in media source', {
				sourceId: fullSource.id,
				libraries: JSON.stringify(fullSource.libraries),
			})
			return { program: null, failure: 'no-library' }
		}

		logger.info('Using library for program lookup', { libraryId, libraryName: matchingLibrary?.name })

		// Trigger scan with library ID
		await scanMediaSource(tunarrUrl, fullSource.id, libraryId)
	}

	// Poll for the program to appear. Scans of large libraries can take a
	// while, so back off gradually up to the total wait budget.
	const deadline = Date.now() + TUNARR_SCAN_WAIT_MS
	let delayMs = 2_000
	let samplePaths: string[] = []
	for (let attempt = 0; Date.now() < deadline; attempt++) {
		await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, Math.max(0, deadline - Date.now()))))
		delayMs = Math.min(Math.round(delayMs * 1.5), 10_000)
		try {
			const programs = await getLibraryPrograms(tunarrUrl, libraryId)
			samplePaths = sampleExternalKeys(programs, 3, getProgramPath)
			const match = findProgramByKey(programs, externalKey, getProgramPath)
			if (match.program) {
				logger.info('Found indexed program', {
					externalKey,
					uniqueId: match.program.uniqueId,
					attempt,
					matchedBy: match.matchedBy,
					suggestedMediaPath: match.suggestedMediaPath,
				})
				return { program: match.program, matchedBy: match.matchedBy, suggestedMediaPath: match.suggestedMediaPath, samplePaths }
			}
			logger.info('Program not yet indexed, retrying...', { externalKey, attempt, totalPrograms: programs.length })
		} catch (err) {
			logger.warn('Failed to query library programs', { error: String(err), attempt })
		}
	}

	logger.warn('Program not found after scanning', { externalKey, samplePaths })
	return { program: null, failure: 'not-indexed', samplePaths }
}

export async function updateChannelProgramming(
	tunarrUrl: string,
	channelId: string,
	program: TunarrProgram,
	mode: 'append' | 'replace'
): Promise<void> {
	// Tunarr's manual programming request takes a `lineup` of condensed channel
	// programs, each a discriminated union on `type` (content/custom/filler/
	// redirect/flex). A played file is a `content` item that references the
	// program by its persisted id (Tunarr inserts this straight into the
	// channel_programs table as the program uuid) plus a duration in ms. The id
	// must be the uuid from the media-libraries programs endpoint, not the
	// external uniqueId.
	if (!program.id) {
		throw new Error('Cannot push program to Tunarr: matched program is missing an id')
	}
	if (typeof program.duration !== 'number') {
		throw new Error('Cannot push program to Tunarr: matched program is missing a duration')
	}

	const lineup = [{ type: 'content' as const, id: program.id, duration: program.duration }]

	logger.info('Updating channel programming', { channelId, mode, programId: program.id })

	await tunarrFetch(tunarrUrl, `/channels/${channelId}/programming`, {
		method: 'POST',
		body: JSON.stringify({
			type: 'manual',
			lineup,
			append: mode === 'append',
		}),
	})
}
