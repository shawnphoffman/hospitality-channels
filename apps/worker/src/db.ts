import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'
import { PATHS } from '@hospitality-channels/common'

mkdirSync(dirname(PATHS.database), { recursive: true })
const dbUrl = `file:${PATHS.database}`
const client = createClient({ url: dbUrl })

export const jobs = sqliteTable('jobs', {
	id: text('id').primaryKey(),
	type: text('type').notNull(),
	clipId: text('page_id'),
	programId: text('program_id'),
	profileId: text('profile_id'),
	payload: text('payload', { mode: 'json' }).default({}),
	status: text('status').notNull().default('queued'),
	outputPath: text('output_path'),
	error: text('error'),
	createdAt: text('created_at').notNull(),
	startedAt: text('started_at'),
	completedAt: text('completed_at'),
})

export const clips = sqliteTable('pages', {
	id: text('id').primaryKey(),
	templateId: text('template_id').notNull(),
	slug: text('slug').notNull(),
	title: text('title').notNull(),
	themeId: text('theme_id'),
	dataJson: text('data_json', { mode: 'json' }).default({}),
	animationProfile: text('animation_profile'),
	defaultDurationSec: integer('default_duration_sec').default(30),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull(),
})

export const publishProfiles = sqliteTable('publish_profiles', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	exportPath: text('export_path').notNull(),
	outputFormat: text('output_format').notNull().default('mp4'),
	lineupType: text('lineup_type'),
	fileNamingPattern: text('file_naming_pattern'),
})

export const publishedArtifacts = sqliteTable('published_artifacts', {
	id: text('id').primaryKey(),
	clipId: text('page_id'),
	programId: text('program_id'),
	publishProfileId: text('publish_profile_id').notNull(),
	outputPath: text('output_path').notNull(),
	posterPath: text('poster_path'),
	durationSec: real('duration_sec').notNull(),
	renderVersion: text('render_version'),
	status: text('status').notNull().default('published'),
	publishedAt: text('published_at'),
})

export const programs = sqliteTable('programs', {
	id: text('id').primaryKey(),
	title: text('title').notNull(),
	slug: text('slug').notNull(),
	description: text('description'),
	summary: text('summary'),
	iconAssetId: text('icon_asset_id'),
	durationMode: text('duration_mode').notNull().default('auto'),
	manualDurationSec: integer('manual_duration_sec'),
	createdAt: text('created_at').notNull(),
	updatedAt: text('updated_at').notNull(),
})

export const programClips = sqliteTable('program_clips', {
	id: text('id').primaryKey(),
	programId: text('program_id').notNull(),
	clipId: text('clip_id').notNull(),
	position: integer('position').notNull(),
})

export const programAudioTracks = sqliteTable('program_audio_tracks', {
	id: text('id').primaryKey(),
	programId: text('program_id').notNull(),
	assetId: text('asset_id'),
	audioUrl: text('audio_url'),
	position: integer('position').notNull(),
	durationSec: real('duration_sec'),
})

export const assets = sqliteTable('assets', {
	id: text('id').primaryKey(),
	name: text('name'),
	type: text('type').notNull(),
	originalPath: text('original_path').notNull(),
	derivedPath: text('derived_path'),
	width: integer('width'),
	height: integer('height'),
	duration: real('duration'),
	tags: text('tags', { mode: 'json' }),
	checksum: text('checksum'),
})

const schema = { jobs, clips, publishProfiles, publishedArtifacts, programs, programClips, programAudioTracks, assets }
export const db = drizzle(client, { schema })
