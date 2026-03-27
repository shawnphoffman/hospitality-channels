export const dynamic = 'force-dynamic'

import { desc, eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { PublishWorkflow } from './publish-workflow'

export default async function ArtifactsPage() {
	const db = await getDb()
	const profiles = await db.select().from(schema.publishProfiles)
	const artifacts = await db.select().from(schema.publishedArtifacts).orderBy(desc(schema.publishedArtifacts.publishedAt))

	const clips = await db.select().from(schema.clips)
	const programs = await db.select().from(schema.programs)

	const [tunarrSetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_url')).limit(1)
	const tunarrConfigured = !!tunarrSetting?.value
	const [tunarrMediaPathSetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_media_path')).limit(1)
	const tunarrMediaPath = tunarrMediaPathSetting?.value ?? ''

	// Load channel bindings for pre-selecting push targets
	const channelDefs = await db.select().from(schema.channelDefinitions)
	const channelBindings: Record<string, { tunarrChannelId: string; pushMode: string }> = {}
	for (const cd of channelDefs) {
		const key = cd.programId ?? cd.clipId
		if (key && cd.tunarrChannelId) {
			channelBindings[key] = { tunarrChannelId: cd.tunarrChannelId, pushMode: cd.pushMode ?? 'replace' }
		}
	}

	// Dedupe artifacts by output path, keeping the most recent (already sorted by publishedAt desc)
	const seenPaths = new Set<string>()
	const dedupedArtifacts = artifacts.filter(a => {
		if (seenPaths.has(a.outputPath)) return false
		seenPaths.add(a.outputPath)
		return true
	})

	const artifactsWithDetails = dedupedArtifacts.map(a => {
		const clip = a.clipId ? clips.find(c => c.id === a.clipId) : null
		const program = a.programId ? programs.find(p => p.id === a.programId) : null
		const profile = profiles.find(p => p.id === a.publishProfileId)
		return {
			...a,
			clipTitle: clip?.title ?? null,
			programTitle: program?.title ?? null,
			profileName: profile?.name ?? a.publishProfileId,
		}
	})

	// Count superseded (hidden) artifacts
	const supersededCount = artifacts.length - dedupedArtifacts.length

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold text-white">Artifacts</h2>
				<p className="mt-1 text-sm text-slate-500">Rendered videos and published outputs ready for distribution</p>
			</div>
			<PublishWorkflow
				artifacts={artifactsWithDetails.map(a => ({
					id: a.id,
					clipId: a.clipId,
					clipTitle: a.clipTitle,
					programId: a.programId,
					programTitle: a.programTitle,
					profileName: a.profileName,
					outputPath: a.outputPath,
					durationSec: a.durationSec,
					status: a.status,
					publishedAt: a.publishedAt,
				}))}
				supersededCount={supersededCount}
				tunarrConfigured={tunarrConfigured}
				tunarrMediaPath={tunarrMediaPath}
				channelBindings={channelBindings}
			/>
		</div>
	)
}
