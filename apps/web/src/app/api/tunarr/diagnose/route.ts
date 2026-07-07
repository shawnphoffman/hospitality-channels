export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { desc, eq } from 'drizzle-orm'
import path from 'node:path'
import { getDb, schema } from '@/db'
import { PATHS } from '@hospitality-channels/common'
import {
	buildExternalKey,
	findProgramByKey,
	getLibraryPrograms,
	getMediaSource,
	getProgramPath,
	listChannels,
	listMediaSources,
	sampleExternalKeys,
	type TunarrMediaLibrary,
} from '@hospitality-channels/publish'

interface DiagnosticStep {
	name: string
	ok: boolean
	detail: string
	suggestion?: string
}

async function getSetting(db: Awaited<ReturnType<typeof getDb>>, key: string): Promise<string | null> {
	const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, key)).limit(1)
	return row?.value ?? null
}

function libraryId(library: TunarrMediaLibrary): string | undefined {
	return (library.id || library.uuid || (library as Record<string, unknown>).libraryId) as string | undefined
}

/**
 * Walks the whole push chain and reports where it breaks: URL reachability,
 * media source and library configuration, library contents, and whether the
 * most recently published artifact maps to a path Tunarr has indexed.
 */
export async function GET() {
	const db = await getDb()
	const steps: DiagnosticStep[] = []

	const tunarrUrl = await getSetting(db, 'tunarr_url')
	if (!tunarrUrl) {
		steps.push({ name: 'Tunarr URL', ok: false, detail: 'No Tunarr URL configured.', suggestion: 'Set the Tunarr URL above and save.' })
		return NextResponse.json({ steps })
	}
	steps.push({ name: 'Tunarr URL', ok: true, detail: tunarrUrl })

	try {
		const channels = await listChannels(tunarrUrl)
		steps.push({ name: 'Connection', ok: true, detail: `Tunarr responded with ${channels.length} channel(s).` })
	} catch (err) {
		steps.push({
			name: 'Connection',
			ok: false,
			detail: err instanceof Error ? err.message : String(err),
			suggestion: 'Check the URL, that Tunarr is running, and that this container can reach it on the network.',
		})
		return NextResponse.json({ steps })
	}

	const mediaSourceId = await getSetting(db, 'tunarr_media_source_id')
	const configuredLibraryId = await getSetting(db, 'tunarr_library_id')

	let resolvedLibraryId: string | undefined
	try {
		const sources = await listMediaSources(tunarrUrl)
		if (mediaSourceId) {
			const source = sources.find(s => s.id === mediaSourceId)
			if (!source) {
				steps.push({
					name: 'Media source',
					ok: false,
					detail: `Configured media source "${mediaSourceId}" no longer exists in Tunarr (${sources.length} available).`,
					suggestion: 'Re-select the media source in the settings above.',
				})
				return NextResponse.json({ steps })
			}
			steps.push({ name: 'Media source', ok: true, detail: `"${source.name}" (${source.type})` })

			const fullSource = await getMediaSource(tunarrUrl, source.id)
			const libraries = fullSource.libraries ?? []
			const library = configuredLibraryId ? libraries.find(l => libraryId(l) === configuredLibraryId) : libraries[0]
			if (!library || !libraryId(library)) {
				steps.push({
					name: 'Library',
					ok: false,
					detail: configuredLibraryId
						? `Configured library "${configuredLibraryId}" not found in "${source.name}" (${libraries.length} available).`
						: `Media source "${source.name}" has no libraries.`,
					suggestion: 'Re-select the library in the settings above, or add one in Tunarr.',
				})
				return NextResponse.json({ steps })
			}
			resolvedLibraryId = libraryId(library)
			steps.push({
				name: 'Library',
				ok: true,
				detail: `"${library.name}"${configuredLibraryId ? '' : ' (first library, none configured)'}`,
			})
		} else {
			steps.push({
				name: 'Media source',
				ok: sources.length > 0,
				detail: `No media source configured; pushes auto-discover from ${sources.length} source(s).`,
				suggestion:
					sources.length > 0
						? 'Selecting a media source and library above makes pushes faster and more reliable than auto-discovery.'
						: 'Add a media source in Tunarr that covers your export directory.',
			})
			if (sources.length === 0) return NextResponse.json({ steps })
			// Prefer a local source; exports always reach Tunarr through a mounted directory
			const candidate = sources.find(s => s.type === 'local') ?? sources[0]
			const fullSource = await getMediaSource(tunarrUrl, candidate.id)
			resolvedLibraryId = fullSource.libraries?.[0] ? libraryId(fullSource.libraries[0]) : undefined
			if (!resolvedLibraryId) {
				steps.push({ name: 'Library', ok: false, detail: `Media source "${candidate.name}" has no libraries.` })
				return NextResponse.json({ steps })
			}
			steps.push({
				name: 'Library',
				ok: true,
				detail: `Using "${fullSource.libraries?.[0]?.name}" from "${candidate.name}" (auto-discovered)`,
			})
		}
	} catch (err) {
		steps.push({ name: 'Media source', ok: false, detail: err instanceof Error ? err.message : String(err) })
		return NextResponse.json({ steps })
	}

	let programs
	try {
		programs = await getLibraryPrograms(tunarrUrl, resolvedLibraryId!)
		const samples = sampleExternalKeys(programs, 3, getProgramPath)
		steps.push({
			name: 'Library contents',
			ok: programs.length > 0,
			detail:
				programs.length > 0
					? `${programs.length} indexed file(s), e.g. ${samples.map(s => `"${s}"`).join(', ')}`
					: 'The library has no indexed files.',
			suggestion:
				programs.length > 0 ? undefined : 'Check that the export volume is mounted into Tunarr and trigger a library scan in Tunarr.',
		})
		if (programs.length === 0) return NextResponse.json({ steps })
	} catch (err) {
		steps.push({ name: 'Library contents', ok: false, detail: err instanceof Error ? err.message : String(err) })
		return NextResponse.json({ steps })
	}

	const [artifact] = await db.select().from(schema.publishedArtifacts).orderBy(desc(schema.publishedArtifacts.publishedAt)).limit(1)
	if (!artifact) {
		steps.push({ name: 'Artifact mapping', ok: true, detail: 'No published artifacts yet; publish something to test the full chain.' })
		return NextResponse.json({ steps })
	}

	const mediaPath = await getSetting(db, 'tunarr_media_path')
	const externalKey = buildExternalKey(artifact.outputPath, path.resolve(PATHS.exports), mediaPath)
	const match = findProgramByKey(programs, externalKey, getProgramPath)
	if (match.matchedBy === 'exact') {
		steps.push({ name: 'Artifact mapping', ok: true, detail: `Latest artifact resolves to "${externalKey}" and is indexed by Tunarr.` })
	} else if (match.matchedBy === 'basename') {
		steps.push({
			name: 'Artifact mapping',
			ok: false,
			detail: `Latest artifact resolves to "${externalKey}", but Tunarr indexes it as "${match.program ? getProgramPath(match.program) : 'unknown'}".`,
			suggestion: match.suggestedMediaPath
				? `Set the Tunarr media path above to "${match.suggestedMediaPath}".`
				: 'Correct the Tunarr media path above to match how Tunarr sees the export directory.',
		})
	} else {
		steps.push({
			name: 'Artifact mapping',
			ok: false,
			detail: `Latest artifact resolves to "${externalKey}" but nothing similar is indexed. It may not have been scanned yet, or the export volume is not visible to Tunarr.`,
			suggestion: 'Trigger a library scan in Tunarr, and verify the export volume is mounted into Tunarr at the configured media path.',
		})
	}

	return NextResponse.json({ steps })
}
