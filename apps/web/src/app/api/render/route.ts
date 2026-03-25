export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { generateId } from '@/lib/id'

export async function POST(request: Request) {
	const db = await getDb()
	const body = await request.json()
	const clipId = body.clipId ?? body.pageId
	const { durationSec } = body as {
		durationSec?: number
	}

	if (!clipId) {
		return NextResponse.json({ error: 'clipId is required' }, { status: 400 })
	}

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
