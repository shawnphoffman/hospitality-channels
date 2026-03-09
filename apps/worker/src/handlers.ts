import { createLogger } from "@hospitality-channels/common";
import { capturePageVideo, normalizeVideo } from "@hospitality-channels/render-core";
import { publishArtifact } from "@hospitality-channels/publish";
import type { PublishProfile } from "@hospitality-channels/content-model";
import type { Job } from "./queue.js";

const logger = createLogger("worker:handlers");

export async function handleRenderJob(job: Job): Promise<void> {
  const { pageId, url, outputDir, durationSec } = job.payload as {
    pageId: string;
    url: string;
    outputDir: string;
    durationSec?: number;
  };

  if (!url || !outputDir) {
    throw new Error("render job requires url and outputDir in payload");
  }

  logger.info("Starting render", { pageId, url });

  const rawOutputPath = `${outputDir}/raw-${pageId}.webm`;
  const finalOutputPath = `${outputDir}/${pageId}.mp4`;

  const captureResult = await capturePageVideo({
    url,
    outputPath: rawOutputPath,
    durationSec,
  });

  if (!captureResult.success) {
    throw new Error(`Capture failed: ${captureResult.error}`);
  }

  const normalizeResult = await normalizeVideo({
    inputPath: captureResult.outputPath,
    outputPath: finalOutputPath,
    durationSec,
  });

  if (!normalizeResult.success) {
    throw new Error(`FFmpeg normalization failed: ${normalizeResult.error}`);
  }

  logger.info("Render complete", { pageId, outputPath: finalOutputPath });
}

export async function handlePublishJob(job: Job): Promise<void> {
  const { sourcePath, pageId, pageTitle, profile, durationSec } = job.payload as {
    sourcePath: string;
    pageId: string;
    pageTitle: string;
    profile: PublishProfile;
    durationSec: number;
  };

  if (!sourcePath || !pageId || !profile) {
    throw new Error("publish job requires sourcePath, pageId, and profile in payload");
  }

  logger.info("Starting publish", { pageId, exportPath: profile.exportPath });

  const result = await publishArtifact({
    sourcePath,
    pageId,
    pageTitle,
    profile,
    durationSec,
  });

  if (!result.success) {
    throw new Error(`Publish failed: ${result.error}`);
  }

  logger.info("Publish complete", { pageId, outputPath: result.outputPath });
}
