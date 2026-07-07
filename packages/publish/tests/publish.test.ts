import { mkdtempSync } from 'node:fs'
import { readFile, writeFile, access } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { publishArtifact } from '../src/publish.js'

let workDir: string
let sourcePath: string

beforeAll(async () => {
	workDir = mkdtempSync(path.join(tmpdir(), 'publish-test-'))
	sourcePath = path.join(workDir, 'source.mp4')
	await writeFile(sourcePath, 'fake mp4 bytes')
})

function exportDir(name: string): string {
	return path.join(workDir, name)
}

describe('publishArtifact filename patterns', () => {
	it('expands {title}, {seq} and {clipId} with a zero-padded sequence', async () => {
		const result = await publishArtifact({
			sourcePath,
			clipId: 'clip123',
			clipTitle: 'My Clip',
			profile: {
				name: 'test',
				exportPath: exportDir('pattern'),
				outputFormat: 'mp4',
				fileNamingPattern: '{title}-{clipId}-{seq}.mp4',
			},
			durationSec: 30,
			generateNfo: false,
			sequenceNumber: 7,
		})

		expect(result.success).toBe(true)
		expect(path.basename(result.outputPath)).toBe('My-Clip-clip123-007.mp4')
		await expect(access(result.outputPath)).resolves.toBeUndefined()
	})

	it('expands {date} as YYYY-MM-DD', async () => {
		const result = await publishArtifact({
			sourcePath,
			clipId: 'clip123',
			clipTitle: 'Dated',
			profile: {
				name: 'test',
				exportPath: exportDir('dated'),
				outputFormat: 'mp4',
				fileNamingPattern: 'v-{date}.mp4',
			},
			durationSec: 30,
			generateNfo: false,
		})

		expect(result.success).toBe(true)
		expect(path.basename(result.outputPath)).toMatch(/^v-\d{4}-\d{2}-\d{2}\.mp4$/)
	})

	it('falls back to a sanitized title when no pattern is configured', async () => {
		const result = await publishArtifact({
			sourcePath,
			clipId: 'clip123',
			clipTitle: 'Wi-Fi & Pool Hours! (v2)',
			profile: {
				name: 'test',
				exportPath: exportDir('fallback'),
				outputFormat: 'mp4',
			},
			durationSec: 30,
			generateNfo: false,
		})

		expect(result.success).toBe(true)
		const base = path.basename(result.outputPath)
		expect(base.endsWith('.mp4')).toBe(true)
		expect(base).not.toMatch(/[^a-zA-Z0-9-_.]/)
	})

	it('prefers program identity over clip identity', async () => {
		const result = await publishArtifact({
			sourcePath,
			clipId: 'clip123',
			clipTitle: 'Clip Title',
			programId: 'prog456',
			programTitle: 'Program Title',
			profile: {
				name: 'test',
				exportPath: exportDir('program'),
				outputFormat: 'mp4',
				fileNamingPattern: '{title}-{programId}.mp4',
			},
			durationSec: 30,
			generateNfo: false,
		})

		expect(result.success).toBe(true)
		expect(path.basename(result.outputPath)).toBe('Program-Title-prog456.mp4')
	})
})

describe('publishArtifact NFO generation', () => {
	it('writes an NFO with escaped XML and rounded runtime', async () => {
		const result = await publishArtifact({
			sourcePath,
			programId: 'prog1',
			programTitle: 'Lobby <TV> & Info',
			programDescription: 'A & B',
			programSummary: 'Short "summary"',
			profile: {
				name: 'test',
				exportPath: exportDir('nfo'),
				outputFormat: 'mp4',
				fileNamingPattern: 'lobby.mp4',
			},
			durationSec: 90.6,
		})

		expect(result.success).toBe(true)
		expect(result.nfoPath).toBeTruthy()
		const nfo = await readFile(result.nfoPath!, 'utf-8')
		expect(nfo).toContain('<title>Lobby &lt;TV&gt; &amp; Info</title>')
		expect(nfo).toContain('<runtime>91</runtime>')
		expect(nfo).toContain('<plot>A &amp; B</plot>')
		expect(nfo).toContain('<outline>Short &quot;summary&quot;</outline>')
	})

	it('copies the poster next to the artifact', async () => {
		const posterSource = path.join(workDir, 'poster.png')
		await writeFile(posterSource, 'fake png bytes')

		const result = await publishArtifact({
			sourcePath,
			clipId: 'clip1',
			clipTitle: 'Poster Clip',
			posterPath: posterSource,
			profile: {
				name: 'test',
				exportPath: exportDir('poster'),
				outputFormat: 'mp4',
				fileNamingPattern: 'poster-clip.mp4',
			},
			durationSec: 30,
			generateNfo: true,
		})

		expect(result.success).toBe(true)
		expect(result.posterPath && path.basename(result.posterPath)).toBe('poster-clip-poster.png')
		await expect(access(result.posterPath!)).resolves.toBeUndefined()
	})
})

describe('publishArtifact failure handling', () => {
	it('returns success=false instead of throwing when the source is missing', async () => {
		const result = await publishArtifact({
			sourcePath: path.join(workDir, 'does-not-exist.mp4'),
			clipId: 'clip1',
			clipTitle: 'Missing',
			profile: {
				name: 'test',
				exportPath: exportDir('missing'),
				outputFormat: 'mp4',
			},
			durationSec: 30,
		})

		expect(result.success).toBe(false)
		expect(result.error).toBeTruthy()
	})
})
