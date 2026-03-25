import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const db = await getDb()
	const body = (await request.json()) as {
		clipId?: string | null
		pageId?: string | null
		pushMode?: 'append' | 'replace'
		enabled?: boolean
		description?: string | null
	}

	const [existing] = await db.select().from(schema.channelDefinitions).where(eq(schema.channelDefinitions.id, id)).limit(1)
	if (!existing) {
		return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
	}

	const updates: Record<string, unknown> = {}
	if ('clipId' in body) updates.clipId = body.clipId
	else if ('pageId' in body) updates.clipId = body.pageId
	if ('pushMode' in body) updates.pushMode = body.pushMode
	if ('enabled' in body) updates.enabled = body.enabled
	if ('description' in body) updates.description = body.description

	if (Object.keys(updates).length > 0) {
		await db.update(schema.channelDefinitions).set(updates).where(eq(schema.channelDefinitions.id, id))
	}

	const [updated] = await db.select().from(schema.channelDefinitions).where(eq(schema.channelDefinitions.id, id)).limit(1)
	return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const db = await getDb()

	const [existing] = await db.select().from(schema.channelDefinitions).where(eq(schema.channelDefinitions.id, id)).limit(1)
	if (!existing) {
		return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
	}

	await db.delete(schema.channelDefinitions).where(eq(schema.channelDefinitions.id, id))
	return NextResponse.json({ success: true })
}
