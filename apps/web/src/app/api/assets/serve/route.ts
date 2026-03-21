export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { readFile, access } from 'node:fs/promises'
import path from 'node:path'
import { PATHS } from '@hospitality-channels/common'

const MIME_TYPES: Record<string, string> = {
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.png': 'image/png',
	'.webp': 'image/webp',
	'.gif': 'image/gif',
	'.svg': 'image/svg+xml',
	'.avif': 'image/avif',
	'.mp4': 'video/mp4',
	'.webm': 'video/webm',
	'.mov': 'video/quicktime',
}

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url)
	const filePath = searchParams.get('path')

	if (!filePath) {
		return NextResponse.json({ error: 'path parameter required' }, { status: 400 })
	}

	// Prevent directory traversal — file must be within the assets directory
	const resolved = path.resolve(filePath)
	const assetsDir = path.resolve(PATHS.assets)
	if (!resolved.startsWith(assetsDir)) {
		return NextResponse.json({ error: 'Access denied' }, { status: 403 })
	}

	try {
		await access(resolved)
	} catch {
		return NextResponse.json({ error: 'File not found' }, { status: 404 })
	}

	const ext = path.extname(resolved).toLowerCase()
	const contentType = MIME_TYPES[ext] ?? 'application/octet-stream'
	const data = await readFile(resolved)

	return new NextResponse(data, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=31536000, immutable',
		},
	})
}
