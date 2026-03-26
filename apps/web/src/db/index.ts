import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { eq } from 'drizzle-orm'
import { PATHS } from '@hospitality-channels/common'
import { getTemplateRegistry } from '@hospitality-channels/templates'
import * as schema from './schema'

type Database = ReturnType<typeof drizzle<typeof schema>>

function generateId(): string {
	return randomBytes(12).toString('hex')
}

const CREATE_TABLES_SQL = [
	`CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    schema TEXT,
    preview_image TEXT,
    version INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active'
  )`,
	`CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES templates(id),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    theme_id TEXT,
    data_json TEXT DEFAULT '{}',
    animation_profile TEXT,
    default_duration_sec INTEGER DEFAULT 30,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
	`CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    original_path TEXT NOT NULL,
    derived_path TEXT,
    width INTEGER,
    height INTEGER,
    duration REAL,
    tags TEXT,
    checksum TEXT
  )`,
	`CREATE TABLE IF NOT EXISTS publish_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    export_path TEXT NOT NULL,
    output_format TEXT NOT NULL DEFAULT 'mp4',
    lineup_type TEXT,
    file_naming_pattern TEXT
  )`,
	`CREATE TABLE IF NOT EXISTS published_artifacts (
    id TEXT PRIMARY KEY,
    page_id TEXT REFERENCES pages(id),
    program_id TEXT REFERENCES programs(id),
    publish_profile_id TEXT NOT NULL REFERENCES publish_profiles(id),
    output_path TEXT NOT NULL,
    poster_path TEXT,
    duration_sec REAL NOT NULL,
    render_version TEXT,
    status TEXT NOT NULL DEFAULT 'published',
    published_at TEXT
  )`,
	`CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    page_id TEXT REFERENCES pages(id),
    program_id TEXT REFERENCES programs(id),
    profile_id TEXT REFERENCES publish_profiles(id),
    payload TEXT DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'queued',
    output_path TEXT,
    error TEXT,
    created_at TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT
  )`,
	`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT NOT NULL
  )`,
	`CREATE TABLE IF NOT EXISTS channel_definitions (
    id TEXT PRIMARY KEY,
    tunarr_channel_id TEXT,
    channel_number INTEGER NOT NULL,
    channel_name TEXT NOT NULL,
    page_id TEXT REFERENCES pages(id),
    program_id TEXT REFERENCES programs(id),
    artifact_id TEXT REFERENCES published_artifacts(id),
    description TEXT,
    poster_asset_id TEXT REFERENCES assets(id),
    push_mode TEXT DEFAULT 'replace',
    enabled INTEGER NOT NULL DEFAULT 1
  )`,
	`CREATE TABLE IF NOT EXISTS programs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    summary TEXT,
    icon_asset_id TEXT REFERENCES assets(id),
    duration_mode TEXT NOT NULL DEFAULT 'auto',
    manual_duration_sec INTEGER,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
	`CREATE TABLE IF NOT EXISTS program_clips (
    id TEXT PRIMARY KEY,
    program_id TEXT NOT NULL REFERENCES programs(id),
    clip_id TEXT NOT NULL REFERENCES pages(id),
    position INTEGER NOT NULL,
    UNIQUE(program_id, clip_id)
  )`,
	`CREATE TABLE IF NOT EXISTS program_audio_tracks (
    id TEXT PRIMARY KEY,
    program_id TEXT NOT NULL REFERENCES programs(id),
    asset_id TEXT REFERENCES assets(id),
    audio_url TEXT,
    position INTEGER NOT NULL,
    duration_sec REAL
  )`,
]

let _client: Client | null = null
let _db: Database | null = null
let initPromise: Promise<void> | null = null

function getLazy(): { client: Client; db: Database } {
	if (!_client || !_db) {
		mkdirSync(dirname(PATHS.database), { recursive: true })
		_client = createClient({ url: `file:${PATHS.database}` })
		_db = drizzle(_client, { schema })
	}
	return { client: _client, db: _db }
}

async function ensureSeeded(database: Database) {
	const registry = getTemplateRegistry()
	const existingSlugs = new Set(
		(await database.select({ slug: schema.templates.slug }).from(schema.templates)).map(r => r.slug)
	)

	for (const tmpl of registry) {
		if (existingSlugs.has(tmpl.slug)) continue
		try {
			await database.insert(schema.templates).values({
				id: generateId(),
				slug: tmpl.slug,
				name: tmpl.name,
				description: tmpl.description ?? null,
				category: tmpl.category ?? null,
				schema: tmpl.schema ?? null,
				previewImage: tmpl.previewImage ?? null,
				version: tmpl.version ?? 1,
				status: tmpl.status,
			})
		} catch {
			/* already exists */
		}
	}
	const existingProfiles = await database.select().from(schema.publishProfiles)
	const hasDefaultExport = existingProfiles.some(p => p.name === 'Default Export')
	if (!hasDefaultExport) {
		await database.insert(schema.publishProfiles).values({
			id: generateId(),
			name: 'Default Export',
			exportPath: PATHS.exports,
			outputFormat: 'mp4',
			lineupType: 'main',
			fileNamingPattern: '{title}-{pageId}.mp4',
		})
	}
}

const MIGRATIONS_SQL = [
	'ALTER TABLE channel_definitions ADD COLUMN tunarr_channel_id TEXT',
	"ALTER TABLE channel_definitions ADD COLUMN push_mode TEXT DEFAULT 'replace'",
	'ALTER TABLE published_artifacts ADD COLUMN program_id TEXT',
	'ALTER TABLE jobs ADD COLUMN program_id TEXT',
	'ALTER TABLE channel_definitions ADD COLUMN program_id TEXT',
]

/**
 * Data migrations that clean up legacy data. Each migration is idempotent
 * and safe to run on every startup.
 */
async function runDataMigrations(database: Database) {
	// Migration: Clean up duplicate "Default Tunarr Export" profiles
	// Legacy seed code created a new profile on every restart. Keep the one
	// referenced by published artifacts, rename it to "Default Export", delete the rest.
	const oldProfiles = await database
		.select()
		.from(schema.publishProfiles)
		.where(eq(schema.publishProfiles.name, 'Default Tunarr Export'))
	if (oldProfiles.length > 0) {
		// Find which ones are referenced by artifacts
		const referencedIds = new Set(
			(await database.select({ pid: schema.publishedArtifacts.publishProfileId }).from(schema.publishedArtifacts)).map(
				r => r.pid
			)
		)
		const toKeep = oldProfiles.find(p => referencedIds.has(p.id)) ?? oldProfiles[0]
		// Rename the kept one
		await database
			.update(schema.publishProfiles)
			.set({ name: 'Default Export' })
			.where(eq(schema.publishProfiles.id, toKeep.id))
		// Delete the rest
		const toDeleteIds = oldProfiles.filter(p => p.id !== toKeep.id).map(p => p.id)
		if (toDeleteIds.length > 0) {
			for (const id of toDeleteIds) {
				await database.delete(schema.publishProfiles).where(eq(schema.publishProfiles.id, id))
			}
		}
	}
}

async function ensureTables(client: Client, database: Database) {
	for (const sql of CREATE_TABLES_SQL) {
		await client.execute(sql)
	}
	for (const sql of MIGRATIONS_SQL) {
		try {
			await client.execute(sql)
		} catch {
			/* column already exists */
		}
	}
	await ensureSeeded(database)
	await runDataMigrations(database)
}

/**
 * Returns the database instance, ensuring tables and seed data exist.
 * All side effects (directory creation, table creation) are deferred
 * until this function is called at runtime — not at module import time.
 */
export async function getDb() {
	const { client, db } = getLazy()
	if (!initPromise) {
		initPromise = ensureTables(client, db).catch(err => {
			console.error('Failed to initialize database tables:', err)
			initPromise = null
			throw err
		})
	}
	await initPromise
	return db
}

export { schema }
