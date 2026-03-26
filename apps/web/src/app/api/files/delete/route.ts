export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { rm } from 'node:fs/promises'
import { getDb, schema } from '@/db'
import { eq } from 'drizzle-orm'

export async function POST(request: Request) {
	const { filePath, cleanupRefs } = await request.json()

	if (!filePath || typeof filePath !== 'string') {
		return NextResponse.json({ error: 'filePath is required' }, { status: 400 })
	}

	const db = await getDb()
	const cleaned: string[] = []

	// If requested, clean up DB references that point to this file
	if (cleanupRefs) {
		// Find and remove artifact records that reference this file
		const artifacts = await db.select().from(schema.publishedArtifacts)
		const matchingArtifacts = artifacts.filter(a => a.outputPath === filePath || a.posterPath === filePath)

		for (const artifact of matchingArtifacts) {
			// Clear channel bindings that reference this artifact
			await db.update(schema.channelDefinitions).set({ artifactId: null }).where(eq(schema.channelDefinitions.artifactId, artifact.id))
			cleaned.push(`channel binding for artifact ${artifact.id}`)

			// Delete the artifact record
			await db.delete(schema.publishedArtifacts).where(eq(schema.publishedArtifacts.id, artifact.id))
			cleaned.push(`artifact ${artifact.id}`)

			// Try to clean up sidecar files (.nfo, poster)
			if (artifact.posterPath && artifact.posterPath !== filePath) {
				try {
					await rm(artifact.posterPath, { force: true })
					cleaned.push(`poster ${artifact.posterPath}`)
				} catch {
					// already gone
				}
			}
			// Try removing .nfo sidecar
			const nfoPath = artifact.outputPath.replace(/\.[^.]+$/, '.nfo')
			if (nfoPath !== artifact.outputPath) {
				try {
					await rm(nfoPath, { force: true })
					cleaned.push(`nfo ${nfoPath}`)
				} catch {
					// already gone
				}
			}
		}

		// Clear job output paths that reference this file
		const jobs = await db.select().from(schema.jobs)
		const matchingJobs = jobs.filter(j => j.outputPath === filePath)
		for (const job of matchingJobs) {
			await db.update(schema.jobs).set({ outputPath: null }).where(eq(schema.jobs.id, job.id))
			cleaned.push(`job ${job.id} outputPath`)
		}
	}

	// Delete the file from disk
	try {
		await rm(filePath, { force: true })
	} catch (err) {
		return NextResponse.json({ error: `Failed to delete file: ${err}` }, { status: 500 })
	}

	return NextResponse.json({ success: true, cleaned })
}
