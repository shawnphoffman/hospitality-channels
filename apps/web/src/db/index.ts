import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

const dbPath = process.env.DATABASE_URL ?? "data/guest-tv-pages.db";

const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    schema TEXT,
    preview_image TEXT,
    version INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active'
  );
  CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    default_channel_profile_id TEXT,
    default_theme_id TEXT,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS guests (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    display_name TEXT,
    arrival_date TEXT,
    departure_date TEXT,
    notes TEXT
  );
  CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL REFERENCES templates(id),
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    room_id TEXT REFERENCES rooms(id),
    guest_id TEXT REFERENCES guests(id),
    theme_id TEXT,
    data_json TEXT DEFAULT '{}',
    animation_profile TEXT,
    default_duration_sec INTEGER DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    original_path TEXT NOT NULL,
    derived_path TEXT,
    width INTEGER,
    height INTEGER,
    duration REAL,
    tags TEXT,
    checksum TEXT
  );
  CREATE TABLE IF NOT EXISTS publish_profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    export_path TEXT NOT NULL,
    output_format TEXT NOT NULL DEFAULT 'mp4',
    lineup_type TEXT,
    room_scope TEXT,
    file_naming_pattern TEXT
  );
  CREATE TABLE IF NOT EXISTS published_artifacts (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL REFERENCES pages(id),
    publish_profile_id TEXT NOT NULL REFERENCES publish_profiles(id),
    output_path TEXT NOT NULL,
    poster_path TEXT,
    duration_sec REAL NOT NULL,
    render_version TEXT,
    status TEXT NOT NULL DEFAULT 'published',
    published_at TEXT
  );
  CREATE TABLE IF NOT EXISTS channel_definitions (
    id TEXT PRIMARY KEY,
    channel_number INTEGER NOT NULL,
    channel_name TEXT NOT NULL,
    page_id TEXT REFERENCES pages(id),
    artifact_id TEXT REFERENCES published_artifacts(id),
    description TEXT,
    poster_asset_id TEXT REFERENCES assets(id),
    enabled INTEGER NOT NULL DEFAULT 1
  );
`;

function createDb() {
  const dir = path.dirname(dbPath);
  mkdirSync(dir, { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(CREATE_TABLES_SQL);
  return drizzle(sqlite, { schema });
}

let _db: ReturnType<typeof createDb> | undefined;

export function getDb() {
  if (!_db) {
    _db = createDb();
  }
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    const instance = getDb();
    return (instance as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export { schema };
