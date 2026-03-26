export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq, asc } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { generateId } from '@/lib/id'

export async function POST(request: Request) {
	const db = await getDb()
	const body = await request.json()
	const clipId = body.clipId ?? body.pageId
	const { programId, durationSec } = body as {
		programId?: string
		durationSec?: number
	}

	if (!clipId && !programId) {
		return NextResponse.json({ error: 'clipId or programId is required' }, { status: 400 })
	}

	// Program render
	if (programId) {
		const [program] = await db.select().from(schema.programs).where(eq(schema.programs.id, programId)).limit(1)
		if (!program) {
			return NextResponse.json({ error: 'Program not found' }, { status: 404 })
		}

		const programClips = await db
			.select()
			.from(schema.programClips)
			.where(eq(schema.programClips.programId, programId))
			.orderBy(asc(schema.programClips.position))

		const audioTracks = await db
			.select()
			.from(schema.programAudioTracks)
			.where(eq(schema.programAudioTracks.programId, programId))
			.orderBy(asc(schema.programAudioTracks.position))

		const audioDuration = audioTracks.reduce((sum, t) => sum + (t.durationSec ?? 0), 0)
		const computedDuration = program.durationMode === 'manual' ? (program.manualDurationSec ?? 30) : audioDuration

		const job = {
			id: generateId(),
			type: 'render-program',
			clipId: null,
			programId,
			profileId: null,
			payload: {
				durationSec: durationSec ?? computedDuration,
				programTitle: program.title,
				programSlug: program.slug,
				clipIds: programClips.map(pc => pc.clipId),
				audioTracks: audioTracks.map(t => ({
					assetId: t.assetId,
					audioUrl: t.audioUrl,
					position: t.position,
					durationSec: t.durationSec,
				})),
			},
			status: 'queued',
			outputPath: null,
			error: null,
			createdAt: new Date().toISOString(),
			startedAt: null,
			completedAt: null,
		}

		await db.insert(schema.jobs).values(job)
		return NextResponse.json(job, { status: 202 })
	}

	// Clip render (existing behavior)
	const [clip] = await db.select().from(schema.clips).where(eq(schema.clips.id, clipId)).limit(1)
	if (!clip) {
		return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
	}

	const job = {
		id: generateId(),
		type: 'render',
		clipId,
		profileId: null,
		payload: {
			durationSec: durationSec ?? clip.defaultDurationSec ?? 30,
			clipTitle: clip.title,
			clipSlug: clip.slug,
		},
		status: 'queued',
		outputPath: null,
		error: null,
		createdAt: new Date().toISOString(),
		startedAt: null,
		completedAt: null,
	}

	await db.insert(schema.jobs).values(job)

	return NextResponse.json(job, { status: 202 })
}
