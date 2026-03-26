import { NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { updateChannelProgramming, scanAndFindProgram } from '@hospitality-channels/publish'
import { PATHS } from '@hospitality-channels/common'
import path from 'node:path'

export async function POST(request: Request) {
	const db = await getDb()
	const body = (await request.json()) as {
		artifactId?: string
		artifactOutputPath?: string
		channelId: string
		mode: 'append' | 'replace'
	}

	if ((!body.artifactId && !body.artifactOutputPath) || !body.channelId || !body.mode) {
		return NextResponse.json({ error: 'artifactId or artifactOutputPath, channelId, and mode are required' }, { status: 400 })
	}

	const [tunarrUrlSetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_url')).limit(1)
	if (!tunarrUrlSetting?.value) {
		return NextResponse.json({ error: 'Tunarr URL not configured' }, { status: 400 })
	}

	let artifact
	if (body.artifactId) {
		;[artifact] = await db.select().from(schema.publishedArtifacts).where(eq(schema.publishedArtifacts.id, body.artifactId)).limit(1)
	} else if (body.artifactOutputPath) {
		;[artifact] = await db
			.select()
			.from(schema.publishedArtifacts)
			.where(eq(schema.publishedArtifacts.outputPath, body.artifactOutputPath))
			.orderBy(desc(schema.publishedArtifacts.publishedAt))
			.limit(1)
	}

	if (!artifact) {
		return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
	}

	// Resolve title and metadata from either program or clip
	let title = 'Untitled'
	let summary: string | null = null
	let description: string | null = null
	let iconAssetId: string | null = null
	let durationSec: number | null = null

	if (artifact.programId) {
		const [prog] = await db.select().from(schema.programs).where(eq(schema.programs.id, artifact.programId)).limit(1)
		if (prog) {
			title = prog.title
			summary = prog.summary ?? null
			description = prog.description ?? null
			iconAssetId = prog.iconAssetId ?? null
		}
	} else if (artifact.clipId) {
		const [clip] = await db.select().from(schema.clips).where(eq(schema.clips.id, artifact.clipId)).limit(1)
		if (clip) {
			title = clip.title
		}
	}

	durationSec = artifact.durationSec ?? null

	// The externalKey is the file path as Tunarr sees it.
	// If the artifact is already in the Tunarr media path, use it directly.
	// Otherwise, remap from the default export dir to the Tunarr media path.
	const [mediaPathSetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_media_path')).limit(1)
	let externalKey = artifact.outputPath
	if (mediaPathSetting?.value && !artifact.outputPath.startsWith(mediaPathSetting.value)) {
		const exportDir = path.resolve(PATHS.exports)
		const relativePath = path.relative(exportDir, artifact.outputPath)
		externalKey = path.join(mediaPathSetting.value, relativePath)
	}

	// Load configured media source/library if available
	const [mediaSourceSetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_media_source_id')).limit(1)
	const [librarySetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_library_id')).limit(1)

	try {
		// Scan the media source and find the indexed program matching this file
		const program = await scanAndFindProgram(tunarrUrlSetting.value, externalKey, {
			mediaSourceId: mediaSourceSetting?.value || undefined,
			libraryId: librarySetting?.value || undefined,
		})
		if (!program) {
			return NextResponse.json(
				{ error: `File not found in Tunarr library after scanning. Make sure "${externalKey}" exists and is accessible to Tunarr.` },
				{ status: 404 }
			)
		}

		// Enrich the Tunarr program with our metadata
		program.title = title
		if (summary) program.summary = summary
		if (description) program.description = description
		if (durationSec) program.duration = Math.round(durationSec * 1000) // Tunarr uses milliseconds
		if (iconAssetId) {
			// Resolve icon asset path for Tunarr
			const [iconAsset] = await db.select().from(schema.assets).where(eq(schema.assets.id, iconAssetId)).limit(1)
			if (iconAsset?.originalPath) {
				program.icon = iconAsset.originalPath
			}
		}

		await updateChannelProgramming(tunarrUrlSetting.value, body.channelId, program, body.mode)
		return NextResponse.json({ success: true, title, channelId: body.channelId, mode: body.mode })
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		return NextResponse.json({ error: `Failed to push to Tunarr: ${msg}` }, { status: 502 })
	}
}
