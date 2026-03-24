import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'

export const dynamic = 'force-dynamic'

function generateId(): string {
	return randomBytes(12).toString('hex')
}

export async function GET() {
	const db = await getDb()
	const channels = await db.select().from(schema.channelDefinitions)
	const pages = await db.select({ id: schema.pages.id, title: schema.pages.title }).from(schema.pages)

	const result = channels.map(ch => {
		const page = ch.pageId ? pages.find(p => p.id === ch.pageId) : null
		return {
			...ch,
			pageTitle: page?.title ?? null,
		}
	})

	return NextResponse.json(result)
}

export async function POST(request: Request) {
	const db = await getDb()
	const body = (await request.json()) as {
		tunarrChannelId: string
		channelNumber: number
		channelName: string
		pageId?: string
		pushMode?: 'append' | 'replace'
	}

	if (!body.tunarrChannelId || !body.channelName) {
		return NextResponse.json({ error: 'tunarrChannelId and channelName are required' }, { status: 400 })
	}

	// Check for duplicate
	const existing = await db
		.select()
		.from(schema.channelDefinitions)
		.where(eq(schema.channelDefinitions.tunarrChannelId, body.tunarrChannelId))
		.limit(1)
	if (existing.length > 0) {
		return NextResponse.json({ error: 'Channel already managed' }, { status: 409 })
	}

	const id = generateId()
	await db.insert(schema.channelDefinitions).values({
		id,
		tunarrChannelId: body.tunarrChannelId,
		channelNumber: body.channelNumber,
		channelName: body.channelName,
		pageId: body.pageId ?? null,
		pushMode: body.pushMode ?? 'replace',
		enabled: true,
	})

	const [created] = await db.select().from(schema.channelDefinitions).where(eq(schema.channelDefinitions.id, id)).limit(1)
	return NextResponse.json(created, { status: 201 })
}
