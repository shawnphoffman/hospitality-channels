export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { execFile } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { getDb, schema } from '@/db'
import { generateId } from '@/lib/id'
import { PATHS } from '@hospitality-channels/common'
import { extractCoverArt } from '@/lib/cover-art'
import { extractVideoThumbnail } from '@/lib/video-thumbnail'

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

const DEFAULT_MAX_UPLOAD_BYTES = 1024 * 1024 * 1024 // 1 GiB

function getMaxUploadBytes(): number {
	const configured = Number(process.env.MAX_UPLOAD_BYTES)
	return Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_MAX_UPLOAD_BYTES
}

function bytesMatch(buffer: Buffer, bytes: number[], offset = 0): boolean {
	if (buffer.length < offset + bytes.length) return false
	return bytes.every((b, i) => buffer[offset + i] === b)
}

function asciiMatch(buffer: Buffer, text: string, offset = 0): boolean {
	return bytesMatch(
		buffer,
		[...text].map(c => c.charCodeAt(0)),
		offset
	)
}

const isJpeg = (b: Buffer) => bytesMatch(b, [0xff, 0xd8, 0xff])
const isFtyp = (b: Buffer) => asciiMatch(b, 'ftyp', 4)
// QuickTime files may start with atoms other than ftyp
const isQuickTime = (b: Buffer) => ['ftyp', 'moov', 'mdat', 'free', 'wide', 'skip', 'pnot'].some(atom => asciiMatch(b, atom, 4))
const isEbml = (b: Buffer) => bytesMatch(b, [0x1a, 0x45, 0xdf, 0xa3])

// Extensions without a reliable signature (.aac, .wma) are accepted as-is
const MAGIC_CHECKS: Record<string, (buffer: Buffer) => boolean> = {
	'.png': b => bytesMatch(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
	'.jpg': isJpeg,
	'.jpeg': isJpeg,
	'.gif': b => asciiMatch(b, 'GIF8'),
	'.webp': b => asciiMatch(b, 'RIFF') && asciiMatch(b, 'WEBP', 8),
	'.svg': b =>
		b
			.subarray(0, 256)
			.toString('utf8')
			.replace(/^\uFEFF/, '')
			.trimStart()
			.startsWith('<'),
	'.avif': isFtyp,
	'.mp3': b => asciiMatch(b, 'ID3') || (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0),
	'.wav': b => asciiMatch(b, 'RIFF') && asciiMatch(b, 'WAVE', 8),
	'.flac': b => asciiMatch(b, 'fLaC'),
	'.ogg': b => asciiMatch(b, 'OggS'),
	'.m4a': isFtyp,
	'.mp4': isFtyp,
	'.mov': isQuickTime,
	'.webm': isEbml,
	'.mkv': isEbml,
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

	const maxUploadBytes = getMaxUploadBytes()
	if (file.size > maxUploadBytes) {
		return NextResponse.json(
			{ error: `File is too large (${file.size} bytes). Maximum upload size is ${maxUploadBytes} bytes.` },
			{ status: 413 }
		)
	}

	const assetType = classifyAssetType(file.name)
	const ext = path.extname(file.name)
	const baseName = path.basename(file.name, ext).replace(/[^a-zA-Z0-9._-]/g, '_')
	const id = generateId()
	const filename = `${baseName}-${id}${ext}`

	const buffer = Buffer.from(await file.arrayBuffer())

	const magicCheck = MAGIC_CHECKS[ext.toLowerCase()]
	if (magicCheck && !magicCheck(buffer)) {
		return NextResponse.json({ error: `File content does not match the ${ext} extension. Upload rejected.` }, { status: 400 })
	}

	const assetsDir = path.resolve(PATHS.assets)
	await mkdir(assetsDir, { recursive: true })

	const filePath = path.join(assetsDir, filename)
	await writeFile(filePath, buffer)

	// Probe media metadata
	const probe = await probeFile(filePath)

	// Extract cover art for audio files, thumbnails for video files
	let derivedPath: string | null = null
	if (assetType === 'audio') {
		derivedPath = await extractCoverArt(filePath, id)
	} else if (assetType === 'video') {
		derivedPath = await extractVideoThumbnail(filePath, id)
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
