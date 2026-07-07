export const dynamic = 'force-dynamic'

import { getDb, schema } from '@/db'
import { loadAllEntityTags } from '@/lib/tags'
import { ProgramsSplitPane, type ProgramListItem } from './programs-split-pane'

export default async function ProgramsListPage() {
	const db = await getDb()
	const [allPrograms, allProgramClips, allAudioTracks, allClips, allAssets, artifacts, channelDefs, jobs, entityTags] = await Promise.all([
		db.select().from(schema.programs),
		db.select().from(schema.programClips),
		db.select().from(schema.programAudioTracks),
		db.select({ id: schema.clips.id, title: schema.clips.title }).from(schema.clips),
		db.select({ id: schema.assets.id, name: schema.assets.name, originalPath: schema.assets.originalPath }).from(schema.assets),
		db
			.select({
				id: schema.publishedArtifacts.id,
				programId: schema.publishedArtifacts.programId,
				publishedAt: schema.publishedArtifacts.publishedAt,
			})
			.from(schema.publishedArtifacts),
		db.select().from(schema.channelDefinitions),
		db
			.select({
				programId: schema.jobs.programId,
				status: schema.jobs.status,
				createdAt: schema.jobs.createdAt,
				outputPath: schema.jobs.outputPath,
			})
			.from(schema.jobs),
		loadAllEntityTags(db),
	])

	const clipTitleById = new Map(allClips.map(c => [c.id, c.title]))
	const assetById = new Map(allAssets.map(a => [a.id, a]))
	const artifactProgramById = new Map(artifacts.map(a => [a.id, a.programId]))

	// Channel bindings may reference a program directly or through an artifact
	const channelByProgram = new Map<string, string>()
	for (const cd of channelDefs) {
		if (!cd.enabled) continue
		const programId = cd.programId ?? (cd.artifactId ? artifactProgramById.get(cd.artifactId) : null)
		if (programId && !channelByProgram.has(programId)) {
			channelByProgram.set(programId, `Ch ${cd.channelNumber} · ${cd.channelName}`)
		}
	}

	const artifactsByProgram = new Map<string, number>()
	for (const a of artifacts) {
		if (a.programId) artifactsByProgram.set(a.programId, (artifactsByProgram.get(a.programId) ?? 0) + 1)
	}

	// Latest job per program decides failed/rendered when nothing is published
	const latestJobByProgram = new Map<string, { status: string; createdAt: string; outputPath: string | null }>()
	for (const j of jobs) {
		if (!j.programId) continue
		const prev = latestJobByProgram.get(j.programId)
		if (!prev || j.createdAt > prev.createdAt) latestJobByProgram.set(j.programId, j)
	}

	const EMOJI_RE = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u

	const items: ProgramListItem[] = allPrograms
		.map(p => {
			const memberships = allProgramClips.filter(pc => pc.programId === p.id).sort((a, b) => a.position - b.position)
			const tracks = allAudioTracks.filter(t => t.programId === p.id).sort((a, b) => a.position - b.position)
			const audioDuration = tracks.reduce((sum, t) => sum + (t.durationSec ?? 0), 0)
			const computedDuration = p.durationMode === 'manual' ? (p.manualDurationSec ?? 0) : audioDuration

			const channelLabel = channelByProgram.get(p.id) ?? null
			const latestJob = latestJobByProgram.get(p.id)
			let status: ProgramListItem['status']
			if (channelLabel) status = 'onair'
			else if ((artifactsByProgram.get(p.id) ?? 0) > 0) status = 'published'
			else if (latestJob?.status === 'failed') status = 'failed'
			else if (latestJob?.status === 'completed' && latestJob.outputPath) status = 'rendered'
			else status = 'draft'

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

	return <ProgramsSplitPane programs={items} />
}
