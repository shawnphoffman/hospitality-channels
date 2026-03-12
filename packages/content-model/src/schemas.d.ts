import { z } from "zod";
export declare const templateSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    slug: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    category: z.ZodOptional<z.ZodString>;
    schema: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    previewImage: z.ZodOptional<z.ZodString>;
    version: z.ZodOptional<z.ZodNumber>;
    status: z.ZodDefault<z.ZodEnum<["draft", "active", "archived"]>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    status: "draft" | "active" | "archived";
    slug: string;
    id?: string | undefined;
    schema?: Record<string, unknown> | undefined;
    description?: string | undefined;
    category?: string | undefined;
    previewImage?: string | undefined;
    version?: number | undefined;
}, {
    name: string;
    slug: string;
    id?: string | undefined;
    status?: "draft" | "active" | "archived" | undefined;
    schema?: Record<string, unknown> | undefined;
    description?: string | undefined;
    category?: string | undefined;
    previewImage?: string | undefined;
    version?: number | undefined;
}>;
export declare const pageSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    templateId: z.ZodString;
    slug: z.ZodString;
    title: z.ZodString;
    roomId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    themeId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    dataJson: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    animationProfile: z.ZodOptional<z.ZodString>;
    defaultDurationSec: z.ZodDefault<z.ZodNumber>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    templateId: string;
    slug: string;
    title: string;
    dataJson: Record<string, unknown>;
    defaultDurationSec: number;
    id?: string | undefined;
    createdAt?: string | undefined;
    roomId?: string | null | undefined;
    themeId?: string | null | undefined;
    animationProfile?: string | undefined;
    updatedAt?: string | undefined;
}, {
    templateId: string;
    slug: string;
    title: string;
    id?: string | undefined;
    createdAt?: string | undefined;
    roomId?: string | null | undefined;
    themeId?: string | null | undefined;
    dataJson?: Record<string, unknown> | undefined;
    animationProfile?: string | undefined;
    defaultDurationSec?: number | undefined;
    updatedAt?: string | undefined;
}>;
export declare const roomSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    slug: z.ZodString;
    defaultChannelProfileId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    defaultThemeId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug: string;
    id?: string | undefined;
    defaultChannelProfileId?: string | null | undefined;
    defaultThemeId?: string | null | undefined;
    notes?: string | undefined;
}, {
    name: string;
    slug: string;
    id?: string | undefined;
    defaultChannelProfileId?: string | null | undefined;
    defaultThemeId?: string | null | undefined;
    notes?: string | undefined;
}>;
export declare const assetSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    type: z.ZodEnum<["photo", "logo", "background", "video", "other"]>;
    originalPath: z.ZodString;
    derivedPath: z.ZodOptional<z.ZodString>;
    width: z.ZodOptional<z.ZodNumber>;
    height: z.ZodOptional<z.ZodNumber>;
    duration: z.ZodOptional<z.ZodNumber>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    checksum: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    type: "photo" | "logo" | "background" | "video" | "other";
    originalPath: string;
    id?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    derivedPath?: string | undefined;
    duration?: number | undefined;
    tags?: string[] | undefined;
    checksum?: string | undefined;
}, {
    type: "photo" | "logo" | "background" | "video" | "other";
    originalPath: string;
    id?: string | undefined;
    width?: number | undefined;
    height?: number | undefined;
    derivedPath?: string | undefined;
    duration?: number | undefined;
    tags?: string[] | undefined;
    checksum?: string | undefined;
}>;
export declare const publishProfileSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    exportPath: z.ZodString;
    outputFormat: z.ZodDefault<z.ZodEnum<["mp4"]>>;
    lineupType: z.ZodOptional<z.ZodString>;
    roomScope: z.ZodOptional<z.ZodString>;
    fileNamingPattern: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    exportPath: string;
    outputFormat: "mp4";
    id?: string | undefined;
    lineupType?: string | undefined;
    roomScope?: string | undefined;
    fileNamingPattern?: string | undefined;
}, {
    name: string;
    exportPath: string;
    id?: string | undefined;
    outputFormat?: "mp4" | undefined;
    lineupType?: string | undefined;
    roomScope?: string | undefined;
    fileNamingPattern?: string | undefined;
}>;
export declare const publishedArtifactSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    pageId: z.ZodString;
    publishProfileId: z.ZodString;
    outputPath: z.ZodString;
    posterPath: z.ZodOptional<z.ZodString>;
    durationSec: z.ZodNumber;
    renderVersion: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodEnum<["pending", "published", "failed"]>>;
    publishedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    pageId: string;
    status: "published" | "pending" | "failed";
    outputPath: string;
    publishProfileId: string;
    durationSec: number;
    id?: string | undefined;
    posterPath?: string | undefined;
    renderVersion?: string | undefined;
    publishedAt?: string | undefined;
}, {
    pageId: string;
    outputPath: string;
    publishProfileId: string;
    durationSec: number;
    id?: string | undefined;
    status?: "published" | "pending" | "failed" | undefined;
    posterPath?: string | undefined;
    renderVersion?: string | undefined;
    publishedAt?: string | undefined;
}>;
export declare const channelDefinitionSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    channelNumber: z.ZodNumber;
    channelName: z.ZodString;
    pageId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    artifactId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    description: z.ZodOptional<z.ZodString>;
    posterAssetId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    enabled: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    channelNumber: number;
    channelName: string;
    enabled: boolean;
    id?: string | undefined;
    pageId?: string | null | undefined;
    description?: string | undefined;
    artifactId?: string | null | undefined;
    posterAssetId?: string | null | undefined;
}, {
    channelNumber: number;
    channelName: string;
    id?: string | undefined;
    pageId?: string | null | undefined;
    description?: string | undefined;
    artifactId?: string | null | undefined;
    posterAssetId?: string | null | undefined;
    enabled?: boolean | undefined;
}>;
export type Template = z.infer<typeof templateSchema>;
export type Page = z.infer<typeof pageSchema>;
export type Room = z.infer<typeof roomSchema>;
export type Asset = z.infer<typeof assetSchema>;
export type PublishProfile = z.infer<typeof publishProfileSchema>;
export type PublishedArtifact = z.infer<typeof publishedArtifactSchema>;
export type ChannelDefinition = z.infer<typeof channelDefinitionSchema>;
//# sourceMappingURL=schemas.d.ts.map