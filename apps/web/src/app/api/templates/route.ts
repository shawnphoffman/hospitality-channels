export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getDb, schema } from '@/db'

/** Returns the seeded template rows, including their database ids (usable as clip templateId). */
export async function GET() {
	const db = await getDb()
	const templates = await db.select().from(schema.templates)
	return NextResponse.json(templates)
}
