export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq, desc } from 'drizzle-orm'
import { getDb, schema } from '@/db'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const db = await getDb()

	const [program] = await db.select().from(schema.programs).where(eq(schema.programs.id, id)).limit(1)
	if (!program) {
		return NextResponse.json({ error: 'Program not found' }, { status: 404 })
	}

	const profiles = await db.select().from(schema.publishProfiles)

	const artifacts = await db
		.select()
		.from(schema.publishedArtifacts)
		.where(eq(schema.publishedArtifacts.programId, id))
		.orderBy(desc(schema.publishedArtifacts.publishedAt))

	// Mark older artifacts with the same output path as superseded
	const latestByPath = new Set<string>()
	const enriched = artifacts.map(a => {
		const profile = profiles.find(p => p.id === a.publishProfileId)
		const superseded = latestByPath.has(a.outputPath)
		latestByPath.add(a.outputPath)
		return {
			id: a.id,
			outputPath: a.outputPath,
			durationSec: a.durationSec,
			status: a.status,
			publishedAt: a.publishedAt,
			profileName: profile?.name ?? 'Unknown',
			superseded,
		}
	})

	return NextResponse.json(enriched)
}
