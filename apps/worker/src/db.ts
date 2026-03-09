import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "../../..");
const defaultDbPath = resolve(projectRoot, "apps/web/data/guest-tv-pages.db");

const dbUrl = process.env.DATABASE_URL
  ? `file:${process.env.DATABASE_URL}`
  : `file:${defaultDbPath}`;

const client = createClient({ url: dbUrl });

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  pageId: text("page_id"),
  profileId: text("profile_id"),
  payload: text("payload", { mode: "json" }).default({}),
  status: text("status").notNull().default("queued"),
  outputPath: text("output_path"),
  error: text("error"),
  createdAt: text("created_at").notNull(),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
});

export const pages = sqliteTable("pages", {
  id: text("id").primaryKey(),
  templateId: text("template_id").notNull(),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  roomId: text("room_id"),
  themeId: text("theme_id"),
  dataJson: text("data_json", { mode: "json" }).default({}),
  animationProfile: text("animation_profile"),
  defaultDurationSec: integer("default_duration_sec").default(30),
  status: text("status").notNull().default("draft"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const publishProfiles = sqliteTable("publish_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  exportPath: text("export_path").notNull(),
  outputFormat: text("output_format").notNull().default("mp4"),
  lineupType: text("lineup_type"),
  roomScope: text("room_scope"),
  fileNamingPattern: text("file_naming_pattern"),
});

export const publishedArtifacts = sqliteTable("published_artifacts", {
  id: text("id").primaryKey(),
  pageId: text("page_id").notNull(),
  publishProfileId: text("publish_profile_id").notNull(),
  outputPath: text("output_path").notNull(),
  posterPath: text("poster_path"),
  durationSec: real("duration_sec").notNull(),
  renderVersion: text("render_version"),
  status: text("status").notNull().default("published"),
  publishedAt: text("published_at"),
});

const schema = { jobs, pages, publishProfiles, publishedArtifacts };
export const db = drizzle(client, { schema });
