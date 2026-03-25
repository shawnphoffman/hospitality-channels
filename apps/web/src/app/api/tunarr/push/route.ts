import { NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { updateChannelProgramming, scanMediaSourceForPath, listMediaSources } from '@hospitality-channels/publish'
import type { TunarrContentProgram } from '@hospitality-channels/publish'
import { PATHS } from '@hospitality-channels/common'
import path from 'node:path'
import crypto from 'node:crypto'

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

	const [page] = await db.select().from(schema.pages).where(eq(schema.pages.id, artifact.pageId)).limit(1)
	const title = page?.title ?? 'Untitled'

	// Remap the output path for Tunarr's filesystem view
	const [mediaPathSetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_media_path')).limit(1)
	let externalKey = artifact.outputPath
	if (mediaPathSetting?.value) {
		const exportDir = path.resolve(PATHS.exports)
		const relativePath = path.relative(exportDir, artifact.outputPath)
		externalKey = path.join(mediaPathSetting.value, relativePath)
	}

	// Find the matching Tunarr media source for this file path
	let externalSourceId = ''
	let externalSourceName = ''
	try {
		const sources = await listMediaSources(tunarrUrlSetting.value)
		const matching = sources.find(
			s =>
				s.paths?.some(p => externalKey.startsWith(p)) ||
				s.libraries?.some(l => l.externalKey && externalKey.startsWith(l.externalKey))
		)
		if (matching) {
			externalSourceId = matching.id
			externalSourceName = matching.name
		}
	} catch {
		// Continue without source info — push may still work
	}

	const program: TunarrContentProgram = {
		type: 'content',
		subtype: 'other_video',
		persisted: false,
		uniqueId: crypto.randomUUID(),
		externalKey,
		externalSourceType: 'local',
		externalSourceId,
		externalSourceName,
		externalIds: [],
		duration: Math.round(artifact.durationSec * 1000),
		title,
	}

	try {
		// Trigger a Tunarr library scan so the new file is discoverable
		await scanMediaSourceForPath(tunarrUrlSetting.value, externalKey)
		await updateChannelProgramming(tunarrUrlSetting.value, body.channelId, program, body.mode)
		return NextResponse.json({ success: true, title, channelId: body.channelId, mode: body.mode })
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		return NextResponse.json({ error: `Failed to push to Tunarr: ${msg}` }, { status: 502 })
	}
}
