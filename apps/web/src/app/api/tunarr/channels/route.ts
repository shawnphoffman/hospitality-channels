import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { listChannels } from '@hospitality-channels/publish'

export const dynamic = 'force-dynamic'

export async function GET() {
	const db = await getDb()
	const [setting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_url')).limit(1)

	if (!setting?.value) {
		return NextResponse.json({ error: 'Tunarr URL not configured. Go to Settings to set it up.' }, { status: 400 })
	}

	try {
		const channels = await listChannels(setting.value)
		return NextResponse.json(channels)
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		return NextResponse.json({ error: `Failed to connect to Tunarr: ${msg}` }, { status: 502 })
	}
}
