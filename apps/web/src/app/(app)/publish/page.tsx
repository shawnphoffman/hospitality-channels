export const dynamic = 'force-dynamic'

import { desc, eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { PublishWorkflow } from './publish-workflow'

export default async function PublishPage() {
	const db = await getDb()
	const profiles = await db.select().from(schema.publishProfiles)
	const artifacts = await db.select().from(schema.publishedArtifacts).orderBy(desc(schema.publishedArtifacts.publishedAt))

	const renderJobs = await db.select().from(schema.jobs).where(eq(schema.jobs.type, 'render')).orderBy(desc(schema.jobs.createdAt))

	const completedRenders = renderJobs.filter(j => j.status === 'completed' && j.outputPath)

	const pages = await db.select().from(schema.pages)

	const pagesWithRenders = completedRenders
		.map(job => {
			const page = pages.find(p => p.id === job.pageId)
			if (!page) return null
			return {
				pageId: page.id,
				pageTitle: page.title,
				pageSlug: page.slug,
				renderJobId: job.id,
				outputPath: job.outputPath!,
				renderedAt: job.completedAt ?? job.createdAt,
			}
		})
		.filter(Boolean) as Array<{
		pageId: string
		pageTitle: string
		pageSlug: string
		renderJobId: string
		outputPath: string
		renderedAt: string
	}>

	const [tunarrSetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_url')).limit(1)
	const tunarrConfigured = !!tunarrSetting?.value

	// Load channel bindings for pre-selecting push targets
	const channelDefs = await db.select().from(schema.channelDefinitions)
	const channelBindings: Record<string, { tunarrChannelId: string; pushMode: string }> = {}
	for (const cd of channelDefs) {
		if (cd.pageId && cd.tunarrChannelId) {
			channelBindings[cd.pageId] = { tunarrChannelId: cd.tunarrChannelId, pushMode: cd.pushMode ?? 'replace' }
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
		const page = pages.find(p => p.id === a.pageId)
		const profile = profiles.find(p => p.id === a.publishProfileId)
		return {
			...a,
			pageTitle: page?.title ?? a.pageId,
			profileName: profile?.name ?? a.publishProfileId,
		}
	})

	return (
		<div>
			<h2 className="mb-6 text-2xl font-bold text-white">Publish</h2>
			<PublishWorkflow
				profiles={profiles.map(p => ({
					id: p.id,
					name: p.name,
					exportPath: p.exportPath,
					fileNamingPattern: p.fileNamingPattern,
				}))}
				renderedPages={pagesWithRenders}
				artifacts={artifactsWithDetails.map(a => ({
					id: a.id,
					pageId: a.pageId,
					pageTitle: a.pageTitle,
					profileName: a.profileName,
					outputPath: a.outputPath,
					durationSec: a.durationSec,
					status: a.status,
					publishedAt: a.publishedAt,
				}))}
				tunarrConfigured={tunarrConfigured}
				channelBindings={channelBindings}
			/>
		</div>
	)
}
