export const dynamic = 'force-dynamic'

import { eq, asc, desc } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { notFound } from 'next/navigation'
import { ProgramEditor } from './program-editor'

const EMOJI_RE = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u

function emojiFirstSort(a: string, b: string): number {
	const aEmoji = EMOJI_RE.test(a)
	const bEmoji = EMOJI_RE.test(b)
	if (aEmoji && !bEmoji) return -1
	if (!aEmoji && bEmoji) return 1
	return a.localeCompare(b)
}

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
				? (asset.name ?? asset.originalPath.split('/').pop() ?? 'audio')
				: t.audioUrl
					? (new URL(t.audioUrl, 'http://localhost').pathname.split('/').pop() ?? 'audio')
					: 'Unknown',
			coverArtPath: asset?.derivedPath ?? null,
		}
	})

	const profiles = await db.select().from(schema.publishProfiles)
	const [tunarrSetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_url')).limit(1)
	const [tunarrMediaPathSetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_media_path')).limit(1)

	// Load published artifacts for this program
	const artifacts = await db
		.select()
		.from(schema.publishedArtifacts)
		.where(eq(schema.publishedArtifacts.programId, params.id))
		.orderBy(desc(schema.publishedArtifacts.publishedAt))

	// Mark older artifacts with the same output path as superseded
	const latestByPath = new Set<string>()
	const artifactsWithProfile = artifacts.map(a => {
		const profile = profiles.find(p => p.id === a.publishProfileId)
		const superseded = latestByPath.has(a.outputPath)
		latestByPath.add(a.outputPath)
		return {
			id: a.id,
			outputPath: a.outputPath,
			durationSec: a.durationSec,
			status: a.status,
			publishedAt: a.publishedAt,
			profileName: profile?.name ?? 'Unknown',
			superseded,
		}
	})

	// Available clips (not already in program)
	const usedClipIds = new Set(programClips.map(pc => pc.clipId))
	const availableClips = allClips.map(c => ({ id: c.id, title: c.title })).sort((a, b) => emojiFirstSort(a.title, b.title))

	// Available audio assets
	const audioAssets = allAssets
		.filter(a => a.type === 'audio')
		.map(a => ({ id: a.id, filename: a.name ?? a.originalPath.split('/').pop() ?? 'audio', originalPath: a.originalPath }))
		.sort((a, b) => emojiFirstSort(a.filename, b.filename))

	// Look up channel binding for this program
	const [boundChannel] = await db
		.select({ tunarrChannelId: schema.channelDefinitions.tunarrChannelId, pushMode: schema.channelDefinitions.pushMode })
		.from(schema.channelDefinitions)
		.where(eq(schema.channelDefinitions.programId, params.id))
		.limit(1)

	// Image assets for icon picker
	const imageAssets = allAssets
		.filter(a => a.type !== 'audio' && a.type !== 'video')
		.map(a => ({ id: a.id, name: a.name ?? null, originalPath: a.originalPath }))
		.sort((a, b) => emojiFirstSort(a.name ?? a.originalPath, b.name ?? b.originalPath))

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
				minClipDurationSec: program.minClipDurationSec,
				transitionType: program.transitionType,
				transitionSec: program.transitionSec,
				loopTransition: program.loopTransition,
			}}
			clips={enrichedClips}
			audioTracks={enrichedTracks}
			availableClips={availableClips}
			audioAssets={audioAssets}
			imageAssets={imageAssets}
			profiles={profiles.map(p => ({ id: p.id, name: p.name, exportPath: p.exportPath, fileNamingPattern: p.fileNamingPattern }))}
			tunarrConfigured={!!tunarrSetting?.value}
			tunarrMediaPath={tunarrMediaPathSetting?.value ?? ''}
			artifacts={artifactsWithProfile}
			boundTunarrChannelId={boundChannel?.tunarrChannelId ?? undefined}
			boundPushMode={(boundChannel?.pushMode as 'append' | 'replace') ?? undefined}
		/>
	)
}
