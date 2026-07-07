import { createLogger } from '@hospitality-channels/common'
import { ensureWorkerColumns } from './db.js'
import { dequeue, completeJob, failJob, requeueJob, recoverStuckJobs, MAX_JOB_ATTEMPTS } from './queue.js'
import { sweepStaleTempFiles } from './maintenance.js'
import {
	handleRenderJob,
	handlePublishJob,
	handleRenderPublishJob,
	handleRenderProgramJob,
	handleRenderProgramPublishJob,
} from './handlers.js'

const logger = createLogger('worker')

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS) || 2000
const SWEEP_INTERVAL_MS = 6 * 60 * 60 * 1000
let running = true

async function processNextJob(): Promise<boolean> {
	const job = await dequeue()
	if (!job) return false

	try {
		let outputPath: string | undefined

		switch (job.type) {
			case 'render':
				outputPath = await handleRenderJob(job)
				break
			case 'publish':
				outputPath = await handlePublishJob(job)
				break
			case 'render-publish':
				outputPath = await handleRenderPublishJob(job)
				break
			case 'render-program':
				outputPath = await handleRenderProgramJob(job)
				break
			case 'render-program-publish':
				outputPath = await handleRenderProgramPublishJob(job)
				break
			default:
				throw new Error(`Unknown job type: ${job.type}`)
		}

		await completeJob(job.id, outputPath)
		return true
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		logger.error('Job processing failed', {
			jobId: job.id,
			type: job.type,
			attempt: job.attempts,
			error: msg,
		})
		if (job.attempts < MAX_JOB_ATTEMPTS) {
			await requeueJob(job.id, msg)
		} else {
			await failJob(job.id, msg)
		}
		return true
	}
}

async function run(): Promise<void> {
	logger.info('Worker started, polling for jobs...')

	await ensureWorkerColumns().catch(err => {
		logger.warn('Failed to ensure worker columns (will rely on web app migrations)', { error: String(err) })
	})
	await recoverStuckJobs().catch(err => {
		logger.warn('Failed to recover stuck jobs', { error: String(err) })
	})
	await sweepStaleTempFiles().catch(err => {
		logger.warn('Temp file sweep failed', { error: String(err) })
	})
	let lastSweepMs = Date.now()

	while (running) {
		try {
			const processed = await processNextJob()
			if (!processed) {
				await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
			}
			if (Date.now() - lastSweepMs > SWEEP_INTERVAL_MS) {
				lastSweepMs = Date.now()
				await sweepStaleTempFiles().catch(err => {
					logger.warn('Temp file sweep failed', { error: String(err) })
				})
			}
		} catch (err) {
			logger.error('Unexpected error in job loop', { error: String(err) })
			await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
		}
	}

	logger.info('Worker shutting down')
}

function shutdown(): void {
	logger.info('Shutdown signal received')
	running = false
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

run().catch(err => {
	logger.error('Worker crashed', { error: String(err) })
	process.exit(1)
})
