import { eq, asc } from "drizzle-orm";
import { createLogger } from "@hospitality-channels/common";
import { db, jobs } from "./db.js";

const logger = createLogger("worker:queue");

export type JobType = "render" | "publish";

export interface Job {
  id: string;
  type: string;
  clipId: string | null;
  profileId: string | null;
  payload: Record<string, unknown>;
  status: string;
  outputPath: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export async function dequeue(): Promise<Job | null> {
  const [row] = await db
    .select()
    .from(jobs)
    .where(eq(jobs.status, "queued"))
    .orderBy(asc(jobs.createdAt))
    .limit(1);

  if (!row) return null;

  await db
    .update(jobs)
    .set({ status: "processing", startedAt: new Date().toISOString() })
    .where(eq(jobs.id, row.id));

  logger.info("Job dequeued", { id: row.id, type: row.type });

  return {
    ...row,
    payload: (row.payload ?? {}) as Record<string, unknown>,
  } as Job;
}

export async function completeJob(id: string, outputPath?: string): Promise<void> {
  await db
    .update(jobs)
    .set({
      status: "completed",
      outputPath: outputPath ?? null,
      completedAt: new Date().toISOString(),
    })
    .where(eq(jobs.id, id));

  logger.info("Job completed", { id, outputPath });
}

export async function failJob(id: string, error: string): Promise<void> {
  await db
    .update(jobs)
    .set({
      status: "failed",
      error,
      completedAt: new Date().toISOString(),
    })
    .where(eq(jobs.id, id));

  logger.error("Job failed", { id, error });
}
