export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { generateId } from '@/lib/id'

export async function POST(request: Request) {
	const db = await getDb()
	const body = await request.json()
	const { pageId, profileId, durationSec } = body as {
		pageId: string
		profileId: string
		durationSec?: number
	}

	if (!pageId || !profileId) {
		return NextResponse.json({ error: 'pageId and profileId are required' }, { status: 400 })
	}

	const [page] = await db.select().from(schema.pages).where(eq(schema.pages.id, pageId)).limit(1)
	if (!page) {
		return NextResponse.json({ error: 'Page not found' }, { status: 404 })
	}

	const [profile] = await db.select().from(schema.publishProfiles).where(eq(schema.publishProfiles.id, profileId)).limit(1)
	if (!profile) {
		return NextResponse.json({ error: 'Publish profile not found' }, { status: 404 })
	}

	const job = {
		id: generateId(),
		type: 'render-publish',
		pageId,
		profileId,
		payload: {
			durationSec: durationSec ?? page.defaultDurationSec ?? 30,
			pageTitle: page.title,
			pageSlug: page.slug,
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
