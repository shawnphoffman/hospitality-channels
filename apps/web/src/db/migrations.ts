import type { Client } from '@libsql/client'

/**
 * Version-tracked schema migrations.
 *
 * Each migration runs exactly once per database and is recorded in the
 * schema_migrations table. Migrations must still be written defensively
 * (IF NOT EXISTS / column-presence checks) so that databases created by
 * older releases, which ran the same statements untracked on startup,
 * converge to the same state without errors.
 *
 * To add a migration: append an entry to MIGRATIONS with the next numeric
 * prefix. Never edit or reorder existing entries once released.
 */

export interface Migration {
	id: string
	run: (client: Client) => Promise<void>
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
    status TEXT NOT NULL DEFAULT 'active',
    type TEXT NOT NULL DEFAULT 'builtin',
    layout_json TEXT
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

const LEGACY_ALTERS_SQL = [
	'ALTER TABLE channel_definitions ADD COLUMN tunarr_channel_id TEXT',
	"ALTER TABLE channel_definitions ADD COLUMN push_mode TEXT DEFAULT 'replace'",
	'ALTER TABLE published_artifacts ADD COLUMN program_id TEXT',
	'ALTER TABLE jobs ADD COLUMN program_id TEXT',
	'ALTER TABLE channel_definitions ADD COLUMN program_id TEXT',
	'ALTER TABLE assets ADD COLUMN name TEXT',
	'ALTER TABLE programs ADD COLUMN min_clip_duration_sec INTEGER',
	"ALTER TABLE programs ADD COLUMN transition_type TEXT NOT NULL DEFAULT 'none'",
	'ALTER TABLE programs ADD COLUMN transition_sec REAL NOT NULL DEFAULT 0.5',
	'ALTER TABLE programs ADD COLUMN loop_transition INTEGER NOT NULL DEFAULT 0',
	'ALTER TABLE publish_profiles ADD COLUMN allow_download INTEGER NOT NULL DEFAULT 0',
	"ALTER TABLE templates ADD COLUMN type TEXT NOT NULL DEFAULT 'builtin'",
	'ALTER TABLE templates ADD COLUMN layout_json TEXT',
]

/**
 * SQLite doesn't support ALTER COLUMN to drop NOT NULL, so we recreate
 * the table to make page_id nullable (needed for program-only artifacts).
 */
const REBUILD_PUBLISHED_ARTIFACTS_SQL = [
	`CREATE TABLE IF NOT EXISTS published_artifacts_new (
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
	`INSERT OR IGNORE INTO published_artifacts_new SELECT * FROM published_artifacts`,
	`DROP TABLE published_artifacts`,
	`ALTER TABLE published_artifacts_new RENAME TO published_artifacts`,
]

async function columnExists(client: Client, table: string, column: string): Promise<boolean> {
	const info = await client.execute(`PRAGMA table_info('${table}')`)
	return info.rows.some((r: any) => r.name === column || r[1] === column)
}

async function addColumnIfMissing(client: Client, table: string, column: string, definition: string): Promise<void> {
	if (await columnExists(client, table, column)) return
	await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}

export const MIGRATIONS: Migration[] = [
	{
		// Brings any database (fresh or created by a pre-tracking release) up to
		// the v1.3.0 schema. Every statement is idempotent.
		id: '0000_baseline',
		run: async client => {
			for (const sql of CREATE_TABLES_SQL) {
				await client.execute(sql)
			}
			for (const sql of LEGACY_ALTERS_SQL) {
				try {
					await client.execute(sql)
				} catch {
					/* column already exists */
				}
			}
			// Rebuild published_artifacts if page_id still has its legacy NOT NULL constraint
			const tableInfo = await client.execute("PRAGMA table_info('published_artifacts')")
			const pageIdCol = tableInfo.rows.find((r: any) => r.name === 'page_id' || r[1] === 'page_id')
			const isNotNull = pageIdCol && ((pageIdCol as any).notnull === 1 || (pageIdCol as any)[3] === 1)
			if (isNotNull) {
				for (const sql of REBUILD_PUBLISHED_ARTIFACTS_SQL) {
					await client.execute(sql)
				}
			}
		},
	},
	{
		// Tracks how many times the worker has picked up a job, enabling
		// automatic retry and stuck-job recovery after a worker crash.
		id: '0001_job_attempts',
		run: async client => {
			await addColumnIfMissing(client, 'jobs', 'attempts', 'INTEGER NOT NULL DEFAULT 0')
		},
	},
	{
		// Persists the sequence number used in {seq} filename patterns so it
		// stays monotonic even after artifacts are deleted.
		id: '0002_artifact_sequence_number',
		run: async client => {
			await addColumnIfMissing(client, 'published_artifacts', 'sequence_number', 'INTEGER')
		},
	},
	{
		// One shared tag vocabulary across content types, joined through
		// per-entity junction tables.
		id: '0003_tags',
		run: async client => {
			await client.execute(`CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      )`)
			await client.execute(`CREATE TABLE IF NOT EXISTS program_tags (
        id TEXT PRIMARY KEY,
        program_id TEXT NOT NULL REFERENCES programs(id),
        tag_id TEXT NOT NULL REFERENCES tags(id),
        UNIQUE(program_id, tag_id)
      )`)
			await client.execute(`CREATE TABLE IF NOT EXISTS page_tags (
        id TEXT PRIMARY KEY,
        page_id TEXT NOT NULL REFERENCES pages(id),
        tag_id TEXT NOT NULL REFERENCES tags(id),
        UNIQUE(page_id, tag_id)
      )`)
		},
	},
	{
		// Per-step pipeline progress for multi-stage jobs (render, export,
		// index, push), stored as a JSON array.
		id: '0004_job_steps',
		run: async client => {
			await addColumnIfMissing(client, 'jobs', 'steps', 'TEXT')
		},
	},
	{
		// Tags on media assets, same vocabulary as programs and clips.
		id: '0005_asset_tags',
		run: async client => {
			await client.execute(`CREATE TABLE IF NOT EXISTS asset_tags (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL REFERENCES assets(id),
        tag_id TEXT NOT NULL REFERENCES tags(id),
        UNIQUE(asset_id, tag_id)
      )`)
		},
	},
]

/**
 * Applies all pending migrations in order. Safe to call on every startup;
 * already-applied migrations are skipped via the schema_migrations table.
 */
export async function runMigrations(client: Client, migrations: Migration[] = MIGRATIONS): Promise<string[]> {
	await client.execute(`CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  )`)

	const appliedRows = await client.execute('SELECT id FROM schema_migrations')
	const applied = new Set(appliedRows.rows.map((r: any) => String(r.id ?? r[0])))

	const newlyApplied: string[] = []
	for (const migration of migrations) {
		if (applied.has(migration.id)) continue
		await migration.run(client)
		await client.execute({
			sql: 'INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)',
			args: [migration.id, new Date().toISOString()],
		})
		newlyApplied.push(migration.id)
	}
	return newlyApplied
}
