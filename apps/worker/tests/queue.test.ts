import { mkdtempSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'

/**
 * The worker resolves its SQLite path from process.cwd() at import time
 * (repo-root/data in development), so we chdir into a temp directory BEFORE
 * dynamically importing the db/queue modules. That gives the whole suite an
 * isolated throwaway database.
 */

type DbModule = typeof import('../src/db.js')
type QueueModule = typeof import('../src/queue.js')

let db: DbModule['db']
let jobs: DbModule['jobs']
let queue: QueueModule
let originalCwd: string

const LEGACY_JOBS_TABLE_SQL = `CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  page_id TEXT,
  program_id TEXT,
  profile_id TEXT,
  payload TEXT DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued',
  output_path TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT
)`

beforeAll(async () => {
	originalCwd = process.cwd()
	const tempRoot = mkdtempSync(path.join(tmpdir(), 'worker-queue-test-'))
	const appDir = path.join(tempRoot, 'app')
	mkdirSync(appDir, { recursive: true })
	process.chdir(appDir)

	const dbModule = await import('../src/db.js')
	db = dbModule.db
	jobs = dbModule.jobs
	queue = await import('../src/queue.js')

	// Create the jobs table as a pre-attempts-column release would have,
	// then let the worker's safety net add the new column.
	await db.run(sql.raw(LEGACY_JOBS_TABLE_SQL))
	await dbModule.ensureWorkerColumns()
})

afterAll(() => {
	process.chdir(originalCwd)
})

async function insertJob(id: string, overrides: Partial<typeof jobs.$inferInsert> = {}) {
	await db.insert(jobs).values({
		id,
		type: 'render',
		status: 'queued',
		createdAt: new Date().toISOString(),
		...overrides,
	})
}

async function getJob(id: string) {
	const rows = await db.select().from(jobs)
	return rows.find(r => r.id === id)
}

describe('queue lifecycle', () => {
	it('returns null when the queue is empty', async () => {
		expect(await queue.dequeue()).toBeNull()
	})

	it('dequeues the oldest queued job and marks it processing with attempts=1', async () => {
		await insertJob('job-old', { createdAt: '2026-01-01T00:00:00.000Z' })
		await insertJob('job-new', { createdAt: '2026-01-02T00:00:00.000Z' })

		const job = await queue.dequeue()
		expect(job?.id).toBe('job-old')
		expect(job?.attempts).toBe(1)

		const stored = await getJob('job-old')
		expect(stored?.status).toBe('processing')
		expect(stored?.attempts).toBe(1)
		expect(stored?.startedAt).toBeTruthy()
	})

	it('completes a job with its output path', async () => {
		await queue.completeJob('job-old', '/tmp/out.mp4')
		const stored = await getJob('job-old')
		expect(stored?.status).toBe('completed')
		expect(stored?.outputPath).toBe('/tmp/out.mp4')
		expect(stored?.completedAt).toBeTruthy()
	})

	it('requeues a failed attempt and increments attempts on the next dequeue', async () => {
		const first = await queue.dequeue()
		expect(first?.id).toBe('job-new')

		await queue.requeueJob('job-new', 'transient failure')
		let stored = await getJob('job-new')
		expect(stored?.status).toBe('queued')
		expect(stored?.error).toBe('transient failure')
		expect(stored?.startedAt).toBeNull()

		const second = await queue.dequeue()
		expect(second?.id).toBe('job-new')
		expect(second?.attempts).toBe(2)

		await queue.failJob('job-new', 'permanent failure')
		stored = await getJob('job-new')
		expect(stored?.status).toBe('failed')
		expect(stored?.error).toBe('permanent failure')
	})

	it('recovers stuck processing jobs on startup', async () => {
		await insertJob('job-stuck-retryable', {
			status: 'processing',
			attempts: queue.MAX_JOB_ATTEMPTS - 1,
			startedAt: new Date().toISOString(),
		})
		await insertJob('job-stuck-exhausted', {
			status: 'processing',
			attempts: queue.MAX_JOB_ATTEMPTS,
			startedAt: new Date().toISOString(),
		})

		await queue.recoverStuckJobs()

		const retryable = await getJob('job-stuck-retryable')
		expect(retryable?.status).toBe('queued')
		expect(retryable?.startedAt).toBeNull()

		const exhausted = await getJob('job-stuck-exhausted')
		expect(exhausted?.status).toBe('failed')
		expect(exhausted?.error).toContain('Worker restarted')
	})
})
