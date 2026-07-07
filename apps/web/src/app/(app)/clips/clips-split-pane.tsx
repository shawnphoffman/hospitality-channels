'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { DuplicateButton } from '@/components/duplicate-button'
import { LazyMount } from '@/components/lazy-mount'
import { TagEditor } from '@/components/tags/tag-editor'
import { TagFilterBar } from '@/components/tags/tag-filter-bar'

export interface ClipListItem {
	id: string
	title: string
	slug: string
	templateName: string
	durationSec: number
	createdAt: string
	updatedAt: string
	thumbnailPath: string | null
	bgImageUrl: string | null
	usedBy: Array<{ id: string; title: string }>
	tags: string[]
}

function formatDate(dateStr: string): string {
	try {
		return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
	} catch {
		return ''
	}
}

function ClipPreview({ clip, scale }: { clip: ClipListItem; scale: number }) {
	const width = Math.round(1920 * scale)
	const height = Math.round(1080 * scale)
	if (clip.thumbnailPath) {
		/* eslint-disable-next-line @next/next/no-img-element */
		return <img src={`/api/assets/serve?path=${encodeURIComponent(clip.thumbnailPath)}`} alt="" className="h-full w-full object-cover" />
	}
	if (clip.bgImageUrl) {
		/* eslint-disable-next-line @next/next/no-img-element */
		return <img src={clip.bgImageUrl} alt="" className="h-full w-full object-cover" />
	}
	return (
		<div className="pointer-events-none overflow-hidden" style={{ width, height }}>
			<LazyMount className="h-full w-full">
				<iframe
					src={`/clips/${clip.id}/render`}
					className="pointer-events-none origin-top-left"
					style={{ width: 1920, height: 1080, transform: `scale(${scale})` }}
					tabIndex={-1}
				/>
			</LazyMount>
		</div>
	)
}

export function ClipsSplitPane({ clips }: { clips: ClipListItem[] }) {
	const router = useRouter()
	const [search, setSearch] = useState('')
	const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
	const [selectedId, setSelectedId] = useState<string | null>(clips[0]?.id ?? null)
	const [tagOverrides, setTagOverrides] = useState<Record<string, string[]>>({})
	const [tagError, setTagError] = useState<string | null>(null)
	const [vocabulary, setVocabulary] = useState<string[]>([])
	const detailRef = useRef<HTMLDivElement>(null)

	useEffect(() => {
		fetch('/api/tags')
			.then(res => (res.ok ? res.json() : []))
			.then((all: Array<{ name: string }>) => setVocabulary(all.map(t => t.name)))
			.catch(() => {})
	}, [])

	const tagsOf = (c: ClipListItem) => tagOverrides[c.id] ?? c.tags

	const tagCounts = useMemo(() => {
		const counts = new Map<string, number>()
		for (const c of clips) for (const t of tagsOf(c)) counts.set(t, (counts.get(t) ?? 0) + 1)
		return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [clips, tagOverrides])

	const filtered = clips.filter(c => {
		const haystack = `${c.title} ${c.slug} ${c.templateName} ${tagsOf(c).join(' ')}`.toLowerCase()
		if (!haystack.includes(search.toLowerCase())) return false
		if (activeTags.size && ![...activeTags].every(t => tagsOf(c).includes(t))) return false
		return true
	})

	const selected = clips.find(c => c.id === selectedId) ?? filtered[0] ?? clips[0] ?? null

	const toggleTag = (name: string) => {
		setActiveTags(prev => {
			const next = new Set(prev)
			next.has(name) ? next.delete(name) : next.add(name)
			return next
		})
	}

	const saveTags = async (clip: ClipListItem, tags: string[]) => {
		const previous = tagsOf(clip)
		setTagOverrides(prev => ({ ...prev, [clip.id]: tags }))
		setTagError(null)
		try {
			const res = await fetch(`/api/clips/${clip.id}/tags`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tags }),
			})
			if (!res.ok) throw new Error()
			const data = await res.json()
			setTagOverrides(prev => ({ ...prev, [clip.id]: data.tags }))
			setVocabulary(prev => [...new Set([...prev, ...data.tags])])
			router.refresh()
		} catch {
			setTagOverrides(prev => ({ ...prev, [clip.id]: previous }))
			setTagError('Failed to save tags')
		}
	}

	const selectClip = (id: string) => {
		setSelectedId(id)
		if (window.innerWidth < 820) detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
	}

	return (
		<div>
			<div className="mb-4 flex items-center justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold text-white">Clips</h2>
					<p className="mt-1 text-sm text-slate-500">Select a clip to preview and act on it</p>
				</div>
				<Link
					href="/clips/new"
					className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
				>
					New Clip
				</Link>
			</div>

			{clips.length === 0 ? (
				<div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
					<p className="text-slate-400">No clips yet. Create one from a template.</p>
					<Link
						href="/clips/new"
						className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500"
					>
						Create Clip
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
							aria-label="Filter clips"
							className="w-full border-b border-slate-800 bg-slate-800/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none"
						/>
						<TagFilterBar tags={tagCounts} active={activeTags} onToggle={toggleTag} />
						<div>
							{filtered.map(c => (
								<button
									key={c.id}
									onClick={() => selectClip(c.id)}
									className={`flex w-full items-center gap-2.5 border-b border-slate-800 px-4 py-2.5 text-left last:border-b-0 hover:bg-slate-800/60 ${
										selected?.id === c.id ? 'bg-blue-600/15 shadow-[inset_2px_0_0_theme(colors.blue.600)]' : ''
									}`}
								>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-[13px] font-medium text-white">{c.title}</span>
										<span className="block truncate text-[11px] text-slate-500">{c.templateName}</span>
									</span>
									{c.usedBy.length > 0 && (
										<span className="flex-none text-[11px] text-slate-500 tabular-nums" title={`Used by ${c.usedBy.length} program(s)`}>
											{c.usedBy.length}▸
										</span>
									)}
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
							<div className="mt-2.5">
								<TagEditor tags={tagsOf(selected)} allTags={vocabulary} onChange={tags => saveTags(selected, tags)} />
								{tagError && <p className="mt-1 text-xs text-red-400">{tagError}</p>}
							</div>

							<div className="mt-4 flex flex-wrap gap-2">
								<Link
									href={`/clips/${selected.id}`}
									className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
								>
									Open editor
								</Link>
								<DuplicateButton endpoint={`/api/clips/${selected.id}/duplicate`} hrefBase="/clips" />
							</div>

							<div className="mt-5">
								<p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Preview</p>
								<div className="aspect-video w-full max-w-[480px] overflow-hidden rounded-lg border border-slate-700 bg-slate-950">
									<ClipPreview key={selected.id} clip={selected} scale={0.25} />
								</div>
							</div>

							<div className="mt-5">
								<p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Used by · {selected.usedBy.length}</p>
								{selected.usedBy.length > 0 ? (
									<div className="space-y-1.5">
										{selected.usedBy.map(p => (
											<Link key={p.id} href={`/programs/${p.id}`} className="block truncate text-xs text-blue-400 hover:text-blue-300">
												{p.title}
											</Link>
										))}
									</div>
								) : (
									<p className="text-xs text-slate-500">Not used by any program yet.</p>
								)}
							</div>

							<div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
								<div className="rounded-lg bg-slate-800/60 px-3 py-2">
									<p className="text-[10px] uppercase tracking-wider text-slate-500">Template</p>
									<p className="mt-0.5 truncate text-sm text-white">{selected.templateName}</p>
								</div>
								<div className="rounded-lg bg-slate-800/60 px-3 py-2">
									<p className="text-[10px] uppercase tracking-wider text-slate-500">Duration</p>
									<p className="mt-0.5 text-sm text-white tabular-nums">{selected.durationSec}s</p>
								</div>
								<div className="rounded-lg bg-slate-800/60 px-3 py-2">
									<p className="text-[10px] uppercase tracking-wider text-slate-500">Created</p>
									<p className="mt-0.5 text-sm text-white">{formatDate(selected.createdAt)}</p>
								</div>
								<div className="rounded-lg bg-slate-800/60 px-3 py-2">
									<p className="text-[10px] uppercase tracking-wider text-slate-500">Updated</p>
									<p className="mt-0.5 text-sm text-white">{formatDate(selected.updatedAt)}</p>
								</div>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
