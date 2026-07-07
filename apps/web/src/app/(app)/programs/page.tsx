export const dynamic = 'force-dynamic'

import { getDb, schema } from '@/db'
import { deriveProgramStatuses } from '@/lib/program-status'
import { loadAllEntityTags } from '@/lib/tags'
import { ProgramsSplitPane, type ProgramListItem } from './programs-split-pane'

export default async function ProgramsListPage() {
	const db = await getDb()
	const [allPrograms, allProgramClips, allAudioTracks, allClips, allAssets, programStatuses, entityTags, profiles] = await Promise.all([
		db.select().from(schema.programs),
		db.select().from(schema.programClips),
		db.select().from(schema.programAudioTracks),
		db.select({ id: schema.clips.id, title: schema.clips.title }).from(schema.clips),
		db.select({ id: schema.assets.id, name: schema.assets.name, originalPath: schema.assets.originalPath }).from(schema.assets),
		deriveProgramStatuses(db),
		loadAllEntityTags(db),
		db.select({ id: schema.publishProfiles.id, name: schema.publishProfiles.name }).from(schema.publishProfiles),
	])

	const clipTitleById = new Map(allClips.map(c => [c.id, c.title]))
	const assetById = new Map(allAssets.map(a => [a.id, a]))

	const EMOJI_RE = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u

	const items: ProgramListItem[] = allPrograms
		.map(p => {
			const memberships = allProgramClips.filter(pc => pc.programId === p.id).sort((a, b) => a.position - b.position)
			const tracks = allAudioTracks.filter(t => t.programId === p.id).sort((a, b) => a.position - b.position)
			const audioDuration = tracks.reduce((sum, t) => sum + (t.durationSec ?? 0), 0)
			const computedDuration = p.durationMode === 'manual' ? (p.manualDurationSec ?? 0) : audioDuration

			const statusInfo = programStatuses.get(p.id)
			const binding = statusInfo?.binding ?? null
			const channelLabel = binding?.label ?? null
			const status: ProgramListItem['status'] = statusInfo?.status ?? 'draft'

			return {
				id: p.id,
				title: p.title,
				slug: p.slug,
				description: p.description ?? '',
				clips: memberships.map(m => ({ id: m.clipId, title: clipTitleById.get(m.clipId) ?? 'Unknown clip' })),
				tracks: tracks.map(t => {
					const asset = t.assetId ? assetById.get(t.assetId) : undefined
					const name = asset?.name || (asset?.originalPath ?? t.audioUrl ?? 'audio').split('/').pop() || 'audio'
					return { name, durationSec: t.durationSec ?? null }
				}),
				durationSec: computedDuration,
				status,
				channelLabel,
				tunarrChannelId: binding?.tunarrChannelId ?? null,
				pushMode: binding?.pushMode === 'append' ? ('append' as const) : ('replace' as const),
				updatedAt: p.updatedAt,
				tags: entityTags.programs.get(p.id) ?? [],
			}
		})
		.sort((a, b) => {
			const aEmoji = EMOJI_RE.test(a.title)
			const bEmoji = EMOJI_RE.test(b.title)
			if (aEmoji && !bEmoji) return -1
			if (!aEmoji && bEmoji) return 1
			return a.title.localeCompare(b.title)
		})

	return <ProgramsSplitPane programs={items} defaultProfile={profiles[0] ?? null} />
}
