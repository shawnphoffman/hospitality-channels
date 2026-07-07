export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb, schema } from '@/db'
import { generateId } from '@/lib/id'
import { parseJsonBody } from '@/lib/api-validation'

const createTemplateSchema = z.object({
	name: z.string().min(1),
	description: z.string().nullable().optional(),
	layoutJson: z.unknown().optional(),
})

export async function GET() {
	const db = await getDb()
	const all = await db.select().from(schema.templates).where(eq(schema.templates.type, 'composable'))
	return NextResponse.json(all)
}

export async function POST(request: Request) {
	const db = await getDb()
	const result = await parseJsonBody(request, createTemplateSchema)
	if (!result.ok) return result.response
	const { name, description, layoutJson } = result.data

	const slug = name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/(^-|-$)/g, '')

	const template = {
		id: generateId(),
		slug: `custom-${slug}-${Date.now().toString(36)}`,
		name,
		description: description || null,
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
