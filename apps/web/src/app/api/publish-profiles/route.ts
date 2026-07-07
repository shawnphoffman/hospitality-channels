export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getDb, schema } from '@/db'
import { generateId } from '@/lib/id'
import { parseJsonBody } from '@/lib/api-validation'

const createProfileSchema = z.object({
	name: z.string().min(1),
	exportPath: z.string().min(1),
	outputFormat: z.string().nullable().optional(),
	lineupType: z.string().nullable().optional(),
	fileNamingPattern: z.string().nullable().optional(),
	allowDownload: z.boolean().optional(),
})

export async function GET() {
	const db = await getDb()
	const profiles = await db.select().from(schema.publishProfiles)
	return NextResponse.json(profiles)
}

export async function POST(request: Request) {
	const db = await getDb()
	const result = await parseJsonBody(request, createProfileSchema)
	if (!result.ok) return result.response
	const body = result.data

	const profile = {
		id: generateId(),
		name: body.name,
		exportPath: body.exportPath,
		outputFormat: body.outputFormat || 'mp4',
		lineupType: body.lineupType || null,
		fileNamingPattern: body.fileNamingPattern || null,
		allowDownload: body.allowDownload === true,
	}

	await db.insert(schema.publishProfiles).values(profile)
	return NextResponse.json(profile, { status: 201 })
}
