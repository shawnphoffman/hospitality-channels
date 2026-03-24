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

export async function updateChannelProgramming(
	tunarrUrl: string,
	channelId: string,
	program: TunarrContentProgram,
	mode: 'append' | 'replace'
): Promise<void> {
	let programs: TunarrContentProgram[]

	if (mode === 'append') {
		const current = await getChannelProgramming(tunarrUrl, channelId)
		programs = [...(current.programs ?? []), program]
	} else {
		programs = [program]
	}

	logger.info('Updating channel programming', { channelId, mode, programCount: programs.length })

	await tunarrFetch(tunarrUrl, `/channels/${channelId}/programming`, {
		method: 'POST',
		body: JSON.stringify({ programs, lineup: programs.map((_, i) => ({ type: 'content', index: i })) }),
	})
}
