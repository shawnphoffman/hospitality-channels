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
	pageId: text('page_id'),
	profileId: text('profile_id'),
	payload: text('payload', { mode: 'json' }).default({}),
	status: text('status').notNull().default('queued'),
	outputPath: text('output_path'),
	error: text('error'),
	createdAt: text('created_at').notNull(),
	startedAt: text('started_at'),
	completedAt: text('completed_at'),
})

export const pages = sqliteTable('pages', {
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
	pageId: text('page_id').notNull(),
	publishProfileId: text('publish_profile_id').notNull(),
	outputPath: text('output_path').notNull(),
	posterPath: text('poster_path'),
	durationSec: real('duration_sec').notNull(),
	renderVersion: text('render_version'),
	status: text('status').notNull().default('published'),
	publishedAt: text('published_at'),
})

const schema = { jobs, pages, publishProfiles, publishedArtifacts }
export const db = drizzle(client, { schema })
