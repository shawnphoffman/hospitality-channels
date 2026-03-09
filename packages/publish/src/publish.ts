import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createLogger } from "@hospitality-channels/common";
import type { PublishProfile } from "@hospitality-channels/content-model";

const logger = createLogger("publish");

export interface PublishArtifactInput {
  sourcePath: string;
  pageId: string;
  pageTitle: string;
  profile: PublishProfile;
  posterPath?: string;
  durationSec: number;
}

export interface PublishArtifactResult {
  outputPath: string;
  posterPath?: string;
  nfoPath?: string;
  success: boolean;
  error?: string;
}

function sanitizeFilename(str: string): string {
  return str.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-");
}

export async function publishArtifact(input: PublishArtifactInput): Promise<PublishArtifactResult> {
  const { sourcePath, pageId, pageTitle, profile, posterPath, durationSec } = input;

  const baseName = profile.fileNamingPattern
    ? profile.fileNamingPattern
        .replace("{pageId}", pageId)
        .replace("{title}", sanitizeFilename(pageTitle))
        .replace("{timestamp}", Date.now().toString())
    : `${sanitizeFilename(pageTitle)}-${pageId.slice(0, 8)}.mp4`;

  const outputPath = path.join(profile.exportPath, baseName);

  try {
    await mkdir(profile.exportPath, { recursive: true });
    await copyFile(sourcePath, outputPath);

    let resultPosterPath: string | undefined;

    if (posterPath) {
      const posterExt = path.extname(posterPath);
      const posterBase = path.basename(outputPath, path.extname(outputPath));
      resultPosterPath = path.join(profile.exportPath, `${posterBase}-poster${posterExt}`);
      await copyFile(posterPath, resultPosterPath);
    }

    const nfoPath = path.join(profile.exportPath, `${path.basename(outputPath, ".mp4")}.nfo`);
    const nfoContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<episodedetails>
  <title>${escapeXml(pageTitle)}</title>
  <runtime>${Math.round(durationSec)}</runtime>
  <thumb>${resultPosterPath ? path.basename(resultPosterPath) : ""}</thumb>
</episodedetails>`;

    await writeFile(nfoPath, nfoContent, "utf-8");

    logger.info("Published artifact", { outputPath, pageId });

    return {
      outputPath,
      posterPath: resultPosterPath,
      nfoPath,
      success: true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Publish failed", { outputPath, error: msg });
    return {
      outputPath: "",
      success: false,
      error: msg,
    };
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
