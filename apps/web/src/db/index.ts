import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { count } from 'drizzle-orm'
import { PATHS } from '@hospitality-channels/common'
import { getTemplateRegistry } from '@hospitality-channels/templates'
import * as schema from './schema'

function generateId(): string {
	return randomBytes(12).toString('hex')
}

mkdirSync(dirname(PATHS.database), { recursive: true })
const dbUrl = `file:${PATHS.database}`

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
	`CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    default_channel_profile_id TEXT,
    default_theme_id TEXT,
    notes TEXT
  )`,
	`CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES templates(id),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    room_id TEXT REFERENCES rooms(id),
    theme_id TEXT,
    data_json TEXT DEFAULT '{}',
    animation_profile TEXT,
    default_duration_sec INTEGER DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'draft',
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
    room_scope TEXT,
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

const client = createClient({ url: dbUrl })

let initialized = false
let seeded = false

async function ensureSeeded() {
	if (seeded) return
	const [{ value: templatesCount }] = await db.select({ value: count() }).from(schema.templates)
	if (templatesCount > 0) {
		seeded = true
		return
	}
	const registry = getTemplateRegistry()
	for (const tmpl of registry) {
		try {
			await db.insert(schema.templates).values({
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
	try {
		await db.insert(schema.rooms).values({
			id: generateId(),
			name: 'Guest Room',
			slug: 'guest-room',
			notes: 'Main guest room',
		})
	} catch {
		/* already exists */
	}
	try {
		await db.insert(schema.publishProfiles).values({
			id: generateId(),
			name: 'Default Tunarr Export',
			exportPath: PATHS.exports,
			outputFormat: 'mp4',
			lineupType: 'main',
			fileNamingPattern: '{title}-{pageId}.mp4',
		})
	} catch {
		/* already exists */
	}
	seeded = true
}

async function ensureTables() {
	if (initialized) return
	for (const sql of CREATE_TABLES_SQL) {
		await client.execute(sql)
	}
	initialized = true
	await ensureSeeded()
}

// Eagerly create tables on module load
ensureTables().catch(err => {
	console.error('Failed to initialize database tables:', err)
})

export const db = drizzle(client, { schema })
export { schema }
