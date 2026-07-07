export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb, schema } from '@/db'
import { generateId } from '@/lib/id'

const duplicateSchema = z.object({
	/** Also clone the referenced clips instead of sharing them with the original program. */
	includeClips: z.boolean().optional(),
})

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
	const params = await props.params
	const db = await getDb()

	// The body is optional; an empty request duplicates with shared clips
	let includeClips = false
	const raw = await request.text()
	if (raw.trim()) {
		let parsedJson: unknown
		try {
			parsedJson = JSON.parse(raw)
		} catch {
			return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
		}
		const parsed = duplicateSchema.safeParse(parsedJson)
		if (!parsed.success) {
			return NextResponse.json({ error: 'Validation failed' }, { status: 400 })
		}
		includeClips = parsed.data.includeClips ?? false
	}

	const [existing] = await db.select().from(schema.programs).where(eq(schema.programs.id, params.id)).limit(1)
	if (!existing) {
		return NextResponse.json({ error: 'Program not found' }, { status: 404 })
	}

	const memberships = await db
		.select()
		.from(schema.programClips)
		.where(eq(schema.programClips.programId, params.id))
		.orderBy(asc(schema.programClips.position))
	const tracks = await db
		.select()
		.from(schema.programAudioTracks)
		.where(eq(schema.programAudioTracks.programId, params.id))
		.orderBy(asc(schema.programAudioTracks.position))

	const now = new Date().toISOString()

	// Optionally clone each referenced clip so the copy is fully independent
	const clipIdMap = new Map<string, string>()
	if (includeClips) {
		for (const membership of memberships) {
			const [clip] = await db.select().from(schema.clips).where(eq(schema.clips.id, membership.clipId)).limit(1)
			if (!clip) continue
			const newClipId = generateId()
			await db.insert(schema.clips).values({
				...clip,
				id: newClipId,
				slug: `${clip.slug}-copy`,
				title: `${clip.title} (Copy)`,
				createdAt: now,
				updatedAt: now,
			})
			clipIdMap.set(membership.clipId, newClipId)
		}
	}

	const duplicate = {
		...existing,
		id: generateId(),
		title: `${existing.title} (Copy)`,
		slug: `${existing.slug}-copy`,
		createdAt: now,
		updatedAt: now,
	}
	await db.insert(schema.programs).values(duplicate)

	for (const membership of memberships) {
		await db.insert(schema.programClips).values({
			id: generateId(),
			programId: duplicate.id,
			clipId: clipIdMap.get(membership.clipId) ?? membership.clipId,
			position: membership.position,
		})
	}

	for (const track of tracks) {
		await db.insert(schema.programAudioTracks).values({
			id: generateId(),
			programId: duplicate.id,
			assetId: track.assetId,
			audioUrl: track.audioUrl,
			position: track.position,
			durationSec: track.durationSec,
		})
	}

	return NextResponse.json(duplicate, { status: 201 })
}
