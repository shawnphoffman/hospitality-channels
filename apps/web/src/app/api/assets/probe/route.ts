export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { execFile } from 'node:child_process'
import { access, constants } from 'node:fs/promises'
import { eq, isNull, or, and } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { extractCoverArt } from '@/lib/cover-art'
import { extractVideoThumbnail } from '@/lib/video-thumbnail'

interface ProbeResult {
	duration?: number
	width?: number
	height?: number
}

function probeFile(filePath: string): Promise<ProbeResult> {
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

/**
 * POST /api/assets/probe
 * Probes all assets with missing duration/dimensions using ffprobe and updates the database.
 * Also updates any program_audio_tracks whose durationSec is null but whose asset now has a duration.
 */
export async function POST() {
	const db = await getDb()

	// Find assets missing metadata
	const candidates = await db
		.select()
		.from(schema.assets)
		.where(or(isNull(schema.assets.duration), isNull(schema.assets.width)))

	let updated = 0
	let skipped = 0

	for (const asset of candidates) {
		// Verify file still exists
		try {
			await access(asset.originalPath, constants.R_OK)
		} catch {
			skipped++
			continue
		}

		const result = await probeFile(asset.originalPath)

		const updates: Record<string, number | null> = {}
		if (result.duration != null && asset.duration == null) {
			updates.duration = result.duration
		}
		if (result.width != null && asset.width == null) {
			updates.width = result.width
		}
		if (result.height != null && asset.height == null) {
			updates.height = result.height
		}

		if (Object.keys(updates).length > 0) {
			await db.update(schema.assets).set(updates).where(eq(schema.assets.id, asset.id))
			updated++
		}
	}

	// Extract cover art for audio assets that don't have it yet
	let coversExtracted = 0
	const audioCandidates = await db
		.select()
		.from(schema.assets)
		.where(and(eq(schema.assets.type, 'audio'), isNull(schema.assets.derivedPath)))

	for (const asset of audioCandidates) {
		try {
			await access(asset.originalPath, constants.R_OK)
		} catch {
			continue
		}
		const coverPath = await extractCoverArt(asset.originalPath, asset.id)
		if (coverPath) {
			await db.update(schema.assets).set({ derivedPath: coverPath }).where(eq(schema.assets.id, asset.id))
			coversExtracted++
		}
	}

	// Extract thumbnails for video assets that don't have them yet
	let thumbnailsExtracted = 0
	const videoCandidates = await db
		.select()
		.from(schema.assets)
		.where(and(eq(schema.assets.type, 'video'), isNull(schema.assets.derivedPath)))

	for (const asset of videoCandidates) {
		try {
			await access(asset.originalPath, constants.R_OK)
		} catch {
			continue
		}
		const thumbPath = await extractVideoThumbnail(asset.originalPath, asset.id)
		if (thumbPath) {
			await db.update(schema.assets).set({ derivedPath: thumbPath }).where(eq(schema.assets.id, asset.id))
			thumbnailsExtracted++
		}
	}

	// Backfill program_audio_tracks that reference assets with newly detected durations
	const nullDurationTracks = await db.select().from(schema.programAudioTracks).where(isNull(schema.programAudioTracks.durationSec))

	let tracksUpdated = 0
	for (const track of nullDurationTracks) {
		if (!track.assetId) continue
		const [asset] = await db.select().from(schema.assets).where(eq(schema.assets.id, track.assetId)).limit(1)
		if (asset?.duration) {
			await db.update(schema.programAudioTracks).set({ durationSec: asset.duration }).where(eq(schema.programAudioTracks.id, track.id))
			tracksUpdated++
		}
	}

	return NextResponse.json({
		assetsProbed: candidates.length,
		assetsUpdated: updated,
		assetsSkipped: skipped,
		tracksUpdated,
		coversExtracted,
		thumbnailsExtracted,
	})
}
