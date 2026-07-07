export const dynamic = 'force-dynamic'

import { desc, eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { JobsList, type JobRow, type JobStep } from './jobs-list'

export default async function JobsPage() {
	const db = await getDb()
	const rows = await db
		.select({
			job: schema.jobs,
			programTitle: schema.programs.title,
			clipTitle: schema.clips.title,
		})
		.from(schema.jobs)
		.leftJoin(schema.programs, eq(schema.jobs.programId, schema.programs.id))
		.leftJoin(schema.clips, eq(schema.jobs.clipId, schema.clips.id))
		.orderBy(desc(schema.jobs.createdAt))
		.limit(100)

	const jobs: JobRow[] = rows.map(({ job, programTitle, clipTitle }) => ({
		id: job.id,
		type: job.type,
		status: job.status,
		error: job.error,
		attempts: job.attempts,
		steps: (job.steps as JobStep[] | null) ?? null,
		outputPath: job.outputPath,
		createdAt: job.createdAt,
		startedAt: job.startedAt,
		completedAt: job.completedAt,
		label: programTitle ?? clipTitle ?? job.type,
		href: job.programId ? `/programs/${job.programId}` : job.clipId ? `/clips/${job.clipId}` : null,
	}))

	return (
		<div>
			<h2 className="mb-2 text-2xl font-bold text-white">Jobs</h2>
			<p className="mb-6 text-sm text-slate-500">
				Render, export, and channel-push activity. Expand a job to see its pipeline steps and the full error message.
			</p>
			<JobsList jobs={jobs} />
		</div>
	)
}
