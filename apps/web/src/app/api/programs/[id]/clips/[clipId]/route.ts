export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { getDb, schema } from '@/db'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; clipId: string }> }) {
	const { id, clipId } = await params
	const db = await getDb()

	const [program] = await db.select().from(schema.programs).where(eq(schema.programs.id, id)).limit(1)
	if (!program) {
		return NextResponse.json({ error: 'Program not found' }, { status: 404 })
	}

	const allProgramClips = await db.select().from(schema.programClips).where(eq(schema.programClips.programId, id))

	const match = allProgramClips.find(pc => pc.clipId === clipId)
	if (!match) {
		return NextResponse.json({ error: 'Clip not in program' }, { status: 404 })
	}

	await db.delete(schema.programClips).where(eq(schema.programClips.id, match.id))

	return NextResponse.json({ success: true })
}
