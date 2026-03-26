export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq, asc } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { generateId } from '@/lib/id'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const db = await getDb()

	const [program] = await db.select().from(schema.programs).where(eq(schema.programs.id, id)).limit(1)
	if (!program) {
		return NextResponse.json({ error: 'Program not found' }, { status: 404 })
	}

	const tracks = await db
		.select()
		.from(schema.programAudioTracks)
		.where(eq(schema.programAudioTracks.programId, id))
		.orderBy(asc(schema.programAudioTracks.position))

	// Enrich with asset details
	const allAssets = await db.select().from(schema.assets)
	const enriched = tracks.map(t => {
		const asset = t.assetId ? allAssets.find(a => a.id === t.assetId) : null
		return { ...t, asset: asset ?? null }
	})

	return NextResponse.json(enriched)
}

/** Bulk reorder: PUT body is an array of { trackId, position } */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const db = await getDb()

	const [program] = await db.select().from(schema.programs).where(eq(schema.programs.id, id)).limit(1)
	if (!program) {
		return NextResponse.json({ error: 'Program not found' }, { status: 404 })
	}

	const body = (await request.json()) as Array<{ trackId: string; position: number }>
	if (!Array.isArray(body)) {
		return NextResponse.json({ error: 'Body must be an array of { trackId, position }' }, { status: 400 })
	}

	for (const item of body) {
		await db
			.update(schema.programAudioTracks)
			.set({ position: item.position })
			.where(eq(schema.programAudioTracks.id, item.trackId))
	}

	const updated = await db
		.select()
		.from(schema.programAudioTracks)
		.where(eq(schema.programAudioTracks.programId, id))
		.orderBy(asc(schema.programAudioTracks.position))

	return NextResponse.json(updated)
}

/** Add an audio track to the program */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const db = await getDb()

	const [program] = await db.select().from(schema.programs).where(eq(schema.programs.id, id)).limit(1)
	if (!program) {
		return NextResponse.json({ error: 'Program not found' }, { status: 404 })
	}

	const body = (await request.json()) as {
		assetId?: string
		audioUrl?: string
		position?: number
		durationSec?: number
	}

	if (!body.assetId && !body.audioUrl) {
		return NextResponse.json({ error: 'Either assetId or audioUrl is required' }, { status: 400 })
	}

	const existing = await db
		.select()
		.from(schema.programAudioTracks)
		.where(eq(schema.programAudioTracks.programId, id))

	// Resolve duration from asset if not provided
	let durationSec = body.durationSec ?? null
	if (durationSec == null && body.assetId) {
		const [asset] = await db.select().from(schema.assets).where(eq(schema.assets.id, body.assetId)).limit(1)
		if (asset?.duration) {
			durationSec = asset.duration
		}
	}

	const position = body.position ?? existing.length
	const track = {
		id: generateId(),
		programId: id,
		assetId: body.assetId ?? null,
		audioUrl: body.audioUrl ?? null,
		position,
		durationSec,
	}

	await db.insert(schema.programAudioTracks).values(track)

	// Update program's updatedAt
	await db
		.update(schema.programs)
		.set({ updatedAt: new Date().toISOString() })
		.where(eq(schema.programs.id, id))

	return NextResponse.json(track, { status: 201 })
}
