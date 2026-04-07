export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
	const db = await getDb()
	const [template] = await db
		.select()
		.from(schema.templates)
		.where(eq(schema.templates.id, params.id))
		.limit(1)

	if (!template) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 })
	}

	return NextResponse.json(template)
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
	const db = await getDb()
	const body = await request.json()

	const [existing] = await db
		.select()
		.from(schema.templates)
		.where(eq(schema.templates.id, params.id))
		.limit(1)

	if (!existing) {
		return NextResponse.json({ error: 'Not found' }, { status: 404 })
	}

	const updates: Record<string, unknown> = {}
	if (body.name !== undefined) updates.name = body.name
	if (body.description !== undefined) updates.description = body.description
	if (body.layoutJson !== undefined) updates.layoutJson = body.layoutJson

	if (Object.keys(updates).length > 0) {
		await db.update(schema.templates).set(updates).where(eq(schema.templates.id, params.id))
	}

	const [updated] = await db
		.select()
		.from(schema.templates)
		.where(eq(schema.templates.id, params.id))
		.limit(1)

	return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
	const db = await getDb()

	// Check if any clips use this template
	const clips = await db
		.select()
		.from(schema.clips)
		.where(eq(schema.clips.templateId, params.id))
		.limit(1)

	if (clips.length > 0) {
		return NextResponse.json(
			{ error: 'Cannot delete template that has clips. Delete the clips first.' },
			{ status: 409 }
		)
	}

	await db.delete(schema.templates).where(eq(schema.templates.id, params.id))
	return NextResponse.json({ ok: true })
}
