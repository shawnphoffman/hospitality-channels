export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string; trackId: string }> }) {
	const { id, trackId } = await params
	const db = await getDb()

	const [program] = await db.select().from(schema.programs).where(eq(schema.programs.id, id)).limit(1)
	if (!program) {
		return NextResponse.json({ error: 'Program not found' }, { status: 404 })
	}

	const [track] = await db.select().from(schema.programAudioTracks).where(eq(schema.programAudioTracks.id, trackId)).limit(1)

	if (!track || track.programId !== id) {
		return NextResponse.json({ error: 'Audio track not found in program' }, { status: 404 })
	}

	await db.delete(schema.programAudioTracks).where(eq(schema.programAudioTracks.id, trackId))

	// Update program's updatedAt
	await db.update(schema.programs).set({ updatedAt: new Date().toISOString() }).where(eq(schema.programs.id, id))

	return NextResponse.json({ success: true })
}
