import { z } from "zod";

export const templateSchema = z.object({
  id: z.string().optional(),
  slug: z.string(),
  name: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
  schema: z.record(z.unknown()).optional(),
  previewImage: z.string().optional(),
  version: z.number().optional(),
  status: z.enum(["draft", "active", "archived"]).default("active"),
});

export const pageSchema = z.object({
  id: z.string().optional(),
  templateId: z.string(),
  slug: z.string(),
  title: z.string(),
  roomId: z.string().optional().nullable(),
  themeId: z.string().optional().nullable(),
  dataJson: z.record(z.unknown()).default({}),
  animationProfile: z.string().optional(),
  defaultDurationSec: z.number().default(30),
  status: z.enum(["draft", "ready", "archived"]).default("draft"),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export const roomSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  slug: z.string(),
  defaultChannelProfileId: z.string().optional().nullable(),
  defaultThemeId: z.string().optional().nullable(),
  notes: z.string().optional(),
});

export const assetSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["photo", "logo", "background", "video", "other"]),
  originalPath: z.string(),
  derivedPath: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
  tags: z.array(z.string()).optional(),
  checksum: z.string().optional(),
});

export const publishProfileSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  exportPath: z.string(),
  outputFormat: z.enum(["mp4"]).default("mp4"),
  lineupType: z.string().optional(),
  roomScope: z.string().optional(),
  fileNamingPattern: z.string().optional(),
});

export const publishedArtifactSchema = z.object({
  id: z.string().optional(),
  pageId: z.string(),
  publishProfileId: z.string(),
  outputPath: z.string(),
  posterPath: z.string().optional(),
  durationSec: z.number(),
  renderVersion: z.string().optional(),
  status: z.enum(["pending", "published", "failed"]).default("published"),
  publishedAt: z.string().datetime().optional(),
});

export const channelDefinitionSchema = z.object({
  id: z.string().optional(),
  channelNumber: z.number(),
  channelName: z.string(),
  pageId: z.string().optional().nullable(),
  artifactId: z.string().optional().nullable(),
  description: z.string().optional(),
  posterAssetId: z.string().optional().nullable(),
  enabled: z.boolean().default(true),
});

export type Template = z.infer<typeof templateSchema>;
export type Page = z.infer<typeof pageSchema>;
export type Room = z.infer<typeof roomSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type PublishProfile = z.infer<typeof publishProfileSchema>;
export type PublishedArtifact = z.infer<typeof publishedArtifactSchema>;
export type ChannelDefinition = z.infer<typeof channelDefinitionSchema>;
