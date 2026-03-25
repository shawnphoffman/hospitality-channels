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

export interface TunarrContentProgram {
	type: 'content'
	sourceType: 'local'
	externalKey: string
	duration: number
	title: string
	subtype: 'movie'
}

interface CondensedProgramming {
	programs: TunarrContentProgram[]
	lineup: unknown[]
	schedule?: unknown
}

async function tunarrFetch<T>(tunarrUrl: string, path: string, init?: RequestInit): Promise<T> {
	const url = `${tunarrUrl.replace(/\/+$/, '')}/api${path}`
	const separator = url.includes('?') ? '&' : '?'
	const uncachedUrl = `${url}${separator}_t=${Date.now()}`
	const res = await fetch(uncachedUrl, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...init?.headers,
		},
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

export interface TunarrMediaSource {
	id: string
	name: string
	type: string
	libraries: Array<{ id: string; name: string; externalKey?: string }>
	paths?: string[]
}

export async function listMediaSources(tunarrUrl: string): Promise<TunarrMediaSource[]> {
	return tunarrFetch<TunarrMediaSource[]>(tunarrUrl, '/media-sources')
}

export async function scanMediaSource(tunarrUrl: string, sourceId: string): Promise<void> {
	logger.info('Triggering media source scan', { sourceId })
	await tunarrFetch(tunarrUrl, `/media-sources/${sourceId}/scan`, { method: 'POST' })
}

export async function scanMediaSourceForPath(tunarrUrl: string, mediaPath: string): Promise<void> {
	try {
		const sources = await listMediaSources(tunarrUrl)
		// Find a media source whose path matches the media path prefix
		const matching = sources.find(
			s =>
				s.paths?.some(p => mediaPath.startsWith(p)) ||
				s.libraries?.some(l => l.externalKey && mediaPath.startsWith(l.externalKey))
		)
		if (matching) {
			await scanMediaSource(tunarrUrl, matching.id)
			// Give Tunarr a moment to discover the new file
			await new Promise(resolve => setTimeout(resolve, 3000))
			logger.info('Media source scan completed', { sourceId: matching.id, sourceName: matching.name })
		} else {
			logger.warn('No matching media source found for path', { mediaPath, sourceCount: sources.length })
		}
	} catch (err) {
		// Don't fail the push if scan fails — the file might already be indexed
		logger.warn('Media source scan failed (continuing anyway)', { error: String(err) })
	}
}

export async function updateChannelProgramming(
	tunarrUrl: string,
	channelId: string,
	program: TunarrContentProgram,
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
