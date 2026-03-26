export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'

export async function GET(request: Request) {
	const db = await getDb()
	const { searchParams } = new URL(request.url)
	const clipId = searchParams.get('clipId') ?? searchParams.get('pageId')

	let query = db.select().from(schema.jobs).orderBy(desc(schema.jobs.createdAt))

	if (clipId) {
		query = query.where(eq(schema.jobs.clipId, clipId)) as typeof query
	}

	const jobs = await query.limit(50)
	return NextResponse.json(jobs)
}
