'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

export interface JobStep {
	key: string
	label: string
	status: 'pending' | 'running' | 'done' | 'failed' | 'skipped'
	detail?: string
}

export interface JobRow {
	id: string
	type: string
	status: string
	error: string | null
	attempts: number
	steps: JobStep[] | null
	outputPath: string | null
	createdAt: string
	startedAt: string | null
	completedAt: string | null
	label: string
	href: string | null
}

type Filter = 'all' | 'failed' | 'active'

function timeAgo(dateStr: string): string {
	const diffMs = Date.now() - new Date(dateStr).getTime()
	const diffMin = Math.floor(diffMs / 60000)
	if (diffMin < 1) return 'just now'
	if (diffMin < 60) return `${diffMin}m ago`
	const diffHrs = Math.floor(diffMin / 60)
	if (diffHrs < 24) return `${diffHrs}h ago`
	const diffDays = Math.floor(diffHrs / 24)
	if (diffDays < 30) return `${diffDays}d ago`
	return new Date(dateStr).toLocaleDateString()
}

function durationBetween(start: string | null, end: string | null): string | null {
	if (!start || !end) return null
	const ms = new Date(end).getTime() - new Date(start).getTime()
	if (ms < 0) return null
	const sec = Math.round(ms / 1000)
	if (sec < 60) return `${sec}s`
	const m = Math.floor(sec / 60)
	const s = sec % 60
	return `${m}m ${s}s`
}

const STATUS_STYLES: Record<string, string> = {
	completed: 'bg-emerald-500/10 text-emerald-400',
	failed: 'bg-red-500/10 text-red-400',
	processing: 'bg-blue-500/10 text-blue-400',
	queued: 'bg-slate-700/50 text-slate-300',
}

function StatusPill({ status }: { status: string }) {
	const style = STATUS_STYLES[status] ?? 'bg-slate-700/50 text-slate-300'
	return <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${style}`}>{status}</span>
}

const STEP_STYLES: Record<JobStep['status'], { dot: string; label: string }> = {
	done: { dot: 'bg-emerald-400', label: 'text-slate-300' },
	running: { dot: 'bg-blue-400 animate-pulse', label: 'text-blue-300' },
	failed: { dot: 'bg-red-400', label: 'text-red-300' },
	skipped: { dot: 'bg-slate-600', label: 'text-slate-500 line-through' },
	pending: { dot: 'bg-slate-600', label: 'text-slate-500' },
}

export function JobsList({ jobs }: { jobs: JobRow[] }) {
	const [filter, setFilter] = useState<Filter>('all')
	const [expanded, setExpanded] = useState<Set<string>>(new Set())

	const toggle = (id: string) =>
		setExpanded(prev => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})

	const counts = useMemo(
		() => ({
			all: jobs.length,
			failed: jobs.filter(j => j.status === 'failed').length,
			active: jobs.filter(j => j.status === 'queued' || j.status === 'processing').length,
		}),
		[jobs]
	)

	const visible = useMemo(() => {
		if (filter === 'failed') return jobs.filter(j => j.status === 'failed')
		if (filter === 'active') return jobs.filter(j => j.status === 'queued' || j.status === 'processing')
		return jobs
	}, [jobs, filter])

	return (
		<div className="space-y-4">
			<div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900 p-0.5 text-sm">
				{(['all', 'failed', 'active'] as Filter[]).map(f => (
					<button
						key={f}
						onClick={() => setFilter(f)}
						className={`flex-1 rounded-md px-3 py-1.5 font-medium capitalize transition-colors ${
							filter === f ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
						}`}
					>
						{f} <span className="text-xs text-slate-500">({counts[f]})</span>
					</button>
				))}
			</div>

			{visible.length === 0 ? (
				<div className="rounded-xl border border-dashed border-slate-700 py-12 text-center">
					<p className="text-sm text-slate-500">{filter === 'all' ? 'No jobs yet' : `No ${filter} jobs`}</p>
				</div>
			) : (
				<div className="space-y-2">
					{visible.map(job => {
						const isOpen = expanded.has(job.id)
						const runtime = durationBetween(job.startedAt, job.completedAt)
						return (
							<div key={job.id} className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
								<button
									onClick={() => toggle(job.id)}
									className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-slate-800/40"
								>
									<svg
										className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${isOpen ? 'rotate-90' : ''}`}
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={2}
									>
										<polyline points="9 18 15 12 9 6" />
									</svg>
									<div className="min-w-0 flex-1">
										<div className="flex items-center gap-2">
											<p className="truncate text-sm font-medium text-white">{job.label}</p>
											<StatusPill status={job.status} />
										</div>
										<p className="truncate text-xs text-slate-500">
											{job.type.replace(/-/g, ' ')}
											{job.attempts > 1 && <span className="ml-1 text-amber-400/80">&middot; {job.attempts} attempts</span>}
											{job.status === 'failed' && job.error && <span className="ml-1 text-red-400">&middot; {job.error}</span>}
										</p>
									</div>
									<span className="shrink-0 text-xs text-slate-600">{timeAgo(job.createdAt)}</span>
								</button>

								{isOpen && (
									<div className="space-y-3 border-t border-slate-800 px-4 py-3 text-sm">
										{job.steps && job.steps.length > 0 && (
											<div className="space-y-1.5">
												{job.steps.map(step => {
													const s = STEP_STYLES[step.status]
													return (
														<div key={step.key} className="flex items-start gap-2">
															<span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
															<div className="min-w-0">
																<span className={`text-xs font-medium ${s.label}`}>{step.label}</span>
																<span className="ml-1.5 text-[11px] text-slate-600">{step.status}</span>
																{step.detail && <p className="text-[11px] text-slate-500">{step.detail}</p>}
															</div>
														</div>
													)
												})}
											</div>
										)}

										{job.error && (
											<div>
												<p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Error</p>
												<pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-red-950/30 px-3 py-2 font-mono text-xs text-red-300">
													{job.error}
												</pre>
											</div>
										)}

										<dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 sm:grid-cols-4">
											<div>
												<dt className="text-slate-600">Created</dt>
												<dd className="text-slate-400">{new Date(job.createdAt).toLocaleString()}</dd>
											</div>
											<div>
												<dt className="text-slate-600">Runtime</dt>
												<dd className="text-slate-400">{runtime ?? '—'}</dd>
											</div>
											<div>
												<dt className="text-slate-600">Attempts</dt>
												<dd className="text-slate-400">{job.attempts}</dd>
											</div>
											<div className="min-w-0">
												<dt className="text-slate-600">Job ID</dt>
												<dd className="truncate font-mono text-slate-400">{job.id}</dd>
											</div>
										</dl>

										{job.outputPath && <p className="truncate font-mono text-[11px] text-slate-600">{job.outputPath}</p>}

										{job.href && (
											<Link href={job.href} className="inline-block text-xs font-medium text-blue-400 hover:text-blue-300">
												Open {job.href.startsWith('/programs') ? 'program' : 'clip'} &rarr;
											</Link>
										)}
									</div>
								)}
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
