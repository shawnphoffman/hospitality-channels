export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
	const db = await getDb()
	const [clip] = await db.select().from(schema.clips).where(eq(schema.clips.id, params.id)).limit(1)

	if (!clip) {
		return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
	}

	return NextResponse.json(clip)
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
	const db = await getDb()
	const [existing] = await db.select().from(schema.clips).where(eq(schema.clips.id, params.id)).limit(1)

	if (!existing) {
		return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
	}

	const body = await request.json()
	const now = new Date().toISOString()

	await db
		.update(schema.clips)
		.set({
			title: body.title ?? existing.title,
			slug: body.slug ?? existing.slug,
			themeId: body.themeId !== undefined ? body.themeId : existing.themeId,
			dataJson: body.dataJson ?? existing.dataJson,
			animationProfile: body.animationProfile !== undefined ? body.animationProfile : existing.animationProfile,
			defaultDurationSec: body.defaultDurationSec ?? existing.defaultDurationSec,
			updatedAt: now,
		})
		.where(eq(schema.clips.id, params.id))

	const [updated] = await db.select().from(schema.clips).where(eq(schema.clips.id, params.id)).limit(1)

	return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
	const db = await getDb()
	const [existing] = await db.select().from(schema.clips).where(eq(schema.clips.id, params.id)).limit(1)

	if (!existing) {
		return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
	}

	// Check for references that would prevent deletion
	const [programRef] = await db
		.select({ id: schema.programClips.id })
		.from(schema.programClips)
		.where(eq(schema.programClips.clipId, params.id))
		.limit(1)

	if (programRef) {
		return NextResponse.json(
			{ error: 'This clip is used by one or more programs. Remove it from all programs before deleting.' },
			{ status: 409 }
		)
	}

	// Clean up referencing records
	await db.delete(schema.publishedArtifacts).where(eq(schema.publishedArtifacts.clipId, params.id))
	await db.delete(schema.jobs).where(eq(schema.jobs.clipId, params.id))
	await db.delete(schema.clips).where(eq(schema.clips.id, params.id))

	return NextResponse.json({ success: true })
}
