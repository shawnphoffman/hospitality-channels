export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq, asc } from 'drizzle-orm'
import { z } from 'zod'
import { getDb, schema } from '@/db'
import { generateId } from '@/lib/id'
import { parseJsonBody } from '@/lib/api-validation'

const reorderClipsSchema = z.array(z.object({ clipId: z.string(), position: z.number() }))

const addClipSchema = z.object({
	clipId: z.string().min(1),
	position: z.number().optional(),
})

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

	const result = await parseJsonBody(request, reorderClipsSchema)
	if (!result.ok) return result.response
	const body = result.data

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

	const result = await parseJsonBody(request, addClipSchema)
	if (!result.ok) return result.response
	const body = result.data

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
