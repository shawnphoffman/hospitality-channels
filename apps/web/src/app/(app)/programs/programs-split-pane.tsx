'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DuplicateButton } from '@/components/duplicate-button'
import { LazyMount } from '@/components/lazy-mount'
import { PipelineProgress } from '@/components/pipeline-progress'
import { TagEditor } from '@/components/tags/tag-editor'
import { TagFilterBar } from '@/components/tags/tag-filter-bar'
import { formatDuration } from './[id]/program-editor-shared'

export interface ProgramListItem {
	id: string
	title: string
	slug: string
	description: string
	clips: Array<{ id: string; title: string }>
	tracks: Array<{ name: string; durationSec: number | null }>
	durationSec: number
	status: 'onair' | 'published' | 'rendered' | 'failed' | 'draft'
	channelLabel: string | null
	tunarrChannelId: string | null
	pushMode: 'append' | 'replace'
	updatedAt: string
	tags: string[]
}

const STATUS_META: Record<ProgramListItem['status'], { dot: string; chip: string; label: (p: ProgramListItem) => string }> = {
	onair: { dot: 'bg-emerald-400', chip: 'border-emerald-500/40 text-emerald-400', label: p => `On air · ${p.channelLabel}` },
	published: { dot: 'bg-emerald-400', chip: 'border-emerald-500/40 text-emerald-400', label: () => 'Published' },
	rendered: { dot: 'bg-amber-400', chip: 'border-amber-500/40 text-amber-400', label: () => 'Rendered, not pushed' },
	failed: { dot: 'bg-red-400', chip: 'border-red-500/40 text-red-400', label: () => 'Render failed' },
	draft: { dot: 'bg-slate-500', chip: 'border-slate-600 text-slate-400', label: () => 'Draft' },
}

function StatusChip({ program }: { program: ProgramListItem }) {
	const meta = STATUS_META[program.status]
	return (
		<span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] ${meta.chip}`}>
			<span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
			{meta.label(program)}
		</span>
	)
}

function formatDate(dateStr: string): string {
	try {
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
	} catch {
		return ''
	}
}

export function ProgramsSplitPane({
	programs,
	defaultProfile,
}: {
	programs: ProgramListItem[]
	defaultProfile: { id: string; name: string } | null
}) {
	const router = useRouter()
	const [search, setSearch] = useState('')
	const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
	const [selectedId, setSelectedId] = useState<string | null>(programs[0]?.id ?? null)
	const [tagOverrides, setTagOverrides] = useState<Record<string, string[]>>({})
	const [tagError, setTagError] = useState<string | null>(null)
	const [vocabulary, setVocabulary] = useState<string[]>([])
	const [pipelineJobs, setPipelineJobs] = useState<Record<string, string>>({})
	const [publishError, setPublishError] = useState<string | null>(null)
	const detailRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		fetch('/api/tags')
			.then(res => (res.ok ? res.json() : []))
			.then((all: Array<{ name: string }>) => setVocabulary(all.map(t => t.name)))
			.catch(() => {})
	}, [])

	const tagsOf = (p: ProgramListItem) => tagOverrides[p.id] ?? p.tags

	const tagCounts = useMemo(() => {
		const counts = new Map<string, number>()
		for (const p of programs) for (const t of tagsOf(p)) counts.set(t, (counts.get(t) ?? 0) + 1)
		return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [programs, tagOverrides])

	const filtered = programs.filter(p => {
		const haystack = `${p.title} ${p.slug} ${tagsOf(p).join(' ')}`.toLowerCase()
		if (!haystack.includes(search.toLowerCase())) return false
		if (activeTags.size && ![...activeTags].every(t => tagsOf(p).includes(t))) return false
		return true
	})

	const selected = programs.find(p => p.id === selectedId) ?? filtered[0] ?? programs[0] ?? null

	const toggleTag = (name: string) => {
		setActiveTags(prev => {
			const next = new Set(prev)
			next.has(name) ? next.delete(name) : next.add(name)
			return next
		})
	}

	const saveTags = async (program: ProgramListItem, tags: string[]) => {
		const previous = tagsOf(program)
		setTagOverrides(prev => ({ ...prev, [program.id]: tags }))
		setTagError(null)
		try {
			const res = await fetch(`/api/programs/${program.id}/tags`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tags }),
			})
			if (!res.ok) throw new Error()
			const data = await res.json()
			setTagOverrides(prev => ({ ...prev, [program.id]: data.tags }))
			setVocabulary(prev => [...new Set([...prev, ...data.tags])])
			router.refresh()
		} catch {
			setTagOverrides(prev => ({ ...prev, [program.id]: previous }))
			setTagError('Failed to save tags')
		}
	}

	const selectProgram = (id: string) => {
		setSelectedId(id)
		// On stacked (mobile) layout, bring the detail pane into view
		if (window.innerWidth < 820) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
	}

	const publishToChannel = async (program: ProgramListItem) => {
		if (!defaultProfile || !program.tunarrChannelId) return
		setPublishError(null)
		try {
			const res = await fetch('/api/render-and-publish', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					programId: program.id,
					profileId: defaultProfile.id,
					pushChannelId: program.tunarrChannelId,
					pushMode: program.pushMode,
				}),
			})
			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				setPublishError(data.error || 'Failed to start the publish pipeline')
				return
			}
			const job = await res.json()
			setPipelineJobs(prev => ({ ...prev, [program.id]: job.id }))
		} catch {
			setPublishError('Failed to start the publish pipeline')
		}
	}

	return (
		<div>
			<div className="mb-4 flex items-center justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold text-white">Programs</h2>
					<p className="mt-1 text-sm text-slate-500">Select a program to preview and act on it</p>
				</div>
				<Link
					href="/programs/new"
					className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
				>
					New Program
				</Link>
			</div>

			{programs.length === 0 ? (
				<div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
					<p className="text-slate-400">No programs yet. Create one to compose clips together.</p>
					<Link
						href="/programs/new"
						className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500"
					>
						Create Program
					</Link>
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-[300px_1fr]">
					<aside className="self-start overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
						<input
							type="search"
							value={search}
							onChange={e => setSearch(e.target.value)}
							placeholder="Filter..."
							aria-label="Filter programs"
							className="w-full border-b border-slate-800 bg-slate-800/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
						/>
						<TagFilterBar tags={tagCounts} active={activeTags} onToggle={toggleTag} />
						<div>
							{filtered.map(p => (
								<button
									key={p.id}
									onClick={() => selectProgram(p.id)}
									className={`flex w-full items-center gap-2.5 border-b border-slate-800 px-4 py-2.5 text-left last:border-b-0 hover:bg-slate-800/60 ${
										selected?.id === p.id ? 'bg-blue-600/15 shadow-[inset_2px_0_0_theme(colors.blue.600)]' : ''
									}`}
								>
									<span className={`h-2 w-2 flex-none rounded-full ${STATUS_META[p.status].dot}`} />
									<span className="min-w-0 flex-1 truncate text-[13px] font-medium text-white">{p.title}</span>
									<span className="text-[11px] text-slate-500 tabular-nums">{formatDuration(p.durationSec)}</span>
								</button>
							))}
							{filtered.length === 0 && (
								<p className="px-4 py-5 text-center text-xs text-slate-500">Nothing matches this search and tag combination.</p>
							)}
						</div>
					</aside>

					{selected && (
						<div ref={detailRef} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900 p-5">
							<p className="break-all text-xs text-slate-500">{selected.slug}</p>
							<h3 className="mt-0.5 text-lg font-semibold text-white">{selected.title}</h3>
							{selected.description && <p className="mt-1 text-sm text-slate-400">{selected.description}</p>}
							<div className="mt-2">
								<StatusChip program={selected} />
							</div>
							<div className="mt-2.5">
								<TagEditor tags={tagsOf(selected)} allTags={vocabulary} onChange={tags => saveTags(selected, tags)} />
								{tagError && <p className="mt-1 text-xs text-red-400">{tagError}</p>}
							</div>

							<div className="mt-4 flex flex-wrap gap-2">
								<Link
									href={`/programs/${selected.id}`}
									className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
								>
									Open editor
								</Link>
								{selected.tunarrChannelId && defaultProfile && (
									<button
										onClick={() => publishToChannel(selected)}
										disabled={!!pipelineJobs[selected.id]}
										className="rounded-lg border border-emerald-700 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-950 disabled:opacity-50"
										title={`Render, export via ${defaultProfile.name}, and push to ${selected.channelLabel}`}
									>
										Publish to {selected.channelLabel}
									</button>
								)}
								<DuplicateButton endpoint={`/api/programs/${selected.id}/duplicate`} hrefBase="/programs" />
								<DuplicateButton
									endpoint={`/api/programs/${selected.id}/duplicate`}
									body={{ includeClips: true }}
									hrefBase="/programs"
									label="Duplicate + Clips"
								/>
							</div>
							{publishError && <p className="mt-2 text-xs text-red-400">{publishError}</p>}
							{pipelineJobs[selected.id] && (
								<div className="mt-3">
									<PipelineProgress jobId={pipelineJobs[selected.id]} onFinished={() => router.refresh()} />
								</div>
							)}

							<div className="mt-5">
								<p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Clips · {selected.clips.length}</p>
								{selected.clips.length > 0 ? (
									<div className="flex gap-2 overflow-x-auto pb-1">
										{selected.clips.map((c, i) => (
											<div key={`${c.id}-${i}`} className="w-32 flex-none overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
												<div className="pointer-events-none h-[72px] w-32 overflow-hidden bg-slate-950">
													<LazyMount className="h-full w-full">
														<iframe
															src={`/clips/${c.id}/render`}
															className="pointer-events-none origin-top-left"
															style={{ width: 1920, height: 1080, transform: 'scale(0.0667)' }}
															tabIndex={-1}
														/>
													</LazyMount>
												</div>
												<p className="truncate px-2 py-1 text-[11px] text-slate-400">
													{i + 1}. {c.title}
												</p>
											</div>
										))}
									</div>
								) : (
									<p className="text-xs text-slate-500">No clips yet. Open the editor to add some.</p>
								)}
							</div>

							<div className="mt-5">
								<p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
									Audio tracks · {selected.tracks.length}
								</p>
								{selected.tracks.length > 0 ? (
									<div className="space-y-1.5">
										{selected.tracks.map((t, i) => (
											<div key={i} className="flex items-center gap-2 text-xs text-slate-400">
												<span aria-hidden>♪</span>
												<span className="min-w-0 truncate">{t.name}</span>
												<span className="ml-auto text-slate-500 tabular-nums">{t.durationSec ? formatDuration(t.durationSec) : ''}</span>
											</div>
										))}
									</div>
								) : (
									<p className="text-xs text-slate-500">No audio. Duration comes from the manual setting.</p>
								)}
							</div>

							<div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
								<div className="rounded-lg bg-slate-800/60 px-3 py-2">
									<p className="text-[10px] uppercase tracking-wider text-slate-500">Duration</p>
									<p className="mt-0.5 text-sm text-white tabular-nums">{formatDuration(selected.durationSec)}</p>
								</div>
								<div className="rounded-lg bg-slate-800/60 px-3 py-2">
									<p className="text-[10px] uppercase tracking-wider text-slate-500">Updated</p>
									<p className="mt-0.5 text-sm text-white">{formatDate(selected.updatedAt)}</p>
								</div>
								<div className="rounded-lg bg-slate-800/60 px-3 py-2">
									<p className="text-[10px] uppercase tracking-wider text-slate-500">Channel</p>
									<p className="mt-0.5 truncate text-sm text-white">{selected.channelLabel ?? 'Not bound'}</p>
								</div>
								<div className="rounded-lg bg-slate-800/60 px-3 py-2">
									<p className="text-[10px] uppercase tracking-wider text-slate-500">Status</p>
									<p className="mt-0.5 truncate text-sm text-white">{STATUS_META[selected.status].label(selected)}</p>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
