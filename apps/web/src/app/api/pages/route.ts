export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getDb, schema } from '@/db'
import { pageSchema } from '@hospitality-channels/content-model'
import { generateId } from '@/lib/id'

export async function GET() {
	const db = await getDb()
	const pages = await db.select().from(schema.pages)
	return NextResponse.json(pages)
}

export async function POST(request: Request) {
	const db = await getDb()
	const body = await request.json()
	const parsed = pageSchema.parse(body)
	const now = new Date().toISOString()

	const page = {
		id: generateId(),
		templateId: parsed.templateId,
		slug: parsed.slug,
		title: parsed.title,
		roomId: parsed.roomId ?? null,
		themeId: parsed.themeId ?? null,
		dataJson: parsed.dataJson,
		animationProfile: parsed.animationProfile ?? null,
		defaultDurationSec: parsed.defaultDurationSec,
		createdAt: now,
		updatedAt: now,
	}

	await db.insert(schema.pages).values(page)
	return NextResponse.json(page, { status: 201 })
}
