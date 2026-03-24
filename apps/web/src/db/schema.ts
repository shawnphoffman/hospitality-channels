import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const templates = sqliteTable("templates", {
  id: text("id").primaryKey(),
  slug: text("slug")
    .notNull()
    .unique(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  schema: text("schema", { mode: "json" }),
  previewImage: text("preview_image"),
  version: integer("version").default(1),
  status: text("status")
    .notNull()
    .default("active")
});

export const pages = sqliteTable("pages", {
  id: text("id").primaryKey(),
  templateId: text("template_id")
    .notNull()
    .references(() => templates.id),
  slug: text("slug").notNull(),
  title: text("title").notNull(),
  themeId: text("theme_id"),
  dataJson: text("data_json", { mode: "json" }).default({}),
  animationProfile: text("animation_profile"),
  defaultDurationSec: integer("default_duration_sec").default(30),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
});

export const assets = sqliteTable("assets", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  originalPath: text("original_path").notNull(),
  derivedPath: text("derived_path"),
  width: integer("width"),
  height: integer("height"),
  duration: real("duration"),
  tags: text("tags", { mode: "json" }),
  checksum: text("checksum")
});

export const publishProfiles = sqliteTable("publish_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  exportPath: text("export_path").notNull(),
  outputFormat: text("output_format")
    .notNull()
    .default("mp4"),
  lineupType: text("lineup_type"),
  fileNamingPattern: text("file_naming_pattern")
});

export const publishedArtifacts = sqliteTable("published_artifacts", {
  id: text("id").primaryKey(),
  pageId: text("page_id")
    .notNull()
    .references(() => pages.id),
  publishProfileId: text("publish_profile_id")
    .notNull()
    .references(() => publishProfiles.id),
  outputPath: text("output_path").notNull(),
  posterPath: text("poster_path"),
  durationSec: real("duration_sec").notNull(),
  renderVersion: text("render_version"),
  status: text("status")
    .notNull()
    .default("published"),
  publishedAt: text("published_at")
});

export const jobs = sqliteTable("jobs", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  pageId: text("page_id").references(() => pages.id),
  profileId: text("profile_id").references(() => publishProfiles.id),
  payload: text("payload", { mode: "json" }).default({}),
  status: text("status")
    .notNull()
    .default("queued"),
  outputPath: text("output_path"),
  error: text("error"),
  createdAt: text("created_at").notNull(),
  startedAt: text("started_at"),
  completedAt: text("completed_at")
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: text("updated_at").notNull()
});

export const channelDefinitions = sqliteTable("channel_definitions", {
  id: text("id").primaryKey(),
  tunarrChannelId: text("tunarr_channel_id"),
  channelNumber: integer("channel_number").notNull(),
  channelName: text("channel_name").notNull(),
  pageId: text("page_id").references(() => pages.id),
  artifactId: text("artifact_id").references(() => publishedArtifacts.id),
  description: text("description"),
  posterAssetId: text("poster_asset_id").references(() => assets.id),
  pushMode: text("push_mode").default("replace"),
  enabled: integer("enabled", { mode: "boolean" })
    .notNull()
    .default(true)
});
