export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { readdir, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { PATHS } from '@hospitality-channels/common'
import { getDb, schema } from '@/db'
import { eq } from 'drizzle-orm'

interface FileEntry {
	name: string
	path: string
	size: number
	modifiedAt: string
	directory: 'renders' | 'exports'
	/** Whether this file is referenced by a published artifact */
	hasArtifactRef: boolean
	/** Whether this file is referenced by a completed job */
	hasJobRef: boolean
	/** Artifact ID if referenced */
	artifactId?: string
	/** Associated program or clip title */
	title?: string
}

async function scanDirectory(dirPath: string, directory: 'renders' | 'exports'): Promise<FileEntry[]> {
	const entries: FileEntry[] = []
	try {
		const files = await readdir(dirPath, { recursive: true })
		for (const file of files) {
			const fullPath = join(dirPath, file)
			try {
				const s = await stat(fullPath)
				if (!s.isFile()) continue
				entries.push({
					name: String(file),
					path: fullPath,
					size: s.size,
					modifiedAt: s.mtime.toISOString(),
					directory,
					hasArtifactRef: false,
					hasJobRef: false,
				})
			} catch {
				// skip unreadable files
			}
		}
	} catch {
		// directory doesn't exist yet
	}
	return entries
}

export async function GET() {
	const db = await getDb()

	// Scan both directories
	const [renderFiles, exportFiles] = await Promise.all([scanDirectory(PATHS.renders, 'renders'), scanDirectory(PATHS.exports, 'exports')])

	const allFiles = [...renderFiles, ...exportFiles]

	// Load artifact and job references for cross-referencing
	const artifacts = await db.select().from(schema.publishedArtifacts)
	const jobs = await db.select().from(schema.jobs)
	const clips = await db.select().from(schema.clips)
	const programs = await db.select().from(schema.programs)

	// Build lookup sets
	const artifactByPath = new Map(artifacts.map(a => [a.outputPath, a]))
	const artifactByPoster = new Map(artifacts.filter(a => a.posterPath).map(a => [a.posterPath!, a]))
	const jobOutputPaths = new Set(jobs.filter(j => j.outputPath).map(j => j.outputPath!))

	for (const file of allFiles) {
		const artifact = artifactByPath.get(file.path) ?? artifactByPoster.get(file.path)
		if (artifact) {
			file.hasArtifactRef = true
			file.artifactId = artifact.id
			const program = artifact.programId ? programs.find(p => p.id === artifact.programId) : null
			const clip = artifact.clipId ? clips.find(c => c.id === artifact.clipId) : null
			file.title = program?.title ?? clip?.title ?? undefined
		}
		if (jobOutputPaths.has(file.path)) {
			file.hasJobRef = true
		}
	}

	// Sort newest first
	allFiles.sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime())

	return NextResponse.json(allFiles)
}
