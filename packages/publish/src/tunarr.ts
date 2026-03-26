import { createLogger } from '@hospitality-channels/common'

const logger = createLogger('tunarr')

export interface TunarrChannel {
	id: string
	number: number
	name: string
	icon?: { path?: string }
	programCount?: number
	duration?: number
}

// Program as returned by Tunarr (flexible to handle various fields)
export interface TunarrProgram {
	type: string
	subtype?: string
	persisted?: boolean
	uniqueId?: string
	id?: string
	externalKey?: string
	externalSourceType?: string
	externalSourceName?: string
	externalSourceId?: string
	externalIds?: unknown[]
	duration?: number
	title?: string
	[key: string]: unknown
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
	const res = await fetch(uncachedUrl, {
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

export async function scanMediaSource(tunarrUrl: string, sourceId: string): Promise<void> {
	logger.info('Triggering media source scan', { sourceId })
	const url = `${tunarrUrl.replace(/\/+$/, '')}/api/media-sources/${sourceId}/scan?_t=${Date.now()}`
	const res = await fetch(url, { method: 'POST' })
	if (!res.ok) {
		const text = await res.text().catch(() => '')
		logger.warn('Media source scan failed', { sourceId, status: res.status, body: text })
	}
}

function getLibraryId(library: TunarrMediaLibrary): string | undefined {
	// Tunarr may use 'id' or 'uuid' depending on version
	return library.id || library.uuid || ((library as Record<string, unknown>).libraryId as string | undefined)
}

export async function getLibraryPrograms(tunarrUrl: string, libraryId: string): Promise<TunarrProgram[]> {
	return tunarrFetch<TunarrProgram[]>(tunarrUrl, `/media-libraries/${libraryId}/programs`)
}

/**
 * Scan the media source that contains the given path, then search its library
 * for the program matching the externalKey. Returns the persisted program if found.
 */
export async function scanAndFindProgram(tunarrUrl: string, externalKey: string): Promise<TunarrProgram | null> {
	const sources = await listMediaSources(tunarrUrl)
	const matching = sources.find(
		s => s.paths?.some(p => externalKey.startsWith(p)) || s.libraries?.some(l => l.externalKey && externalKey.startsWith(l.externalKey))
	)

	if (!matching) {
		logger.warn('No matching media source found for path', { externalKey, sourceCount: sources.length })
		return null
	}

	// Fetch full source details (list endpoint may not include full library data)
	const fullSource = await getMediaSource(tunarrUrl, matching.id)
	logger.info('Scanning media source', { sourceId: fullSource.id, sourceName: fullSource.name, libraryCount: fullSource.libraries?.length })

	// Trigger scan
	await scanMediaSource(tunarrUrl, fullSource.id)

	// Find the matching library from the full source details
	const matchingLibrary =
		fullSource.libraries?.find(l => l.externalKey && externalKey.startsWith(l.externalKey)) ?? fullSource.libraries?.[0]

	logger.info('Library lookup result', {
		found: !!matchingLibrary,
		rawLibrary: matchingLibrary ? JSON.stringify(matchingLibrary) : 'none',
		externalKey,
	})

	const libraryId = matchingLibrary ? getLibraryId(matchingLibrary) : undefined
	if (!libraryId) {
		logger.warn('No library with valid ID found in media source', {
			sourceId: fullSource.id,
			libraries: JSON.stringify(fullSource.libraries),
		})
		return null
	}

	logger.info('Using library for program lookup', { libraryId, libraryName: matchingLibrary?.name })

	// Poll for the program to appear (scan may take a moment)
	for (let attempt = 0; attempt < 15; attempt++) {
		await new Promise(resolve => setTimeout(resolve, 2000))
		try {
			const programs = await getLibraryPrograms(tunarrUrl, libraryId)
			const found = programs.find(p => p.externalKey === externalKey)
			if (found) {
				logger.info('Found indexed program', { externalKey, uniqueId: found.uniqueId, attempt })
				return found
			}
			logger.info('Program not yet indexed, retrying...', { externalKey, attempt, totalPrograms: programs.length })
		} catch (err) {
			logger.warn('Failed to query library programs', { error: String(err), attempt })
		}
	}

	logger.warn('Program not found after scanning', { externalKey })
	return null
}

export async function updateChannelProgramming(
	tunarrUrl: string,
	channelId: string,
	program: TunarrProgram,
	mode: 'append' | 'replace'
): Promise<void> {
	const programs = [program]
	const lineup = [{ type: 'index' as const, index: 0 }]

	logger.info('Updating channel programming', { channelId, mode, programCount: programs.length })

	await tunarrFetch(tunarrUrl, `/channels/${channelId}/programming`, {
		method: 'POST',
		body: JSON.stringify({
			type: 'manual',
			programs,
			lineup,
			append: mode === 'append',
		}),
	})
}
