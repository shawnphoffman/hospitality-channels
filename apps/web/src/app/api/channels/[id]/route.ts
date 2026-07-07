import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb, schema } from '@/db'
import { parseJsonBody } from '@/lib/api-validation'

const updateChannelSchema = z.object({
	clipId: z.string().nullable().optional(),
	pageId: z.string().nullable().optional(),
	programId: z.string().nullable().optional(),
	pushMode: z.enum(['append', 'replace']).optional(),
	enabled: z.boolean().optional(),
	description: z.string().nullable().optional(),
})

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const db = await getDb()
	const result = await parseJsonBody(request, updateChannelSchema)
	if (!result.ok) return result.response
	const body = result.data

	const [existing] = await db.select().from(schema.channelDefinitions).where(eq(schema.channelDefinitions.id, id)).limit(1)
	if (!existing) {
		return NextResponse.json({ error: 'Channel not found' }, { status: 404 })
	}

	const updates: Record<string, unknown> = {}
	if ('clipId' in body) updates.clipId = body.clipId
	else if ('pageId' in body) updates.clipId = body.pageId
	if ('programId' in body) updates.programId = body.programId
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
