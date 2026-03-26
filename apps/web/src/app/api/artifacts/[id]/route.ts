export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { rm } from 'node:fs/promises'
import { getDb, schema } from '@/db'

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
	const db = await getDb()
	const [artifact] = await db.select().from(schema.publishedArtifacts).where(eq(schema.publishedArtifacts.id, params.id)).limit(1)

	if (!artifact) {
		return NextResponse.json({ error: 'Artifact not found' }, { status: 404 })
	}

	// Clear channel bindings that reference this artifact
	await db.update(schema.channelDefinitions).set({ artifactId: null }).where(eq(schema.channelDefinitions.artifactId, artifact.id))

	// Delete the artifact record from DB
	await db.delete(schema.publishedArtifacts).where(eq(schema.publishedArtifacts.id, artifact.id))

	// Clean up files from disk
	const filesToDelete = [artifact.outputPath]
	if (artifact.posterPath) filesToDelete.push(artifact.posterPath)
	// .nfo sidecar
	const nfoPath = artifact.outputPath.replace(/\.[^.]+$/, '.nfo')
	if (nfoPath !== artifact.outputPath) filesToDelete.push(nfoPath)

	for (const file of filesToDelete) {
		try {
			await rm(file, { force: true })
		} catch {
			// file may already be gone
		}
	}

	return NextResponse.json({ success: true, deletedFiles: filesToDelete })
}
