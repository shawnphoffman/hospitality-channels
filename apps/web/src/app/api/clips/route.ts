export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getDb, schema } from '@/db'
import { clipSchema } from '@hospitality-channels/content-model'
import { generateId } from '@/lib/id'

export async function GET() {
	const db = await getDb()
	const clips = await db.select().from(schema.clips)
	return NextResponse.json(clips)
}

export async function POST(request: Request) {
	const db = await getDb()
	const body = await request.json()
	const parsed = clipSchema.parse(body)
	const now = new Date().toISOString()

	const clip = {
		id: generateId(),
		templateId: parsed.templateId,
		slug: parsed.slug,
		title: parsed.title,
		themeId: parsed.themeId ?? null,
		dataJson: parsed.dataJson,
		animationProfile: parsed.animationProfile ?? null,
		defaultDurationSec: parsed.defaultDurationSec,
		createdAt: now,
		updatedAt: now,
	}

	await db.insert(schema.clips).values(clip)
	return NextResponse.json(clip, { status: 201 })
}
