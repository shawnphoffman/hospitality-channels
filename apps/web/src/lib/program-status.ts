import { getDb, schema } from '@/db'

type Db = Awaited<ReturnType<typeof getDb>>

export type ProgramStatus = 'onair' | 'published' | 'rendered' | 'failed' | 'draft'

export interface ProgramChannelBinding {
	label: string
	tunarrChannelId: string | null
	pushMode: string | null
}

export interface ProgramLatestJob {
	status: string
	createdAt: string
	outputPath: string | null
	error: string | null
}

export interface ProgramStatusInfo {
	status: ProgramStatus
	binding: ProgramChannelBinding | null
	artifactCount: number
	latestJob: ProgramLatestJob | null
}

/**
 * Derives the pipeline status for every program that has any signal
 * (channel binding, published artifact, or render job).
 *
 * Programs absent from the returned map are drafts: callers should fall
 * back to status 'draft' with no binding.
 */
export async function deriveProgramStatuses(db: Db): Promise<Map<string, ProgramStatusInfo>> {
	const [artifacts, channelDefs, jobs] = await Promise.all([
		db
			.select({
				id: schema.publishedArtifacts.id,
				programId: schema.publishedArtifacts.programId,
			})
			.from(schema.publishedArtifacts),
		db.select().from(schema.channelDefinitions),
		db
			.select({
				programId: schema.jobs.programId,
				status: schema.jobs.status,
				createdAt: schema.jobs.createdAt,
				outputPath: schema.jobs.outputPath,
				error: schema.jobs.error,
			})
			.from(schema.jobs),
	])

	const artifactProgramById = new Map(artifacts.map(a => [a.id, a.programId]))

	// Channel bindings may reference a program directly or through an artifact
	const bindingByProgram = new Map<string, ProgramChannelBinding>()
	for (const cd of channelDefs) {
		if (!cd.enabled) continue
		const programId = cd.programId ?? (cd.artifactId ? artifactProgramById.get(cd.artifactId) : null)
		if (programId && !bindingByProgram.has(programId)) {
			bindingByProgram.set(programId, {
				label: `Ch ${cd.channelNumber} · ${cd.channelName}`,
				tunarrChannelId: cd.tunarrChannelId,
				pushMode: cd.pushMode,
			})
		}
	}

	const artifactCountByProgram = new Map<string, number>()
	for (const a of artifacts) {
		if (a.programId) artifactCountByProgram.set(a.programId, (artifactCountByProgram.get(a.programId) ?? 0) + 1)
	}

	// Latest job per program decides failed/rendered when nothing is published
	const latestJobByProgram = new Map<string, ProgramLatestJob>()
	for (const j of jobs) {
		if (!j.programId) continue
		const prev = latestJobByProgram.get(j.programId)
		if (!prev || j.createdAt > prev.createdAt) latestJobByProgram.set(j.programId, j)
	}

	const programIds = new Set<string>([...bindingByProgram.keys(), ...artifactCountByProgram.keys(), ...latestJobByProgram.keys()])

	const statuses = new Map<string, ProgramStatusInfo>()
	for (const programId of programIds) {
		const binding = bindingByProgram.get(programId) ?? null
		const artifactCount = artifactCountByProgram.get(programId) ?? 0
		const latestJob = latestJobByProgram.get(programId) ?? null

		let status: ProgramStatus
		if (binding) status = 'onair'
		else if (artifactCount > 0) status = 'published'
		else if (latestJob?.status === 'failed') status = 'failed'
		else if (latestJob?.status === 'completed' && latestJob.outputPath) status = 'rendered'
		else status = 'draft'

		statuses.set(programId, { status, binding, artifactCount, latestJob })
	}

	return statuses
}
