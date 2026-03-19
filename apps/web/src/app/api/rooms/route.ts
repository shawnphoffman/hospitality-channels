export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getDb, schema } from '@/db'
import { roomSchema } from '@hospitality-channels/content-model'
import { generateId } from '@/lib/id'

export async function GET() {
	const db = await getDb()
	const rooms = await db.select().from(schema.rooms)
	return NextResponse.json(rooms)
}

export async function POST(request: Request) {
	const db = await getDb()
	const body = await request.json()
	const parsed = roomSchema.parse(body)

	const room = {
		id: generateId(),
		name: parsed.name,
		slug: parsed.slug,
		defaultChannelProfileId: parsed.defaultChannelProfileId ?? null,
		defaultThemeId: parsed.defaultThemeId ?? null,
		notes: parsed.notes ?? null,
	}

	await db.insert(schema.rooms).values(room)
	return NextResponse.json(room, { status: 201 })
}
