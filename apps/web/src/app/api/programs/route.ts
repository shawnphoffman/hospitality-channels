export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getDb, schema } from '@/db'
import { programSchema } from '@hospitality-channels/content-model'
import { generateId } from '@/lib/id'

export async function GET() {
	const db = await getDb()
	const programs = await db.select().from(schema.programs)

	// Gather counts and computed durations for each program
	const allClips = await db.select().from(schema.programClips)
	const allTracks = await db.select().from(schema.programAudioTracks)

	const result = programs.map(p => {
		const clips = allClips.filter(c => c.programId === p.id)
		const tracks = allTracks.filter(t => t.programId === p.id)
		const audioDuration = tracks.reduce((sum, t) => sum + (t.durationSec ?? 0), 0)
		const computedDuration = p.durationMode === 'manual' ? (p.manualDurationSec ?? 0) : audioDuration
		const perClipDuration = clips.length > 0 ? computedDuration / clips.length : 0

		return {
			...p,
			clipCount: clips.length,
			audioTrackCount: tracks.length,
			computedDuration,
			perClipDuration,
		}
	})

	return NextResponse.json(result)
}

export async function POST(request: Request) {
	const db = await getDb()
	const body = await request.json()
	const parsed = programSchema.parse(body)
	const now = new Date().toISOString()

	const program = {
		id: generateId(),
		title: parsed.title,
		slug: parsed.slug,
		description: parsed.description ?? null,
		summary: parsed.summary ?? null,
		iconAssetId: parsed.iconAssetId ?? null,
		durationMode: parsed.durationMode,
		manualDurationSec: parsed.manualDurationSec ?? null,
		createdAt: now,
		updatedAt: now,
	}

	await db.insert(schema.programs).values(program)
	return NextResponse.json(program, { status: 201 })
}
