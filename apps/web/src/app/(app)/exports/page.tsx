export const dynamic = 'force-dynamic'

import { desc } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { ExportsClient } from './exports-client'

export default async function ExportsPage() {
	const db = await getDb()
	const profiles = await db.select().from(schema.publishProfiles)
	const artifacts = await db.select().from(schema.publishedArtifacts).orderBy(desc(schema.publishedArtifacts.publishedAt))

	const clips = await db.select().from(schema.clips)
	const programs = await db.select().from(schema.programs)

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
			allowDownload: profile?.allowDownload ?? false,
		}
	})

	// Count superseded (hidden) artifacts
	const supersededCount = artifacts.length - dedupedArtifacts.length

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold text-white">Exports</h2>
				<p className="mt-1 text-sm text-slate-500">Library of rendered files and where they were exported</p>
			</div>
			<ExportsClient
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
					allowDownload: a.allowDownload,
				}))}
				supersededCount={supersededCount}
			/>
		</div>
	)
}
