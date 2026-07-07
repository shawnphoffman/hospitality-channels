import { NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { z } from 'zod'
import { getDb, schema } from '@/db'
import { updateChannelProgramming, scanAndFindProgram, buildExternalKey, enrichProgram } from '@hospitality-channels/publish'
import { PATHS } from '@hospitality-channels/common'
import path from 'node:path'
import { parseJsonBody } from '@/lib/api-validation'

const pushSchema = z.object({
	artifactId: z.string().optional(),
	artifactOutputPath: z.string().optional(),
	channelId: z.string().min(1),
	mode: z.enum(['append', 'replace']),
})

export async function POST(request: Request) {
	const db = await getDb()
	const result = await parseJsonBody(request, pushSchema)
	if (!result.ok) return result.response
	const body = result.data

	if (!body.artifactId && !body.artifactOutputPath) {
		return NextResponse.json({ error: 'artifactId or artifactOutputPath is required' }, { status: 400 })
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
	const externalKey = buildExternalKey(artifact.outputPath, path.resolve(PATHS.exports), mediaPathSetting?.value)

	// Load configured media source/library if available
	const [mediaSourceSetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_media_source_id')).limit(1)
	const [librarySetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_library_id')).limit(1)

	try {
		// Scan the media source and find the indexed program matching this file
		const result = await scanAndFindProgram(tunarrUrlSetting.value, externalKey, {
			mediaSourceId: mediaSourceSetting?.value || undefined,
			libraryId: librarySetting?.value || undefined,
		})
		if (!result.program) {
			let error: string
			switch (result.failure) {
				case 'no-media-source':
					error = `No Tunarr media source covers "${externalKey}". Select a media source and library in Settings, or add one in Tunarr whose path contains your exports.`
					break
				case 'no-library':
					error = 'The matched Tunarr media source has no usable library. Select a library in Settings.'
					break
				default:
					error =
						`Tunarr did not index "${externalKey}" after scanning.` +
						(result.samplePaths?.length
							? ` The library contains paths like ${result.samplePaths.map(p => `"${p}"`).join(', ')}; if your file is there under a different prefix, correct the Tunarr media path in Settings.`
							: ' The library returned no programs; check that the export volume is mounted into Tunarr and the media path in Settings matches how Tunarr sees it.')
			}
			return NextResponse.json({ error }, { status: 404 })
		}
		const program = result.program

		// Enrich the Tunarr program with our metadata
		let icon: string | null = null
		if (iconAssetId) {
			// Resolve icon asset path for Tunarr
			const [iconAsset] = await db.select().from(schema.assets).where(eq(schema.assets.id, iconAssetId)).limit(1)
			icon = iconAsset?.originalPath ?? null
		}
		enrichProgram(program, {
			title,
			summary,
			description,
			durationMs: durationSec ? Math.round(durationSec * 1000) : null, // Tunarr uses milliseconds
			icon,
		})

		await updateChannelProgramming(tunarrUrlSetting.value, body.channelId, program, body.mode)
		const warning =
			result.matchedBy === 'basename'
				? `Matched by filename only; Tunarr indexes this file under a different path. Set the Tunarr media path to "${result.suggestedMediaPath ?? 'the path Tunarr uses'}" in Settings for reliable matching.`
				: undefined
		return NextResponse.json({ success: true, title, channelId: body.channelId, mode: body.mode, warning })
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		return NextResponse.json({ error: `Failed to push to Tunarr: ${msg}` }, { status: 502 })
	}
}
