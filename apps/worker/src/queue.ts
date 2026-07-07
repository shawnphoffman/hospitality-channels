import { eq, asc } from 'drizzle-orm'
import { createLogger } from '@hospitality-channels/common'
import { db, jobs } from './db.js'

const logger = createLogger('worker:queue')

export type JobType = 'render' | 'publish'

/** Total times a job may be picked up before a failure is final. */
export const MAX_JOB_ATTEMPTS = Math.max(1, Number(process.env.WORKER_JOB_MAX_ATTEMPTS) || 2)

export interface Job {
	id: string
	type: string
	clipId: string | null
	programId: string | null
	profileId: string | null
	payload: Record<string, unknown>
	status: string
	outputPath: string | null
	error: string | null
	attempts: number
	createdAt: string
	startedAt: string | null
	completedAt: string | null
}

export async function dequeue(): Promise<Job | null> {
	const [row] = await db.select().from(jobs).where(eq(jobs.status, 'queued')).orderBy(asc(jobs.createdAt)).limit(1)

	if (!row) return null

	const attempts = (row.attempts ?? 0) + 1
	await db.update(jobs).set({ status: 'processing', attempts, startedAt: new Date().toISOString() }).where(eq(jobs.id, row.id))

	logger.info('Job dequeued', { id: row.id, type: row.type, attempt: attempts })

	return {
		...row,
		attempts,
		payload: (row.payload ?? {}) as Record<string, unknown>,
	} as Job
}

export async function completeJob(id: string, outputPath?: string): Promise<void> {
	await db
		.update(jobs)
		.set({
			status: 'completed',
			outputPath: outputPath ?? null,
			completedAt: new Date().toISOString(),
		})
		.where(eq(jobs.id, id))

	logger.info('Job completed', { id, outputPath })
}

export async function failJob(id: string, error: string): Promise<void> {
	await db
		.update(jobs)
		.set({
			status: 'failed',
			error,
			completedAt: new Date().toISOString(),
		})
		.where(eq(jobs.id, id))

	logger.error('Job failed', { id, error })
}

/** Put a failed attempt back in the queue for another try. */
export async function requeueJob(id: string, error: string): Promise<void> {
	await db
		.update(jobs)
		.set({
			status: 'queued',
			error,
			startedAt: null,
		})
		.where(eq(jobs.id, id))

	logger.warn('Job requeued for retry', { id, error })
}

/**
 * Recovers jobs left in 'processing' by a previous worker that died
 * mid-job (crash, OOM, forced restart). Jobs with attempts remaining are
 * requeued; the rest are marked failed. Call once on startup, before
 * polling begins. Safe because only one worker runs against the database.
 */
export async function recoverStuckJobs(): Promise<void> {
	const stuck = await db.select().from(jobs).where(eq(jobs.status, 'processing'))

	for (const job of stuck) {
		const message = 'Worker restarted while this job was processing'
		if ((job.attempts ?? 0) < MAX_JOB_ATTEMPTS) {
			await requeueJob(job.id, message)
		} else {
			await failJob(job.id, `${message} (attempt limit of ${MAX_JOB_ATTEMPTS} reached)`)
		}
	}

	if (stuck.length > 0) {
		logger.info('Recovered stuck jobs from previous run', { count: stuck.length })
	}
}
