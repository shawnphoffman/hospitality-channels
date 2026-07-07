export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { count } from 'drizzle-orm'
import { getDb, schema } from '@/db'

/** Lists the tag vocabulary with per-entity usage counts. */
export async function GET() {
	const db = await getDb()
	const [allTags, programCounts, clipCounts, assetCounts] = await Promise.all([
		db.select().from(schema.tags),
		db.select({ tagId: schema.programTags.tagId, n: count() }).from(schema.programTags).groupBy(schema.programTags.tagId),
		db.select({ tagId: schema.clipTags.tagId, n: count() }).from(schema.clipTags).groupBy(schema.clipTags.tagId),
		db.select({ tagId: schema.assetTags.tagId, n: count() }).from(schema.assetTags).groupBy(schema.assetTags.tagId),
	])
	const programByTag = new Map(programCounts.map(r => [r.tagId, r.n]))
	const clipByTag = new Map(clipCounts.map(r => [r.tagId, r.n]))
	const assetByTag = new Map(assetCounts.map(r => [r.tagId, r.n]))
	const result = allTags
		.map(t => ({
			id: t.id,
			name: t.name,
			programCount: programByTag.get(t.id) ?? 0,
			clipCount: clipByTag.get(t.id) ?? 0,
			assetCount: assetByTag.get(t.id) ?? 0,
		}))
		.sort(
			(a, b) => b.programCount + b.clipCount + b.assetCount - (a.programCount + a.clipCount + a.assetCount) || a.name.localeCompare(b.name)
		)
	return NextResponse.json(result)
}
