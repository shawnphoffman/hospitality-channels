import { describe, expect, it } from 'vitest'
import { buildXfadeFilter, computeProgramTiming } from '../src/render-math.js'

describe('computeProgramTiming', () => {
	it('divides duration evenly when transitions are disabled', () => {
		const timing = computeProgramTiming({
			clipCount: 3,
			totalDurationSec: 30,
			transitionType: 'none',
			transitionSec: 0.5,
			loopTransition: false,
		})
		expect(timing.useTransitions).toBe(false)
		expect(timing.transitionOverlapsSec).toBe(0)
		expect(timing.perClipDurationSec).toBeCloseTo(10)
	})

	it('adds one overlap per transition between clips', () => {
		const timing = computeProgramTiming({
			clipCount: 3,
			totalDurationSec: 30,
			transitionType: 'fade',
			transitionSec: 0.5,
			loopTransition: false,
		})
		expect(timing.useTransitions).toBe(true)
		expect(timing.transitionOverlapsSec).toBeCloseTo(1.0)
		expect(timing.perClipDurationSec).toBeCloseTo(31 / 3)
	})

	it('adds an extra overlap for the loop transition', () => {
		const timing = computeProgramTiming({
			clipCount: 3,
			totalDurationSec: 30,
			transitionType: 'fade',
			transitionSec: 0.5,
			loopTransition: true,
		})
		expect(timing.loopTransition).toBe(true)
		expect(timing.transitionOverlapsSec).toBeCloseTo(1.5)
		expect(timing.perClipDurationSec).toBeCloseTo(31.5 / 3)
	})

	it('disables transitions for a single clip', () => {
		const timing = computeProgramTiming({
			clipCount: 1,
			totalDurationSec: 30,
			transitionType: 'fade',
			transitionSec: 0.5,
			loopTransition: true,
		})
		expect(timing.useTransitions).toBe(false)
		expect(timing.loopTransition).toBe(false)
		expect(timing.perClipDurationSec).toBeCloseTo(30)
	})

	it('falls back to the total duration when there are no clips', () => {
		const timing = computeProgramTiming({
			clipCount: 0,
			totalDurationSec: 30,
			transitionType: 'none',
			transitionSec: 0.5,
			loopTransition: false,
		})
		expect(timing.perClipDurationSec).toBe(30)
	})
})

describe('buildXfadeFilter', () => {
	it('chains xfades with cumulative offsets for equal durations', () => {
		const filter = buildXfadeFilter(3, [10, 10, 10], 'fade', 0.5)
		expect(filter).toBe(
			'[0:v][1:v]xfade=transition=fade:duration=0.5:offset=9.500[xf0];' + '[xf0][2:v]xfade=transition=fade:duration=0.5:offset=19.000[outv]'
		)
	})

	it('accounts for unequal segment durations', () => {
		const filter = buildXfadeFilter(3, [5, 10, 2], 'wipeleft', 1)
		// First offset: 5 - 1 = 4; second offset: 4 + 10 - 1 = 13
		expect(filter).toBe(
			'[0:v][1:v]xfade=transition=wipeleft:duration=1:offset=4.000[xf0];' +
				'[xf0][2:v]xfade=transition=wipeleft:duration=1:offset=13.000[outv]'
		)
	})

	it('uses prefixed labels for the mixed pipeline', () => {
		const filter = buildXfadeFilter(2, [10, 10], 'fade', 0.5, 'v')
		expect(filter).toBe('[v0][v1]xfade=transition=fade:duration=0.5:offset=9.500[outv]')
	})

	it('emits a pretrim label when the output will be front-trimmed', () => {
		const filter = buildXfadeFilter(2, [10, 0.5], 'fade', 0.5, undefined, true)
		expect(filter).toBe('[0:v][1:v]xfade=transition=fade:duration=0.5:offset=9.500[pretrim]')
	})

	it('returns an empty filter for a single input', () => {
		expect(buildXfadeFilter(1, [10], 'fade', 0.5)).toBe('')
	})
})
