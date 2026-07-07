'use client'

import { useEffect, useState } from 'react'

export interface PipelineStep {
	key: string
	label: string
	status: 'pending' | 'running' | 'done' | 'failed' | 'skipped'
	detail?: string
}

interface PipelineJob {
	id: string
	status: string
	error: string | null
	steps: PipelineStep[] | null
}

const ICONS: Record<PipelineStep['status'], string> = {
	pending: '○',
	running: '◐',
	done: '✓',
	failed: '✗',
	skipped: '−',
}
const COLORS: Record<PipelineStep['status'], string> = {
	pending: 'text-slate-500',
	running: 'text-blue-400',
	done: 'text-emerald-400',
	failed: 'text-red-400',
	skipped: 'text-slate-500',
}

/**
 * Live step strip for a pipeline job (render, export, index, push). Polls the
 * job until it completes or fails, then calls onFinished once.
 */
export function PipelineProgress({ jobId, onFinished }: { jobId: string; onFinished?: (job: { status: string }) => void }) {
	const [job, setJob] = useState<PipelineJob | null>(null)

	useEffect(() => {
		let stopped = false
		let timer: ReturnType<typeof setTimeout>
		const poll = async () => {
			try {
				const res = await fetch(`/api/jobs/${jobId}`)
				if (res.ok) {
					const data: PipelineJob = await res.json()
					if (stopped) return
					setJob(data)
					if (data.status === 'completed' || data.status === 'failed') {
						onFinished?.(data)
						return
					}
				}
			} catch {
				/* keep polling */
			}
			if (!stopped) timer = setTimeout(poll, 2000)
		}
		poll()
		return () => {
			stopped = true
			clearTimeout(timer)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [jobId])

	if (!job) return <p className="text-xs text-slate-500">Starting job...</p>

	const steps = job.steps ?? []
	const failedStep = steps.find(s => s.status === 'failed')

	return (
		<div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
			<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
				{steps.map(step => (
					<span key={step.key} className={`inline-flex items-center gap-1.5 text-xs ${COLORS[step.status]}`}>
						<span className={step.status === 'running' ? 'animate-pulse' : ''}>{ICONS[step.status]}</span>
						{step.label}
					</span>
				))}
				{steps.length === 0 && (
					<span className="text-xs text-slate-400">{job.status === 'queued' ? 'Waiting for worker...' : job.status}</span>
				)}
			</div>
			{job.status === 'queued' && steps.length > 0 && <p className="mt-1.5 text-[11px] text-slate-500">Waiting for worker...</p>}
			{failedStep?.detail && <p className="mt-1.5 break-words text-[11px] text-red-400">{failedStep.detail}</p>}
			{job.status === 'failed' && !failedStep && job.error && <p className="mt-1.5 break-words text-[11px] text-red-400">{job.error}</p>}
			{job.status === 'completed' && <p className="mt-1.5 text-[11px] text-emerald-400">Done.</p>}
		</div>
	)
}
