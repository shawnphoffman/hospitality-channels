/**
 * Pure helpers for program render calculations. Kept free of I/O and module
 * side effects so they can be unit tested directly.
 */

export interface ProgramTimingInput {
	clipCount: number
	totalDurationSec: number
	transitionType: string
	transitionSec: number
	loopTransition: boolean
}

export interface ProgramTiming {
	useTransitions: boolean
	loopTransition: boolean
	transitionOverlapsSec: number
	perClipDurationSec: number
}

/**
 * Computes per-clip render duration for a program. When transitions are
 * enabled, each clip needs extra time to account for xfade overlap. With loop
 * transition there is one extra transition (last clip back into the first)
 * plus a front trim of transitionSec.
 */
export function computeProgramTiming(input: ProgramTimingInput): ProgramTiming {
	const { clipCount, totalDurationSec, transitionType, transitionSec } = input
	const useTransitions = transitionType !== 'none' && clipCount >= 2
	const loopTransition = input.loopTransition === true && useTransitions
	const transitionOverlapsSec = useTransitions ? (loopTransition ? clipCount * transitionSec : (clipCount - 1) * transitionSec) : 0
	const perClipDurationSec = clipCount > 0 ? (totalDurationSec + transitionOverlapsSec) / clipCount : totalDurationSec
	return { useTransitions, loopTransition, transitionOverlapsSec, perClipDurationSec }
}

/**
 * Builds a chained xfade filter for N clips.
 * For the simple (all-screenshot) pipeline, inputs are [0:v], [1:v], etc.
 * For the mixed pipeline, inputs are [v0], [v1], etc. (set labelPrefix='v').
 *
 * Example output for 3 clips, fade 0.5s, perClipDuration=10s:
 *   [0:v][1:v]xfade=transition=fade:duration=0.5:offset=9.5[xf0];
 *   [xf0][2:v]xfade=transition=fade:duration=0.5:offset=19.0[outv]
 */
export function buildXfadeFilter(
	n: number,
	durations: number[],
	transitionType: string,
	transitionSec: number,
	labelPrefix?: string,
	preTrimOutput?: boolean
): string {
	let filter = ''
	// Track cumulative output time to compute each transition's offset
	let cumulativeTime = durations[0]
	for (let i = 0; i < n - 1; i++) {
		const inputA = i === 0 ? (labelPrefix ? `[${labelPrefix}0]` : '[0:v]') : `[xf${i - 1}]`
		const inputB = labelPrefix ? `[${labelPrefix}${i + 1}]` : `[${i + 1}:v]`
		const finalLabel = preTrimOutput ? '[pretrim]' : '[outv]'
		const outputLabel = i === n - 2 ? finalLabel : `[xf${i}]`
		const offset = cumulativeTime - transitionSec
		filter += `${inputA}${inputB}xfade=transition=${transitionType}:duration=${transitionSec}:offset=${offset.toFixed(3)}${outputLabel}`
		if (i < n - 2) filter += ';'
		// After this transition, combined duration grows by next clip minus overlap
		cumulativeTime = offset + durations[i + 1]
	}
	return filter
}
