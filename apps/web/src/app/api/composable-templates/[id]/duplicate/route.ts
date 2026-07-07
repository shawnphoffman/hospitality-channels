export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { generateId } from '@/lib/id'

export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
	const params = await props.params
	const db = await getDb()

	const [existing] = await db.select().from(schema.templates).where(eq(schema.templates.id, params.id)).limit(1)
	if (!existing) {
		return NextResponse.json({ error: 'Template not found' }, { status: 404 })
	}
	// Built-in templates render registry scenes keyed by their exact slug; a
	// copy would have no scene behind it, so only composable layouts duplicate.
	if (existing.type !== 'composable') {
		return NextResponse.json({ error: 'Only custom templates can be duplicated' }, { status: 400 })
	}

	const name = `${existing.name} (Copy)`
	const slugBase = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '')

	const duplicate = {
		...existing,
		id: generateId(),
		// templates.slug is unique; suffix matches how the create route builds slugs
		slug: `custom-${slugBase}-${Date.now().toString(36)}`,
		name,
	}
	await db.insert(schema.templates).values(duplicate)

	return NextResponse.json(duplicate, { status: 201 })
}
