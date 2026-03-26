export const dynamic = 'force-dynamic'

import { eq, asc } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { notFound } from 'next/navigation'
import { ProgramEditor } from './program-editor'

export default async function ProgramPage({ params }: { params: { id: string } }) {
	const db = await getDb()

	const [program] = await db.select().from(schema.programs).where(eq(schema.programs.id, params.id)).limit(1)
	if (!program) notFound()

	const programClips = await db
		.select()
		.from(schema.programClips)
		.where(eq(schema.programClips.programId, params.id))
		.orderBy(asc(schema.programClips.position))

	const audioTracks = await db
		.select()
		.from(schema.programAudioTracks)
		.where(eq(schema.programAudioTracks.programId, params.id))
		.orderBy(asc(schema.programAudioTracks.position))

	// Get clip details
	const allClips = await db.select().from(schema.clips)
	const allTemplates = await db.select().from(schema.templates)

	const enrichedClips = programClips.map(pc => {
		const clip = allClips.find(c => c.id === pc.clipId)
		const template = clip ? allTemplates.find(t => t.id === clip.templateId) : null
		return {
			programClipId: pc.id,
			clipId: pc.clipId,
			position: pc.position,
			title: clip?.title ?? 'Unknown Clip',
			templateName: template?.name ?? 'Unknown',
		}
	})

	// Get audio asset details
	const allAssets = await db.select().from(schema.assets)
	const enrichedTracks = audioTracks.map(t => {
		const asset = t.assetId ? allAssets.find(a => a.id === t.assetId) : null
		return {
			id: t.id,
			position: t.position,
			assetId: t.assetId,
			audioUrl: t.audioUrl,
			durationSec: t.durationSec ?? asset?.duration ?? null,
			filename: asset
				? (asset.originalPath.split('/').pop() ?? 'audio')
				: t.audioUrl
					? (new URL(t.audioUrl, 'http://localhost').pathname.split('/').pop() ?? 'audio')
					: 'Unknown',
		}
	})

	const profiles = await db.select().from(schema.publishProfiles)
	const [tunarrSetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_url')).limit(1)

	// Available clips (not already in program)
	const usedClipIds = new Set(programClips.map(pc => pc.clipId))
	const availableClips = allClips.map(c => ({ id: c.id, title: c.title }))

	// Available audio assets
	const audioAssets = allAssets
		.filter(a => a.type === 'audio')
		.map(a => ({ id: a.id, filename: a.originalPath.split('/').pop() ?? 'audio' }))

	// Image assets for icon picker
	const imageAssets = allAssets.filter(a => a.type !== 'audio' && a.type !== 'video').map(a => ({ id: a.id, originalPath: a.originalPath }))

	return (
		<ProgramEditor
			program={{
				id: program.id,
				title: program.title,
				slug: program.slug,
				description: program.description ?? '',
				summary: program.summary ?? '',
				iconAssetId: program.iconAssetId,
				durationMode: program.durationMode as 'auto' | 'manual',
				manualDurationSec: program.manualDurationSec,
			}}
			clips={enrichedClips}
			audioTracks={enrichedTracks}
			availableClips={availableClips}
			audioAssets={audioAssets}
			imageAssets={imageAssets}
			profiles={profiles.map(p => ({ id: p.id, name: p.name }))}
			tunarrConfigured={!!tunarrSetting?.value}
		/>
	)
}
