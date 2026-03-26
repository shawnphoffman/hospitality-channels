import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'

export const dynamic = 'force-dynamic'

function generateId(): string {
	return randomBytes(12).toString('hex')
}

export async function GET() {
	const db = await getDb()
	const rows = await db.select().from(schema.settings)
	const result: Record<string, string> = {}
	for (const row of rows) {
		if (row.value !== null) {
			result[row.key] = row.value
		}
	}
	return NextResponse.json(result)
}

export async function PUT(request: Request) {
	const db = await getDb()
	const body = (await request.json()) as Record<string, string>

	const now = new Date().toISOString()
	for (const [key, value] of Object.entries(body)) {
		const [existing] = await db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1)
		if (existing) {
			await db.update(schema.settings).set({ value, updatedAt: now }).where(eq(schema.settings.key, key))
		} else {
			await db.insert(schema.settings).values({ key, value, updatedAt: now })
		}
	}

	// Sync the "Tunarr" publish profile based on settings
	const tunarrUrl = body.tunarr_url ?? ''
	const tunarrMediaPath = body.tunarr_media_path ?? ''
	const [existingTunarrProfile] = await db.select().from(schema.publishProfiles).where(eq(schema.publishProfiles.name, 'Tunarr')).limit(1)

	if (tunarrUrl && tunarrMediaPath) {
		// Upsert the Tunarr profile
		if (existingTunarrProfile) {
			await db
				.update(schema.publishProfiles)
				.set({ exportPath: tunarrMediaPath })
				.where(eq(schema.publishProfiles.id, existingTunarrProfile.id))
		} else {
			await db.insert(schema.publishProfiles).values({
				id: generateId(),
				name: 'Tunarr',
				exportPath: tunarrMediaPath,
				outputFormat: 'mp4',
				lineupType: 'main',
				fileNamingPattern: '{title}-{pageId}.mp4',
			})
		}
	} else if (existingTunarrProfile) {
		// Remove Tunarr profile if Tunarr is unconfigured (only if no artifacts reference it)
		const [referencedArtifact] = await db
			.select({ id: schema.publishedArtifacts.id })
			.from(schema.publishedArtifacts)
			.where(eq(schema.publishedArtifacts.publishProfileId, existingTunarrProfile.id))
			.limit(1)
		if (!referencedArtifact) {
			await db.delete(schema.publishProfiles).where(eq(schema.publishProfiles.id, existingTunarrProfile.id))
		}
	}

	return NextResponse.json({ success: true })
}
