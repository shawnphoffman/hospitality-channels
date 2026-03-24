import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
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
    page_id TEXT NOT NULL REFERENCES pages(id),
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
    channel_number INTEGER NOT NULL,
    channel_name TEXT NOT NULL,
    page_id TEXT REFERENCES pages(id),
    artifact_id TEXT REFERENCES published_artifacts(id),
    description TEXT,
    poster_asset_id TEXT REFERENCES assets(id),
    enabled INTEGER NOT NULL DEFAULT 1
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

async function ensureTables(client: Client, database: Database) {
	for (const sql of CREATE_TABLES_SQL) {
		await client.execute(sql)
	}
	await ensureSeeded(database)
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
