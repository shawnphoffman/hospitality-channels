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
    // Phase 1: Pre-warm — load the page without recording so everything
    // (network, React hydration, fonts, images) is cached and settled.
    const warmupCtx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const warmupPage = await warmupCtx.newPage();
    warmupPage.addInitScript(() => {
      (window as unknown as { __RENDER_MODE__: boolean }).__RENDER_MODE__ = true;
    });

    await warmupPage.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await warmupPage.evaluate(() => document.fonts.ready);
    // Give React/CSS a beat to fully paint
    await new Promise((resolve) => setTimeout(resolve, 1000));

    logger.info("Pre-warm complete, starting recording", { url });
    await warmupCtx.close();

    // Phase 2: Record — the browser cache is warm so the page loads near-instantly.
    const recordCtx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      recordVideo: {
        dir: outputDir,
        size: { width, height },
      },
    });

    const recordPage = await recordCtx.newPage();
    recordPage.addInitScript(() => {
      (window as unknown as { __RENDER_MODE__: boolean }).__RENDER_MODE__ = true;
    });

    await recordPage.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await recordPage.evaluate(() => document.fonts.ready);

    // Wait for a full paint frame before counting the capture duration
    await recordPage.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

    await recordPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("render-start"));
    });

    // Record slightly longer to compensate for FFmpeg's -ss 0.5 trim
    const durationMs = (durationSec + 1) * 1000;
    await new Promise((resolve) => setTimeout(resolve, durationMs));

    const video = recordPage.video();
    if (!video) {
      await recordCtx.close();
      return { outputPath: "", durationSec: 0, success: false, error: "No video recorded" };
    }

    const recordedPath = await video.path();
    await recordCtx.close();

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
