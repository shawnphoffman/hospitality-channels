import { createLogger } from "@hospitality-channels/common";

const logger = createLogger("worker:queue");

export type JobType = "render" | "publish";

export interface Job {
  id: string;
  type: JobType;
  payload: Record<string, unknown>;
  status: "queued" | "processing" | "completed" | "failed";
  createdAt: string;
  error?: string;
}

const jobs: Job[] = [];

export function enqueue(type: JobType, payload: Record<string, unknown>): Job {
  const job: Job = {
    id: `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    type,
    payload,
    status: "queued",
    createdAt: new Date().toISOString(),
  };
  jobs.push(job);
  logger.info("Job enqueued", { id: job.id, type });
  return job;
}

export function dequeue(): Job | undefined {
  const job = jobs.find((j) => j.status === "queued");
  if (job) {
    job.status = "processing";
    logger.info("Job dequeued", { id: job.id, type: job.type });
  }
  return job;
}

export function completeJob(id: string): void {
  const job = jobs.find((j) => j.id === id);
  if (job) {
    job.status = "completed";
    logger.info("Job completed", { id });
  }
}

export function failJob(id: string, error: string): void {
  const job = jobs.find((j) => j.id === id);
  if (job) {
    job.status = "failed";
    job.error = error;
    logger.error("Job failed", { id, error });
  }
}

export function getJobs(): Job[] {
  return [...jobs];
}
