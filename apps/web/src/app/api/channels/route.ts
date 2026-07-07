import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb, schema } from '@/db'
import { parseJsonBody } from '@/lib/api-validation'

export const dynamic = 'force-dynamic'

const createChannelSchema = z.object({
	tunarrChannelId: z.string().min(1),
	channelNumber: z.number(),
	channelName: z.string().min(1),
	clipId: z.string().nullable().optional(),
	pageId: z.string().nullable().optional(),
	programId: z.string().nullable().optional(),
	pushMode: z.enum(['append', 'replace']).optional(),
})

function generateId(): string {
	return randomBytes(12).toString('hex')
}

export async function GET() {
	const db = await getDb()
	const channels = await db.select().from(schema.channelDefinitions)
	const clips = await db.select({ id: schema.clips.id, title: schema.clips.title }).from(schema.clips)
	const programs = await db.select({ id: schema.programs.id, title: schema.programs.title }).from(schema.programs)

	const result = channels.map(ch => {
		const clip = ch.clipId ? clips.find(p => p.id === ch.clipId) : null
		const program = ch.programId ? programs.find(p => p.id === ch.programId) : null
		return {
			...ch,
			clipTitle: clip?.title ?? null,
			programTitle: program?.title ?? null,
		}
	})

	return NextResponse.json(result)
}

export async function POST(request: Request) {
	const db = await getDb()
	const result = await parseJsonBody(request, createChannelSchema)
	if (!result.ok) return result.response
	const body = result.data

	// Check for duplicate
	const existing = await db
		.select()
		.from(schema.channelDefinitions)
		.where(eq(schema.channelDefinitions.tunarrChannelId, body.tunarrChannelId))
		.limit(1)
	if (existing.length > 0) {
		return NextResponse.json({ error: 'Channel already managed' }, { status: 409 })
	}

	const clipId = body.clipId ?? body.pageId ?? null
	const programId = body.programId ?? null

	const id = generateId()
	await db.insert(schema.channelDefinitions).values({
		id,
		tunarrChannelId: body.tunarrChannelId,
		channelNumber: body.channelNumber,
		channelName: body.channelName,
		clipId,
		programId,
		pushMode: body.pushMode ?? 'replace',
		enabled: true,
	})

	const [created] = await db.select().from(schema.channelDefinitions).where(eq(schema.channelDefinitions.id, id)).limit(1)
	return NextResponse.json(created, { status: 201 })
}
