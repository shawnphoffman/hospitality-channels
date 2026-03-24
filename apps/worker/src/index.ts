import { createLogger } from "@hospitality-channels/common";
import { dequeue, completeJob, failJob } from "./queue.js";
import {
  handleRenderJob,
  handlePublishJob,
  handleRenderPublishJob
} from "./handlers.js";

const logger = createLogger("worker");

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS) || 2000;
let running = true;

async function processNextJob(): Promise<boolean> {
  const job = await dequeue();
  if (!job) return false;

  try {
    let outputPath: string | undefined;

    switch (job.type) {
      case "render":
        outputPath = await handleRenderJob(job);
        break;
      case "publish":
        outputPath = await handlePublishJob(job);
        break;
      case "render-publish":
        outputPath = await handleRenderPublishJob(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }

    await completeJob(job.id, outputPath);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("Job processing failed", {
      jobId: job.id,
      type: job.type,
      error: msg
    });
    await failJob(job.id, msg);
    return true;
  }
}

async function run(): Promise<void> {
  logger.info("Worker started, polling for jobs...");

  while (running) {
    try {
      const processed = await processNextJob();
      if (!processed) {
        await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    } catch (err) {
      logger.error("Unexpected error in job loop", { error: String(err) });
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }

  logger.info("Worker shutting down");
}

function shutdown(): void {
  logger.info("Shutdown signal received");
  running = false;
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run().catch(err => {
  logger.error("Worker crashed", { error: String(err) });
  process.exit(1);
});
