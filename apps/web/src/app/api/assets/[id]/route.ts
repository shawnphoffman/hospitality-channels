export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { rm } from 'node:fs/promises'

export async function PUT(request: Request, { params }: { params: { id: string } }) {
	const db = await getDb()
	const [asset] = await db.select().from(schema.assets).where(eq(schema.assets.id, params.id)).limit(1)

	if (!asset) {
		return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
	}

	const body = await request.json()
	const updates: Record<string, unknown> = {}

	if (typeof body.name === 'string') {
		updates.name = body.name.trim() || null
	}

	if (Object.keys(updates).length === 0) {
		return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
	}

	await db.update(schema.assets).set(updates).where(eq(schema.assets.id, params.id))

	const [updated] = await db.select().from(schema.assets).where(eq(schema.assets.id, params.id)).limit(1)
	return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
	const db = await getDb()
	const [asset] = await db.select().from(schema.assets).where(eq(schema.assets.id, params.id)).limit(1)

	if (!asset) {
		return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
	}

	// Check for references that would prevent deletion
	const [programIconRef] = await db
		.select({ id: schema.programs.id })
		.from(schema.programs)
		.where(eq(schema.programs.iconAssetId, params.id))
		.limit(1)

	if (programIconRef) {
		return NextResponse.json(
			{ error: 'This asset is used as an icon by a program. Remove it from the program before deleting.' },
			{ status: 409 }
		)
	}

	const [audioTrackRef] = await db
		.select({ id: schema.programAudioTracks.id })
		.from(schema.programAudioTracks)
		.where(eq(schema.programAudioTracks.assetId, params.id))
		.limit(1)

	if (audioTrackRef) {
		return NextResponse.json(
			{ error: 'This asset is used as an audio track in a program. Remove it from the program before deleting.' },
			{ status: 409 }
		)
	}

	const [posterRef] = await db
		.select({ id: schema.channelDefinitions.id })
		.from(schema.channelDefinitions)
		.where(eq(schema.channelDefinitions.posterAssetId, params.id))
		.limit(1)

	if (posterRef) {
		return NextResponse.json(
			{ error: 'This asset is used as a channel poster. Remove it from the channel before deleting.' },
			{ status: 409 }
		)
	}

	try {
		await rm(asset.originalPath, { force: true })
		if (asset.derivedPath) await rm(asset.derivedPath, { force: true })
	} catch {
		// File may already be deleted from disk
	}

	await db.delete(schema.assets).where(eq(schema.assets.id, params.id))

	return NextResponse.json({ success: true })
}
