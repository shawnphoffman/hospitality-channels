export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getDb, schema } from '@/db'
import { generateId } from '@/lib/id'
import { PATHS } from '@hospitality-channels/common'
import { extractCoverArt } from '@/lib/cover-art'

function probeFile(filePath: string): Promise<{ duration?: number; width?: number; height?: number }> {
	return new Promise(resolve => {
		execFile(
			'ffprobe',
			['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath],
			{ timeout: 15000 },
			(err, stdout) => {
				if (err) {
					resolve({})
					return
				}
				try {
					const info = JSON.parse(stdout)
					const duration = info.format?.duration ? parseFloat(info.format.duration) : undefined
					const videoStream = info.streams?.find((s: { codec_type: string }) => s.codec_type === 'video')
					const width = videoStream?.width ?? undefined
					const height = videoStream?.height ?? undefined
					resolve({ duration, width, height })
				} catch {
					resolve({})
				}
			}
		)
	})
}

export async function GET() {
	const db = await getDb()
	const assets = await db.select().from(schema.assets)
	return NextResponse.json(assets)
}

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif'])
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a', '.wma'])

function classifyAssetType(filename: string): 'photo' | 'logo' | 'background' | 'video' | 'audio' | 'other' {
	const ext = path.extname(filename).toLowerCase()
	if (['.mp4', '.webm', '.mov'].includes(ext)) return 'video'
	if (AUDIO_EXTENSIONS.has(ext)) return 'audio'
	if (IMAGE_EXTENSIONS.has(ext)) return 'photo'
	return 'other'
}

export async function POST(request: Request) {
	const contentType = request.headers.get('content-type') ?? ''

	if (!contentType.includes('multipart/form-data')) {
		return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 })
	}

	const formData = await request.formData()
	const file = formData.get('file') as File | null

	if (!file) {
		return NextResponse.json({ error: 'No file provided' }, { status: 400 })
	}

	const assetType = classifyAssetType(file.name)
	const ext = path.extname(file.name)
	const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9._-]/g, '_')
	const id = generateId()
	const filename = `${baseName}-${id}${ext}`

	const assetsDir = path.resolve(PATHS.assets)
	await mkdir(assetsDir, { recursive: true })

	const filePath = path.join(assetsDir, filename)
	const buffer = Buffer.from(await file.arrayBuffer())
	await writeFile(filePath, buffer)

	// Probe media metadata
	const probe = await probeFile(filePath)

	// Extract cover art for audio files
	let derivedPath: string | null = null
	if (assetType === 'audio') {
		derivedPath = await extractCoverArt(filePath, id)
	}

	const db = await getDb()
	const asset = {
		id,
		type: assetType,
		originalPath: filePath,
		derivedPath,
		width: probe.width ?? null,
		height: probe.height ?? null,
		duration: probe.duration ?? null,
		tags: null,
		checksum: null,
	}

	await db.insert(schema.assets).values(asset)

	return NextResponse.json(asset, { status: 201 })
}
