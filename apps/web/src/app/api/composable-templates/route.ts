export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { generateId } from '@/lib/id'

export async function GET() {
	const db = await getDb()
	const all = await db.select().from(schema.templates).where(eq(schema.templates.type, 'composable'))
	return NextResponse.json(all)
}

export async function POST(request: Request) {
	const db = await getDb()
	const body = await request.json()
	const { name, layoutJson } = body

	if (!name || typeof name !== 'string') {
		return NextResponse.json({ error: 'Name is required' }, { status: 400 })
	}

	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '')

	const template = {
		id: generateId(),
		slug: `custom-${slug}-${Date.now().toString(36)}`,
		name,
		description: null,
		category: 'custom',
		schema: null,
		previewImage: null,
		version: 1,
		status: 'active' as const,
		type: 'composable',
		layoutJson: layoutJson ?? null,
	}

	await db.insert(schema.templates).values(template)
	return NextResponse.json(template, { status: 201 })
}
