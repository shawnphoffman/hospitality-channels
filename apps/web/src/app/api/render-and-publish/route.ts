export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq, asc } from 'drizzle-orm'
import { z } from 'zod'
import { getDb, schema } from '@/db'
import { generateId } from '@/lib/id'
import { parseJsonBody } from '@/lib/api-validation'

const renderAndPublishSchema = z.object({
	profileId: z.string().min(1),
	clipId: z.string().nullable().optional(),
	pageId: z.string().nullable().optional(),
	programId: z.string().nullable().optional(),
	durationSec: z.number().optional(),
	// Tunarr channel id; when set, the worker pushes the artifact to this channel after publishing (programs only)
	pushChannelId: z.string().nullable().optional(),
	pushMode: z.enum(['append', 'replace']).nullable().optional(),
})

export async function POST(request: Request) {
	const db = await getDb()
	const result = await parseJsonBody(request, renderAndPublishSchema)
	if (!result.ok) return result.response
	const body = result.data
	const clipId = body.clipId ?? body.pageId
	const { profileId, programId, durationSec } = body

	if (!clipId && !programId) {
		return NextResponse.json({ error: 'clipId or programId is required' }, { status: 400 })
	}

	const [profile] = await db.select().from(schema.publishProfiles).where(eq(schema.publishProfiles.id, profileId)).limit(1)
	if (!profile) {
		return NextResponse.json({ error: 'Publish profile not found' }, { status: 404 })
	}

	// Check if .nfo generation is enabled
	const [nfoSetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'generate_nfo')).limit(1)
	const generateNfo = nfoSetting?.value === 'true'

	// Channel pushes must render/export through the profile designated as the
	// Tunarr export location in Settings, so the file lands in the directory
	// Tunarr indexes, regardless of which profile the caller passed.
	let effectiveProfile = profile
	if (body.pushChannelId) {
		const [designated] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_publish_profile_id')).limit(1)
		if (designated?.value) {
			const [tunarrProfile] = await db.select().from(schema.publishProfiles).where(eq(schema.publishProfiles.id, designated.value)).limit(1)
			if (tunarrProfile) effectiveProfile = tunarrProfile
		}
	}

	// Program render-publish
	if (programId) {
		const [program] = await db.select().from(schema.programs).where(eq(schema.programs.id, programId)).limit(1)
		if (!program) {
			return NextResponse.json({ error: 'Program not found' }, { status: 404 })
		}

		const programClips = await db
			.select()
			.from(schema.programClips)
			.where(eq(schema.programClips.programId, programId))
			.orderBy(asc(schema.programClips.position))

		const audioTracks = await db
			.select()
			.from(schema.programAudioTracks)
			.where(eq(schema.programAudioTracks.programId, programId))
			.orderBy(asc(schema.programAudioTracks.position))

		const audioDuration = audioTracks.reduce((sum, t) => sum + (t.durationSec ?? 0), 0)
		const baseDuration = program.durationMode === 'manual' ? (program.manualDurationSec ?? 30) : audioDuration
		const computedDuration =
			programClips.length > 0 && program.minClipDurationSec && baseDuration / programClips.length < program.minClipDurationSec
				? program.minClipDurationSec * programClips.length
				: baseDuration

		const job = {
			id: generateId(),
			type: 'render-program-publish',
			clipId: null,
			programId,
			profileId: effectiveProfile.id,
			payload: {
				durationSec: durationSec ?? computedDuration,
				programTitle: program.title,
				programSlug: program.slug,
				programDescription: program.description,
				programSummary: program.summary,
				clipIds: programClips.map(pc => pc.clipId),
				audioTracks: audioTracks.map(t => ({
					assetId: t.assetId,
					audioUrl: t.audioUrl,
					position: t.position,
					durationSec: t.durationSec,
				})),
				exportPath: effectiveProfile.exportPath,
				fileNamingPattern: effectiveProfile.fileNamingPattern,
				outputFormat: effectiveProfile.outputFormat,
				generateNfo,
				transitionType: program.transitionType,
				transitionSec: program.transitionSec,
				loopTransition: program.loopTransition,
				pushChannelId: body.pushChannelId ?? null,
				pushMode: body.pushMode ?? null,
			},
			status: 'queued',
			outputPath: null,
			error: null,
			steps: [
				{ key: 'render', label: 'Render', status: 'pending' },
				{ key: 'export', label: 'Export', status: 'pending' },
				...(body.pushChannelId
					? [
							{ key: 'index', label: 'Tunarr index', status: 'pending' },
							{ key: 'push', label: 'Push to channel', status: 'pending' },
						]
					: []),
			],
			createdAt: new Date().toISOString(),
			startedAt: null,
			completedAt: null,
		}

		await db.insert(schema.jobs).values(job)
		return NextResponse.json(job, { status: 202 })
	}

	// Clip render-publish (existing behavior)
	const [clip] = await db.select().from(schema.clips).where(eq(schema.clips.id, clipId!)).limit(1)
	if (!clip) {
		return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
	}

	const job = {
		id: generateId(),
		type: 'render-publish',
		clipId,
		profileId,
		payload: {
			durationSec: durationSec ?? clip.defaultDurationSec ?? 30,
			clipTitle: clip.title,
			clipSlug: clip.slug,
			exportPath: profile.exportPath,
			fileNamingPattern: profile.fileNamingPattern,
			outputFormat: profile.outputFormat,
			generateNfo,
		},
		status: 'queued',
		outputPath: null,
		error: null,
		createdAt: new Date().toISOString(),
		startedAt: null,
		completedAt: null,
	}

	await db.insert(schema.jobs).values(job)

	return NextResponse.json(job, { status: 202 })
}
