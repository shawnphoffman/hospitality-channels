import { describe, expect, it } from 'vitest'
import { buildExternalKey, findProgramByKey, normalizeKey, sampleExternalKeys, suggestMediaPath } from '../src/tunarr-paths.js'

describe('normalizeKey', () => {
	it('normalizes separators, dot segments, and trailing slashes', () => {
		expect(normalizeKey('/media/tv/')).toBe('/media/tv')
		expect(normalizeKey('/media//tv/./show.mp4')).toBe('/media/tv/show.mp4')
		expect(normalizeKey('C:\\media\\tv\\show.mp4')).toBe('C:/media/tv/show.mp4')
		expect(normalizeKey('/')).toBe('/')
	})
})

describe('buildExternalKey', () => {
	it('remaps an export path onto the Tunarr media path', () => {
		expect(buildExternalKey('/exports/welcome.mp4', '/exports', '/media/hospitality')).toBe('/media/hospitality/welcome.mp4')
	})

	it('keeps the path as-is when already under the media path', () => {
		expect(buildExternalKey('/media/hospitality/welcome.mp4', '/exports', '/media/hospitality')).toBe('/media/hospitality/welcome.mp4')
	})

	it('tolerates a trailing slash on the configured media path', () => {
		expect(buildExternalKey('/exports/welcome.mp4', '/exports', '/media/hospitality/')).toBe('/media/hospitality/welcome.mp4')
	})

	it('returns the artifact path when no media path is configured', () => {
		expect(buildExternalKey('/exports/welcome.mp4', '/exports', null)).toBe('/exports/welcome.mp4')
	})

	it('preserves subdirectories relative to the export dir', () => {
		expect(buildExternalKey('/exports/lobby/welcome.mp4', '/exports', '/media')).toBe('/media/lobby/welcome.mp4')
	})
})

describe('findProgramByKey', () => {
	const programs = [
		{ externalKey: '/media/hospitality/welcome.mp4', title: 'Welcome' },
		{ externalKey: '/media/hospitality/checkout.mp4', title: 'Checkout' },
	]

	it('finds an exact match after normalization', () => {
		const result = findProgramByKey(programs, '/media/hospitality//welcome.mp4')
		expect(result.matchedBy).toBe('exact')
		expect(result.program?.title).toBe('Welcome')
	})

	it('falls back to a unique basename match and suggests the correct media path', () => {
		const result = findProgramByKey(programs, '/exports/welcome.mp4')
		expect(result.matchedBy).toBe('basename')
		expect(result.program?.title).toBe('Welcome')
		expect(result.suggestedMediaPath).toBe('/media/hospitality')
	})

	it('does not guess when multiple programs share the basename', () => {
		const ambiguous = [{ externalKey: '/media/a/welcome.mp4' }, { externalKey: '/media/b/welcome.mp4' }]
		expect(findProgramByKey(ambiguous, '/exports/welcome.mp4').program).toBeNull()
	})

	it('returns null when nothing matches', () => {
		expect(findProgramByKey(programs, '/exports/other.mp4').program).toBeNull()
	})

	it('matches wrapped programs via a custom key accessor', () => {
		// Shape returned by newer Tunarr versions: path lives at program.externalId
		const wrapped = [
			{ type: 'content', id: 'a', program: { externalId: '/library-local/welcome.mp4', title: 'Welcome' } },
			{ type: 'content', id: 'b', program: { externalId: '/library-local/old/checkout.mp4', title: 'Checkout' } },
		]
		const getKey = (p: (typeof wrapped)[number]) => p.program?.externalId

		const exact = findProgramByKey(wrapped, '/library-local/welcome.mp4', getKey)
		expect(exact.matchedBy).toBe('exact')
		expect(exact.program?.id).toBe('a')

		const fallback = findProgramByKey(wrapped, '/exports/checkout.mp4', getKey)
		expect(fallback.matchedBy).toBe('basename')
		expect(fallback.program?.id).toBe('b')
		expect(fallback.suggestedMediaPath).toBe('/library-local/old')
	})
})

describe('suggestMediaPath', () => {
	it('derives the prefix from the shared relative suffix', () => {
		expect(suggestMediaPath('/exports/lobby/welcome.mp4', '/media/hospitality/lobby/welcome.mp4')).toBe('/media/hospitality')
	})

	it('returns undefined when nothing is shared', () => {
		expect(suggestMediaPath('/exports/a.mp4', '/media/b.mp4')).toBeUndefined()
	})
})

describe('sampleExternalKeys', () => {
	it('returns up to the limit, skipping programs without keys', () => {
		const programs = [{ externalKey: '/a' }, {}, { externalKey: '/b' }, { externalKey: '/c' }, { externalKey: '/d' }]
		expect(sampleExternalKeys(programs, 3)).toEqual(['/a', '/b', '/c'])
	})
})
