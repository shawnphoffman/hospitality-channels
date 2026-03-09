import path from "node:path";
import { chromium } from "playwright";
import { RENDER_DEFAULTS, RENDER_RESOLUTION, createLogger } from "@hospitality-channels/common";

const logger = createLogger("render-core:capture");

export interface CaptureOptions {
  url: string;
  outputPath: string;
  durationSec?: number;
  fps?: number;
  width?: number;
  height?: number;
}

export interface CaptureResult {
  outputPath: string;
  durationSec: number;
  success: boolean;
  error?: string;
}

export async function capturePageVideo(options: CaptureOptions): Promise<CaptureResult> {
  const {
    url,
    outputPath,
    durationSec = RENDER_DEFAULTS.durationSec,
    fps = RENDER_DEFAULTS.fps,
    width = RENDER_RESOLUTION.width,
    height = RENDER_RESOLUTION.height,
  } = options;

  const outputDir = path.dirname(outputPath);
  await import("node:fs/promises").then((fs) => fs.mkdir(outputDir, { recursive: true }));

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      recordVideo: {
        dir: outputDir,
        size: { width, height },
      },
    });

    const page = await context.newPage();

    // Render mode: disable live clocks, freeze random, preload assets
    await page.addInitScript(() => {
      (window as unknown as { __RENDER_MODE__: boolean }).__RENDER_MODE__ = true;
    });

    await page.goto(url, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    // Wait for fonts and images
    await page.evaluate(() => {
      return document.fonts.ready;
    });

    // Trigger animation start if the page exposes it
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("render-start"));
    });

    // Capture for the specified duration
    const durationMs = durationSec * 1000;
    await new Promise((resolve) => setTimeout(resolve, durationMs));

    const video = page.video();
    if (!video) {
      await context.close();
      return { outputPath: "", durationSec: 0, success: false, error: "No video recorded" };
    }

    const recordedPath = await video.path();
    await context.close();

    if (!recordedPath) {
      return { outputPath: "", durationSec: 0, success: false, error: "Video path not available" };
    }

    logger.info("Capture complete", { url, durationSec, recordedPath });

    return {
      outputPath: recordedPath,
      durationSec,
      success: true,
    };
  } catch (err) {
    logger.error("Capture failed", { url, error: String(err) });
    return {
      outputPath: "",
      durationSec: 0,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await browser.close();
  }
}
