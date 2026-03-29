export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { createReadStream } from 'node:fs'
import { access, stat } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { getDb, schema } from '@/db'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params
	const db = await getDb()

	const [artifact] = await db.select().from(schema.publishedArtifacts).where(eq(schema.publishedArtifacts.id, id)).limit(1)

	if (!artifact) {
		return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
	}

	// Check that the profile allows downloads
	const [profile] = await db.select().from(schema.publishProfiles).where(eq(schema.publishProfiles.id, artifact.publishProfileId)).limit(1)

	if (!profile?.allowDownload) {
		return NextResponse.json({ error: 'Downloads not enabled for this profile' }, { status: 403 })
	}

	const filePath = artifact.outputPath

	try {
		await access(filePath)
	} catch {
		return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
	}

	const fileStat = await stat(filePath)
	const filename = path.basename(filePath)
	const stream = createReadStream(filePath)
	const webStream = Readable.toWeb(stream) as ReadableStream

	return new Response(webStream, {
		headers: {
			'Content-Type': 'video/mp4',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Content-Length': String(fileStat.size),
		},
	})
}
