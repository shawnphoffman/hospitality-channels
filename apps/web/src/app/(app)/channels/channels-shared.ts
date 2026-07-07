export interface ChannelDef {
	id: string
	tunarrChannelId: string | null
	channelNumber: number
	channelName: string
	clipId: string | null
	programId: string | null
	pushMode: string | null
	enabled: boolean | null
	description: string | null
	clipTitle: string | null
	programTitle: string | null
	programTags: string[]
	latestArtifact: {
		id: string
		outputPath: string
		durationSec: number
		publishedAt: string | null
	} | null
}

export interface ClipInfo {
	id: string
	title: string
}

export interface ProgramInfoItem {
	id: string
	title: string
}

export interface TunarrChannel {
	id: string
	number: number
	name: string
}

export interface ProgramInfo {
	title: string
	duration: number
}

export function formatDuration(ms: number): string {
	const totalSec = Math.round(ms / 1000)
	const m = Math.floor(totalSec / 60)
	const s = totalSec % 60
	return `${m}:${s.toString().padStart(2, '0')}`
}
