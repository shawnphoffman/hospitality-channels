export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq, asc } from 'drizzle-orm'
import { getDb, schema } from '@/db'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const db = await getDb()

	const [program] = await db.select().from(schema.programs).where(eq(schema.programs.id, id)).limit(1)
	if (!program) {
		return NextResponse.json({ error: 'Program not found' }, { status: 404 })
	}

	const clips = await db
		.select()
		.from(schema.programClips)
		.where(eq(schema.programClips.programId, id))
		.orderBy(asc(schema.programClips.position))

	const audioTracks = await db
		.select()
		.from(schema.programAudioTracks)
		.where(eq(schema.programAudioTracks.programId, id))
		.orderBy(asc(schema.programAudioTracks.position))

	// Enrich clips with clip details
	const clipIds = clips.map(c => c.clipId)
	const clipDetails = clipIds.length > 0 ? await db.select().from(schema.clips) : []

	const enrichedClips = clips.map(pc => {
		const clip = clipDetails.find(c => c.id === pc.clipId)
		return {
			...pc,
			clip: clip ?? null,
		}
	})

	// Enrich audio tracks with asset details
	const assetIds = audioTracks.filter(t => t.assetId).map(t => t.assetId!)
	const assetDetails = assetIds.length > 0 ? await db.select().from(schema.assets) : []

	const enrichedTracks = audioTracks.map(t => {
		const asset = t.assetId ? assetDetails.find(a => a.id === t.assetId) : null
		return {
			...t,
			asset: asset ?? null,
		}
	})

	const audioDuration = audioTracks.reduce((sum, t) => sum + (t.durationSec ?? 0), 0)
	const baseDuration = program.durationMode === 'manual' ? (program.manualDurationSec ?? 0) : audioDuration
	const perClipDuration =
		clips.length > 0
			? program.minClipDurationSec
				? Math.max(baseDuration / clips.length, program.minClipDurationSec)
				: baseDuration / clips.length
			: 0
	const computedDuration =
		clips.length > 0 && program.minClipDurationSec && baseDuration / clips.length < program.minClipDurationSec
			? program.minClipDurationSec * clips.length
			: baseDuration

	return NextResponse.json({
		...program,
		clips: enrichedClips,
		audioTracks: enrichedTracks,
		computedDuration,
		perClipDuration,
	})
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const db = await getDb()

	const [existing] = await db.select().from(schema.programs).where(eq(schema.programs.id, id)).limit(1)
	if (!existing) {
		return NextResponse.json({ error: 'Program not found' }, { status: 404 })
	}

	const body = await request.json()
	const now = new Date().toISOString()

	await db
		.update(schema.programs)
		.set({
			title: body.title ?? existing.title,
			slug: body.slug ?? existing.slug,
			description: body.description !== undefined ? body.description : existing.description,
			summary: body.summary !== undefined ? body.summary : existing.summary,
			iconAssetId: body.iconAssetId !== undefined ? body.iconAssetId : existing.iconAssetId,
			durationMode: body.durationMode ?? existing.durationMode,
			manualDurationSec: body.manualDurationSec !== undefined ? body.manualDurationSec : existing.manualDurationSec,
			minClipDurationSec: body.minClipDurationSec !== undefined ? body.minClipDurationSec : existing.minClipDurationSec,
			updatedAt: now,
		})
		.where(eq(schema.programs.id, id))

	const [updated] = await db.select().from(schema.programs).where(eq(schema.programs.id, id)).limit(1)
	return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const db = await getDb()

	const [existing] = await db.select().from(schema.programs).where(eq(schema.programs.id, id)).limit(1)
	if (!existing) {
		return NextResponse.json({ error: 'Program not found' }, { status: 404 })
	}

	// Cascade delete: clips, audio tracks, then program
	await db.delete(schema.programAudioTracks).where(eq(schema.programAudioTracks.programId, id))
	await db.delete(schema.programClips).where(eq(schema.programClips.programId, id))
	await db.delete(schema.programs).where(eq(schema.programs.id, id))

	return NextResponse.json({ success: true })
}
