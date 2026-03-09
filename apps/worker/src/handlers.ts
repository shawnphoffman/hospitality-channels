import path from "node:path";
import { randomBytes } from "node:crypto";
import { createLogger } from "@hospitality-channels/common";
import { capturePageVideo, normalizeVideo } from "@hospitality-channels/render-core";
import { publishArtifact } from "@hospitality-channels/publish";
import { db, publishedArtifacts } from "./db.js";
import type { Job } from "./queue.js";

const logger = createLogger("worker:handlers");

function generateId(): string {
  return randomBytes(12).toString("hex");
}

const RENDER_OUTPUT_DIR = process.env.RENDER_OUTPUT_DIR || "./renders";

export async function handleRenderJob(job: Job): Promise<string> {
  const payload = job.payload as {
    url: string;
    durationSec: number;
    pageTitle: string;
    pageSlug: string;
  };

  if (!payload.url) {
    throw new Error("render job requires url in payload");
  }

  const pageId = job.pageId ?? "unknown";
  const outputDir = path.resolve(RENDER_OUTPUT_DIR);
  const rawPath = path.join(outputDir, `raw-${pageId}-${Date.now()}.webm`);
  const finalPath = path.join(outputDir, `${pageId}.mp4`);

  logger.info("Starting render", { pageId, url: payload.url, durationSec: payload.durationSec });

  const captureResult = await capturePageVideo({
    url: payload.url,
    outputPath: rawPath,
    durationSec: payload.durationSec,
  });

  if (!captureResult.success) {
    throw new Error(`Capture failed: ${captureResult.error}`);
  }

  const normalizeResult = await normalizeVideo({
    inputPath: captureResult.outputPath,
    outputPath: finalPath,
    durationSec: payload.durationSec,
  });

  if (!normalizeResult.success) {
    throw new Error(`FFmpeg normalization failed: ${normalizeResult.error}`);
  }

  logger.info("Render complete", { pageId, outputPath: finalPath });
  return finalPath;
}

export async function handlePublishJob(job: Job): Promise<string> {
  const payload = job.payload as {
    sourcePath: string;
    pageTitle: string;
    pageSlug: string;
    durationSec: number;
    exportPath: string;
    fileNamingPattern: string | null;
    outputFormat: string;
  };

  const pageId = job.pageId ?? "unknown";
  const profileId = job.profileId ?? "unknown";

  if (!payload.sourcePath) {
    throw new Error("publish job requires sourcePath in payload");
  }

  logger.info("Starting publish", { pageId, exportPath: payload.exportPath });

  const result = await publishArtifact({
    sourcePath: payload.sourcePath,
    pageId,
    pageTitle: payload.pageTitle,
    profile: {
      name: "",
      exportPath: payload.exportPath,
      outputFormat: payload.outputFormat as "mp4",
      fileNamingPattern: payload.fileNamingPattern ?? undefined,
    },
    durationSec: payload.durationSec,
  });

  if (!result.success) {
    throw new Error(`Publish failed: ${result.error}`);
  }

  const artifactId = generateId();
  await db.insert(publishedArtifacts).values({
    id: artifactId,
    pageId,
    publishProfileId: profileId,
    outputPath: result.outputPath,
    posterPath: result.posterPath ?? null,
    durationSec: payload.durationSec,
    renderVersion: "1",
    status: "published",
    publishedAt: new Date().toISOString(),
  });

  logger.info("Publish complete", { pageId, outputPath: result.outputPath, artifactId });
  return result.outputPath;
}
