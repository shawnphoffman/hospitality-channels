export interface ProgramData {
	id: string
	title: string
	slug: string
	description: string
	summary: string
	iconAssetId: string | null
	durationMode: 'auto' | 'manual'
	manualDurationSec: number | null
	minClipDurationSec: number | null
	transitionType: string
	transitionSec: number
	loopTransition: boolean
}

export interface ProgramClip {
	programClipId: string
	clipId: string
	position: number
	title: string
	templateName: string
}

export interface AudioTrack {
	id: string
	position: number
	assetId: string | null
	audioUrl: string | null
	durationSec: number | null
	filename: string
	coverArtPath?: string | null
}

export interface JobData {
	id: string
	type: string
	status: string
	outputPath: string | null
	error: string | null
	createdAt: string
	completedAt: string | null
}

export interface TunarrChannel {
	id: string
	number: number
	name: string
}

export interface ArtifactData {
	id: string
	outputPath: string
	durationSec: number
	status: string
	publishedAt: string | null
	profileName: string
	allowDownload: boolean
	superseded?: boolean
}

export function formatDuration(sec: number): string {
	if (sec <= 0) return '0:00'
	const m = Math.floor(sec / 60)
	const s = Math.round(sec % 60)
	return `${m}:${s.toString().padStart(2, '0')}`
}
