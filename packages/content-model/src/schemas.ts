import { z } from "zod";

export const templateFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(["string", "textarea", "markdown", "image", "video", "audio", "boolean"]),
  default: z.string().default(""),
  required: z.boolean().optional(),
});

export const composableSectionSchema = z.object({
  id: z.string(),
  type: z.enum(["header", "text-card", "image-block", "qr-code"]),
  enabled: z.boolean().default(true),
  order: z.number(),
  config: z.record(z.unknown()).default({}),
  fields: z.array(templateFieldSchema).default([]),
});

export const composableStyleSchema = z.object({
  fontFamily: z.string().default("Inter"),
  accentColor: z.string().default("#6366f1"),
  background: z.object({
    type: z.enum(["color", "gradient", "image"]),
    value: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }).default({ type: "gradient", from: "#0f172a", to: "#020617" }),
  overlayOpacity: z.number().min(0).max(1).default(0.55),
});

export const composableLayoutSchema = z.object({
  version: z.number().default(1),
  style: composableStyleSchema.default({}),
  sections: z.array(composableSectionSchema).default([]),
  sampleData: z.record(z.string()).default({}),
});

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
  type: z.enum(["builtin", "composable"]).optional(),
  layoutJson: composableLayoutSchema.optional().nullable(),
});

export const clipSchema = z.object({
  id: z.string().optional(),
  templateId: z.string(),
  slug: z.string(),
  title: z.string(),
  themeId: z
    .string()
    .optional()
    .nullable(),
  dataJson: z.record(z.unknown()).default({}),
  animationProfile: z.string().optional(),
  defaultDurationSec: z.number().default(30),
  createdAt: z
    .string()
    .datetime()
    .optional(),
  updatedAt: z
    .string()
    .datetime()
    .optional()
});

export const assetSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["photo", "logo", "background", "video", "audio", "other"]),
  originalPath: z.string(),
  derivedPath: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
  tags: z.array(z.string()).optional(),
  checksum: z.string().optional()
});

export const publishProfileSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  exportPath: z.string(),
  outputFormat: z.enum(["mp4"]).default("mp4"),
  lineupType: z.string().optional(),
  fileNamingPattern: z.string().optional()
});

export const publishedArtifactSchema = z.object({
  id: z.string().optional(),
  clipId: z.string().optional().nullable(),
  programId: z.string().optional().nullable(),
  publishProfileId: z.string(),
  outputPath: z.string(),
  posterPath: z.string().optional(),
  durationSec: z.number(),
  renderVersion: z.string().optional(),
  status: z.enum(["pending", "published", "failed"]).default("published"),
  publishedAt: z
    .string()
    .datetime()
    .optional()
});

export const channelDefinitionSchema = z.object({
  id: z.string().optional(),
  channelNumber: z.number(),
  channelName: z.string(),
  clipId: z
    .string()
    .optional()
    .nullable(),
  programId: z
    .string()
    .optional()
    .nullable(),
  artifactId: z
    .string()
    .optional()
    .nullable(),
  description: z.string().optional(),
  posterAssetId: z
    .string()
    .optional()
    .nullable(),
  enabled: z.boolean().default(true)
});

export const programSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  slug: z.string(),
  description: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  iconAssetId: z.string().optional().nullable(),
  durationMode: z.enum(["auto", "manual"]).default("auto"),
  manualDurationSec: z.number().optional().nullable(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
});

export const programClipSchema = z.object({
  id: z.string().optional(),
  programId: z.string(),
  clipId: z.string(),
  position: z.number()
});

export const programAudioTrackSchema = z.object({
  id: z.string().optional(),
  programId: z.string(),
  assetId: z.string().optional().nullable(),
  audioUrl: z.string().optional().nullable(),
  position: z.number(),
  durationSec: z.number().optional().nullable()
});

export type Template = z.infer<typeof templateSchema>;
export type TemplateField = z.infer<typeof templateFieldSchema>;
export type ComposableSection = z.infer<typeof composableSectionSchema>;
export type ComposableStyle = z.infer<typeof composableStyleSchema>;
export type ComposableLayout = z.infer<typeof composableLayoutSchema>;
export type Clip = z.infer<typeof clipSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type PublishProfile = z.infer<typeof publishProfileSchema>;
export type PublishedArtifact = z.infer<typeof publishedArtifactSchema>;
export type ChannelDefinition = z.infer<typeof channelDefinitionSchema>;
export type Program = z.infer<typeof programSchema>;
export type ProgramClip = z.infer<typeof programClipSchema>;
export type ProgramAudioTrack = z.infer<typeof programAudioTrackSchema>;
