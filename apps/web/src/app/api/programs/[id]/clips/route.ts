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

	const programClips = await db
		.select()
		.from(schema.programClips)
		.where(eq(schema.programClips.programId, id))
		.orderBy(asc(schema.programClips.position))

	// Enrich with clip details
	const allClips = await db.select().from(schema.clips)
	const enriched = programClips.map(pc => {
		const clip = allClips.find(c => c.id === pc.clipId)
		return { ...pc, clip: clip ?? null }
	})

	return NextResponse.json(enriched)
}

/** Bulk reorder: PUT body is an array of { clipId, position } */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const db = await getDb()

	const [program] = await db.select().from(schema.programs).where(eq(schema.programs.id, id)).limit(1)
	if (!program) {
		return NextResponse.json({ error: 'Program not found' }, { status: 404 })
	}

	const body = (await request.json()) as Array<{ clipId: string; position: number }>
	if (!Array.isArray(body)) {
		return NextResponse.json({ error: 'Body must be an array of { clipId, position }' }, { status: 400 })
	}

	// Load all program clips to find IDs by clipId
	const allProgramClips = await db.select().from(schema.programClips).where(eq(schema.programClips.programId, id))

	for (const item of body) {
		const match = allProgramClips.find(pc => pc.clipId === item.clipId)
		if (match) {
			await db.update(schema.programClips).set({ position: item.position }).where(eq(schema.programClips.id, match.id))
		}
	}

	const updated = await db
		.select()
		.from(schema.programClips)
		.where(eq(schema.programClips.programId, id))
		.orderBy(asc(schema.programClips.position))

	return NextResponse.json(updated)
}

/** Add a clip to the program */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const db = await getDb()

	const [program] = await db.select().from(schema.programs).where(eq(schema.programs.id, id)).limit(1)
	if (!program) {
		return NextResponse.json({ error: 'Program not found' }, { status: 404 })
	}

	const body = (await request.json()) as { clipId: string; position?: number }
	if (!body.clipId) {
		return NextResponse.json({ error: 'clipId is required' }, { status: 400 })
	}

	// Verify the clip exists
	const [clip] = await db.select().from(schema.clips).where(eq(schema.clips.id, body.clipId)).limit(1)
	if (!clip) {
		return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
	}

	// Check for duplicate
	const existing = await db.select().from(schema.programClips).where(eq(schema.programClips.programId, id))

	if (existing.some(pc => pc.clipId === body.clipId)) {
		return NextResponse.json({ error: 'Clip already in program' }, { status: 409 })
	}

	const position = body.position ?? existing.length
	const programClip = {
		id: generateId(),
		programId: id,
		clipId: body.clipId,
		position,
	}

	await db.insert(schema.programClips).values(programClip)
	return NextResponse.json({ ...programClip, clip }, { status: 201 })
}
