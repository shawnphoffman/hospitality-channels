export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb, schema } from '@/db'
import { parseJsonBody } from '@/lib/api-validation'

const updateProfileSchema = z.object({
	name: z.string().optional(),
	exportPath: z.string().optional(),
	outputFormat: z.string().optional(),
	lineupType: z.string().nullable().optional(),
	fileNamingPattern: z.string().nullable().optional(),
	allowDownload: z.boolean().optional(),
})

export async function PUT(request: Request, { params }: { params: { id: string } }) {
	const db = await getDb()
	const [existing] = await db.select().from(schema.publishProfiles).where(eq(schema.publishProfiles.id, params.id)).limit(1)

	if (!existing) {
		return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
	}

	const result = await parseJsonBody(request, updateProfileSchema)
	if (!result.ok) return result.response
	const body = result.data

	await db
		.update(schema.publishProfiles)
		.set({
			name: body.name ?? existing.name,
			exportPath: body.exportPath ?? existing.exportPath,
			outputFormat: body.outputFormat ?? existing.outputFormat,
			lineupType: body.lineupType !== undefined ? body.lineupType : existing.lineupType,
			fileNamingPattern: body.fileNamingPattern !== undefined ? body.fileNamingPattern : existing.fileNamingPattern,
			allowDownload: body.allowDownload !== undefined ? body.allowDownload : existing.allowDownload,
		})
		.where(eq(schema.publishProfiles.id, params.id))

	const [updated] = await db.select().from(schema.publishProfiles).where(eq(schema.publishProfiles.id, params.id)).limit(1)

	return NextResponse.json(updated)
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
	const db = await getDb()
	const [existing] = await db.select().from(schema.publishProfiles).where(eq(schema.publishProfiles.id, params.id)).limit(1)

	if (!existing) {
		return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
	}

	// Remove referencing artifacts and jobs first to avoid FK constraint errors
	await db.delete(schema.publishedArtifacts).where(eq(schema.publishedArtifacts.publishProfileId, params.id))
	await db.delete(schema.jobs).where(eq(schema.jobs.profileId, params.id))
	await db.delete(schema.publishProfiles).where(eq(schema.publishProfiles.id, params.id))
	return NextResponse.json({ success: true })
}
