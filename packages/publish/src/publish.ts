import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { createLogger } from '@hospitality-channels/common'
import type { PublishProfile } from '@hospitality-channels/content-model'

const logger = createLogger('publish')

export interface PublishArtifactInput {
	sourcePath: string
	clipId?: string
	clipTitle?: string
	programId?: string
	programTitle?: string
	programDescription?: string
	programSummary?: string
	profile: PublishProfile
	posterPath?: string
	durationSec: number
	generateNfo?: boolean
}

export interface PublishArtifactResult {
	outputPath: string
	posterPath?: string
	nfoPath?: string
	success: boolean
	error?: string
}

function sanitizeFilename(str: string): string {
	return str.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-')
}

export async function publishArtifact(input: PublishArtifactInput): Promise<PublishArtifactResult> {
	const { sourcePath, clipId, clipTitle, programId, programTitle, programDescription, programSummary, profile, posterPath, durationSec } =
		input

	const id = programId ?? clipId ?? 'unknown'
	const title = programTitle ?? clipTitle ?? 'Untitled'

	const baseName = profile.fileNamingPattern
		? profile.fileNamingPattern
				.replace('{clipId}', id)
				.replace('{pageId}', id)
				.replace('{programId}', programId ?? '')
				.replace('{title}', sanitizeFilename(title))
				.replace('{timestamp}', Date.now().toString())
		: `${sanitizeFilename(title)}-${id.slice(0, 8)}.mp4`

	const outputPath = path.join(profile.exportPath, baseName)

	try {
		await mkdir(profile.exportPath, { recursive: true })
		await copyFile(sourcePath, outputPath)

		let resultPosterPath: string | undefined

		if (posterPath) {
			const posterExt = path.extname(posterPath)
			const posterBase = path.basename(outputPath, path.extname(outputPath))
			resultPosterPath = path.join(profile.exportPath, `${posterBase}-poster${posterExt}`)
			await copyFile(posterPath, resultPosterPath)
		}

		let nfoPath: string | undefined
		if (input.generateNfo !== false) {
			nfoPath = path.join(profile.exportPath, `${path.basename(outputPath, '.mp4')}.nfo`)
			const nfoLines = [
				'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
				'<episodedetails>',
				`  <title>${escapeXml(title)}</title>`,
				`  <runtime>${Math.round(durationSec)}</runtime>`,
				`  <thumb>${resultPosterPath ? path.basename(resultPosterPath) : ''}</thumb>`,
			]
			if (programDescription) {
				nfoLines.push(`  <plot>${escapeXml(programDescription)}</plot>`)
			}
			if (programSummary) {
				nfoLines.push(`  <outline>${escapeXml(programSummary)}</outline>`)
			}
			nfoLines.push(`  <aired>${new Date().toISOString().split('T')[0]}</aired>`)
			nfoLines.push('</episodedetails>')
			await writeFile(nfoPath, nfoLines.join('\n'), 'utf-8')
		}

		logger.info('Published artifact', { outputPath, id, title, nfo: !!nfoPath })

		return {
			outputPath,
			posterPath: resultPosterPath,
			nfoPath,
			success: true,
		}
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		logger.error('Publish failed', { outputPath, error: msg })
		return {
			outputPath: '',
			success: false,
			error: msg,
		}
	}
}

function escapeXml(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
