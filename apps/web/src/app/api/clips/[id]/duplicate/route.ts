export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { generateId } from '@/lib/id'

export async function POST(_request: Request, { params }: { params: { id: string } }) {
	const db = await getDb()
	const [existing] = await db.select().from(schema.clips).where(eq(schema.clips.id, params.id)).limit(1)

	if (!existing) {
		return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
	}

	const now = new Date().toISOString()
	const newSlug = `${existing.slug}-copy`

	const duplicate = {
		id: generateId(),
		templateId: existing.templateId,
		slug: newSlug,
		title: `${existing.title} (Copy)`,
		themeId: existing.themeId,
		dataJson: existing.dataJson,
		animationProfile: existing.animationProfile,
		defaultDurationSec: existing.defaultDurationSec,
		createdAt: now,
		updatedAt: now,
	}

	await db.insert(schema.clips).values(duplicate)

	return NextResponse.json(duplicate, { status: 201 })
}
