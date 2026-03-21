export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { rm } from 'node:fs/promises'

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
	const db = await getDb()
	const [asset] = await db.select().from(schema.assets).where(eq(schema.assets.id, params.id)).limit(1)

	if (!asset) {
		return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
	}

	try {
		await rm(asset.originalPath, { force: true })
	} catch {
		// File may already be deleted from disk
	}

	await db.delete(schema.assets).where(eq(schema.assets.id, params.id))

	return NextResponse.json({ success: true })
}
