export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq, desc, and } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { generateId } from '@/lib/id'

export async function POST(request: Request) {
	const db = await getDb()
	const body = await request.json()
	const clipId = body.clipId ?? body.pageId
	const { profileId } = body as { profileId: string }

	if (!clipId || !profileId) {
		return NextResponse.json({ error: 'clipId and profileId are required' }, { status: 400 })
	}

	const [clip] = await db.select().from(schema.clips).where(eq(schema.clips.id, clipId)).limit(1)

	if (!clip) {
		return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
	}

	const [profile] = await db.select().from(schema.publishProfiles).where(eq(schema.publishProfiles.id, profileId)).limit(1)

	if (!profile) {
		return NextResponse.json({ error: 'Publish profile not found' }, { status: 404 })
	}

	const [latestRender] = await db
		.select()
		.from(schema.jobs)
		.where(and(eq(schema.jobs.clipId, clipId), eq(schema.jobs.type, 'render'), eq(schema.jobs.status, 'completed')))
		.orderBy(desc(schema.jobs.createdAt))
		.limit(1)

	if (!latestRender?.outputPath) {
		return NextResponse.json(
			{
				error: 'No completed render found for this clip. Render the clip first.',
			},
			{ status: 400 }
		)
	}

	const job = {
		id: generateId(),
		type: 'publish',
		clipId,
		profileId,
		payload: {
			sourcePath: latestRender.outputPath,
			clipTitle: clip.title,
			clipSlug: clip.slug,
			durationSec: clip.defaultDurationSec ?? 30,
			exportPath: profile.exportPath,
			fileNamingPattern: profile.fileNamingPattern,
			outputFormat: profile.outputFormat,
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
