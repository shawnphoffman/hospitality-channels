export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { scanMediaSource } from '@hospitality-channels/publish'

export async function POST() {
	const db = await getDb()

	const [urlSetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_url')).limit(1)
	const [sourceIdSetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_media_source_id')).limit(1)
	const [libraryIdSetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_library_id')).limit(1)

	if (!urlSetting?.value) {
		return NextResponse.json({ error: 'Tunarr URL not configured' }, { status: 400 })
	}

	if (!sourceIdSetting?.value) {
		return NextResponse.json({ error: 'Tunarr media source ID not configured' }, { status: 400 })
	}

	try {
		await scanMediaSource(urlSetting.value, sourceIdSetting.value, libraryIdSetting?.value ?? undefined)
		return NextResponse.json({ ok: true })
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		return NextResponse.json({ error: `Scan failed: ${msg}` }, { status: 502 })
	}
}
