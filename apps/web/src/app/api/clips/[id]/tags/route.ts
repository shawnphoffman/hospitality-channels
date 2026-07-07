export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb, schema } from '@/db'
import { parseJsonBody } from '@/lib/api-validation'
import { setEntityTags } from '@/lib/tags'

const tagsSchema = z.object({ tags: z.array(z.string()) })

export async function PUT(request: Request, props: { params: Promise<{ id: string }> }) {
	const params = await props.params
	const db = await getDb()
	const result = await parseJsonBody(request, tagsSchema)
	if (!result.ok) return result.response

	const [clip] = await db.select({ id: schema.clips.id }).from(schema.clips).where(eq(schema.clips.id, params.id)).limit(1)
	if (!clip) {
		return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
	}

	const tags = await setEntityTags(db, 'clip', params.id, result.data.tags)
	return NextResponse.json({ tags })
}
