import { createLogger } from "@hospitality-channels/common";
import { dequeue, completeJob, failJob } from "./queue.js";
import { handleRenderJob, handlePublishJob } from "./handlers.js";

const logger = createLogger("worker");

const POLL_INTERVAL_MS = 2000;
let running = true;

async function processNextJob(): Promise<boolean> {
  const job = dequeue();
  if (!job) return false;

  try {
    switch (job.type) {
      case "render":
        await handleRenderJob(job);
        break;
      case "publish":
        await handlePublishJob(job);
        break;
      default:
        throw new Error(`Unknown job type: ${job.type}`);
    }
    completeJob(job.id);
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    failJob(job.id, msg);
    return true;
  }
}

async function run(): Promise<void> {
  logger.info("Worker started");

  while (running) {
    const processed = await processNextJob();
    if (!processed) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
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

run().catch((err) => {
  logger.error("Worker crashed", { error: String(err) });
  process.exit(1);
});
