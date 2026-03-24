import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { getChannelProgramming } from '@hospitality-channels/publish'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ channelId: string }> }) {
	const { channelId } = await params
	const db = await getDb()
	const [setting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_url')).limit(1)

	if (!setting?.value) {
		return NextResponse.json({ error: 'Tunarr URL not configured' }, { status: 400 })
	}

	try {
		const programming = await getChannelProgramming(setting.value, channelId)
		return NextResponse.json(programming)
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		return NextResponse.json({ error: `Failed to fetch programming: ${msg}` }, { status: 502 })
	}
}
