import { spawn } from "node:child_process";
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
  trimSec: number;
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
  const fs = await import("node:fs/promises");
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });

    const page = await ctx.newPage();
    page.addInitScript(() => {
      (window as unknown as { __RENDER_MODE__: boolean }).__RENDER_MODE__ = true;
    });

    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    );

    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("render-start"));
    });

    // Let any enter-animations / initial paints settle
    await new Promise((resolve) => setTimeout(resolve, 500));

    const screenshotPath = path.join(outputDir, `_frame-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, type: "png" });
    logger.info("Screenshot captured", { url, screenshotPath });

    await ctx.close();

    // Use FFmpeg to loop the single frame into a video of the requested duration
    const ffmpegResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      const proc = spawn("ffmpeg", [
        "-y",
        "-loop", "1",
        "-framerate", String(fps),
        "-i", screenshotPath,
        "-c:v", "libx264",
        "-preset", "slow",
        "-crf", "18",
        "-tune", "stillimage",
        "-t", String(durationSec),
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        outputPath,
      ], {
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stderr = "";
      proc.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: stderr.slice(-500) });
        }
      });

      proc.on("error", (err) => {
        resolve({ success: false, error: err.message });
      });
    });

    // Clean up the temporary screenshot
    await fs.unlink(screenshotPath).catch(() => {});

    if (!ffmpegResult.success) {
      return {
        outputPath: "",
        durationSec: 0,
        trimSec: 0,
        success: false,
        error: `FFmpeg encoding failed: ${ffmpegResult.error}`,
      };
    }

    logger.info("Capture complete", { url, durationSec, outputPath });

    return {
      outputPath,
      durationSec,
      trimSec: 0,
      success: true,
    };
  } catch (err) {
    logger.error("Capture failed", { url, error: String(err) });
    return {
      outputPath: "",
      durationSec: 0,
      trimSec: 0,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    await browser.close();
  }
}
