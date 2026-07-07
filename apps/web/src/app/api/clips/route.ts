export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { clipSchema } from '@hospitality-channels/content-model'
import { generateId } from '@/lib/id'
import { parseJsonBody } from '@/lib/api-validation'

export async function GET() {
	const db = await getDb()
	const clips = await db.select().from(schema.clips)
	return NextResponse.json(clips)
}

export async function POST(request: Request) {
	const db = await getDb()
	const result = await parseJsonBody(request, clipSchema)
	if (!result.ok) return result.response
	const parsed = result.data

	const [template] = await db
		.select({ id: schema.templates.id })
		.from(schema.templates)
		.where(eq(schema.templates.id, parsed.templateId))
		.limit(1)
	if (!template) {
		return NextResponse.json({ error: `Unknown templateId: ${parsed.templateId}` }, { status: 400 })
	}

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
