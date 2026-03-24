export const dynamic = 'force-dynamic'

import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { ChannelsClient } from './channels-client'

export default async function ChannelsPage() {
	const db = await getDb()
	const channels = await db.select().from(schema.channelDefinitions)
	const pages = await db.select({ id: schema.pages.id, title: schema.pages.title }).from(schema.pages)
	const [tunarrSetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_url')).limit(1)
	const tunarrConfigured = !!tunarrSetting?.value

	// Find latest Tunarr Export artifact per page
	const tunarrProfile = await db
		.select()
		.from(schema.publishProfiles)
		.where(eq(schema.publishProfiles.name, 'Tunarr Export'))
		.limit(1)
	const tunarrProfileId = tunarrProfile[0]?.id

	let artifactsByPage: Record<string, { id: string; outputPath: string; durationSec: number; publishedAt: string | null }> = {}
	if (tunarrProfileId) {
		const artifacts = await db
			.select()
			.from(schema.publishedArtifacts)
			.where(eq(schema.publishedArtifacts.publishProfileId, tunarrProfileId))
		for (const a of artifacts) {
			const existing = artifactsByPage[a.pageId]
			if (!existing || (a.publishedAt ?? '') > (existing.publishedAt ?? '')) {
				artifactsByPage[a.pageId] = {
					id: a.id,
					outputPath: a.outputPath,
					durationSec: a.durationSec,
					publishedAt: a.publishedAt,
				}
			}
		}
	}

	const channelsWithDetails = channels.map(ch => {
		const page = ch.pageId ? pages.find(p => p.id === ch.pageId) : null
		const artifact = ch.pageId ? artifactsByPage[ch.pageId] ?? null : null
		return {
			...ch,
			pageTitle: page?.title ?? null,
			latestArtifact: artifact,
		}
	})

	return (
		<div>
			<h2 className="mb-6 text-2xl font-bold text-white">Channels</h2>
			<ChannelsClient
				initialChannels={channelsWithDetails}
				pages={pages}
				tunarrConfigured={tunarrConfigured}
			/>
		</div>
	)
}
