'use client'

import { formatDuration } from './program-editor-shared'

interface DurationSettingsProps {
	durationMode: 'auto' | 'manual'
	setDurationMode: (mode: 'auto' | 'manual') => void
	manualDurationSec: number
	setManualDurationSec: (val: number) => void
	minClipDurationSec: number | null
	setMinClipDurationSec: (val: number | null) => void
	transitionType: string
	setTransitionType: (val: string) => void
	transitionSec: number
	setTransitionSec: (val: number) => void
	loopTransition: boolean
	setLoopTransition: (val: boolean) => void
	computedDuration: number
	perClipDuration: number
	clipCount: number
	trackCount: number
}

export function DurationSettings({
	durationMode,
	setDurationMode,
	manualDurationSec,
	setManualDurationSec,
	minClipDurationSec,
	setMinClipDurationSec,
	transitionType,
	setTransitionType,
	transitionSec,
	setTransitionSec,
	loopTransition,
	setLoopTransition,
	computedDuration,
	perClipDuration,
	clipCount,
	trackCount,
}: DurationSettingsProps) {
	return (
		<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h3 className="mb-3 text-sm font-semibold text-slate-300">Duration</h3>
			<div className="flex gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
				<button
					type="button"
					onClick={() => setDurationMode('auto')}
					className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
						durationMode === 'auto' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-300'
					}`}
				>
					Match audio length
				</button>
				<button
					type="button"
					onClick={() => setDurationMode('manual')}
					className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
						durationMode === 'manual' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-300'
					}`}
				>
					Manual
				</button>
			</div>
			{durationMode === 'manual' && (
				<input
					type="number"
					min={1}
					value={manualDurationSec}
					onChange={e => setManualDurationSec(parseInt(e.target.value, 10) || 60)}
					className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
					placeholder="Duration in seconds"
				/>
			)}
			<div className="mt-2 text-xs text-slate-500">
				Total: {formatDuration(computedDuration)}
				{clipCount > 0 && <> &middot; {formatDuration(perClipDuration)} per clip</>}
			</div>
			{durationMode === 'auto' && trackCount === 0 && (
				<p className="mt-1 text-xs text-amber-400">Add audio tracks below to compute duration</p>
			)}
			<div className="mt-3">
				<label htmlFor="minClipDuration" className="block text-xs text-slate-400">
					Minimum clip duration (seconds)
				</label>
				<input
					id="minClipDuration"
					type="number"
					min={1}
					value={minClipDurationSec ?? ''}
					onChange={e => {
						const v = e.target.value
						setMinClipDurationSec(v === '' ? null : parseInt(v, 10) || null)
					}}
					className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
					placeholder="Optional"
				/>
				<p className="mt-1 text-xs text-slate-500">
					If set, each clip will be shown for at least this many seconds, extending total duration if needed.
				</p>
			</div>

			{/* Clip Transitions */}
			<div className="mt-3">
				<label htmlFor="transitionType" className="block text-xs text-slate-400">
					Clip transition
				</label>
				<select
					id="transitionType"
					value={transitionType}
					onChange={e => setTransitionType(e.target.value)}
					className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
				>
					<option value="none">None (hard cut)</option>
					<option value="fade">Fade</option>
					<option value="wipeup">Wipe Up</option>
					<option value="wipedown">Wipe Down</option>
					<option value="wipeleft">Wipe Left</option>
					<option value="wiperight">Wipe Right</option>
					<option value="slideup">Slide Up</option>
					<option value="slidedown">Slide Down</option>
					<option value="slideleft">Slide Left</option>
					<option value="slideright">Slide Right</option>
				</select>
				{transitionType !== 'none' && (
					<>
						<div className="mt-2">
							<label htmlFor="transitionSec" className="block text-xs text-slate-400">
								Transition duration (seconds)
							</label>
							<input
								id="transitionSec"
								type="number"
								min={0.25}
								max={2}
								step={0.25}
								value={transitionSec}
								onChange={e => setTransitionSec(parseFloat(e.target.value) || 0.5)}
								className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<label className="mt-2 flex items-center gap-2 cursor-pointer">
							<div className="relative">
								<input
									type="checkbox"
									checked={loopTransition}
									onChange={e => setLoopTransition(e.target.checked)}
									className="peer sr-only"
								/>
								<div className="h-5 w-9 rounded-full bg-slate-700 transition-colors peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-900" />
								<div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-slate-400 transition-all peer-checked:translate-x-4 peer-checked:bg-white" />
							</div>
							<div>
								<span className="text-xs text-slate-300">Seamless loop</span>
								<p className="text-xs text-slate-500">Adds a transition from the last clip back to the first for seamless looping</p>
							</div>
						</label>
					</>
				)}
			</div>
		</section>
	)
}
