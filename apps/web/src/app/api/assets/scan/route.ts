export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getDb, schema } from '@/db'
import { generateId } from '@/lib/id'
import { PATHS } from '@hospitality-channels/common'
import { readdir, stat, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { eq } from 'drizzle-orm'

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif'])
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a', '.wma'])
const SUPPORTED_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...AUDIO_EXTENSIONS, '.mp4', '.webm', '.mov'])

function classifyAssetType(filename: string): 'photo' | 'logo' | 'background' | 'video' | 'audio' | 'other' {
	const ext = path.extname(filename).toLowerCase()
	if (['.mp4', '.webm', '.mov'].includes(ext)) return 'video'
	if (AUDIO_EXTENSIONS.has(ext)) return 'audio'
	if (IMAGE_EXTENSIONS.has(ext)) return 'photo'
	return 'other'
}

export async function POST() {
	const db = await getDb()
	const assetsDir = path.resolve(PATHS.assets)

	await mkdir(assetsDir, { recursive: true })

	let entries: string[]
	try {
		entries = await readdir(assetsDir)
	} catch {
		return NextResponse.json({
			added: 0,
			message: 'Assets directory not found',
		})
	}

	const existing = await db.select({ originalPath: schema.assets.originalPath }).from(schema.assets)
	const existingPaths = new Set(existing.map(a => a.originalPath))

	let added = 0

	for (const entry of entries) {
		const ext = path.extname(entry).toLowerCase()
		if (!SUPPORTED_EXTENSIONS.has(ext)) continue

		const filePath = path.join(assetsDir, entry)

		try {
			const s = await stat(filePath)
			if (!s.isFile()) continue
		} catch {
			continue
		}

		if (existingPaths.has(filePath)) continue

		const assetType = classifyAssetType(entry)
		const id = generateId()

		await db.insert(schema.assets).values({
			id,
			type: assetType,
			originalPath: filePath,
			derivedPath: null,
			width: null,
			height: null,
			duration: null,
			tags: null,
			checksum: null,
		})

		added++
	}

	return NextResponse.json({ added, message: `Found ${added} new asset(s)` })
}
