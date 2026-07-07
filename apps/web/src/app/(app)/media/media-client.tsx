'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TagEditor } from '@/components/tags/tag-editor'
import { TagFilterBar } from '@/components/tags/tag-filter-bar'

export interface MediaAsset {
	id: string
	name: string | null
	type: string
	originalPath: string
	derivedPath: string | null
	width: number | null
	height: number | null
	duration: number | null
	tags: string[]
}

export type MediaTypeFilter = 'all' | 'images' | 'audio' | 'videos' | 'other'

type MediaKind = Exclude<MediaTypeFilter, 'all'>

const typeFilters: Array<{ key: MediaTypeFilter; label: string }> = [
	{ key: 'all', label: 'All' },
	{ key: 'images', label: 'Images' },
	{ key: 'audio', label: 'Audio' },
	{ key: 'videos', label: 'Videos' },
	{ key: 'other', label: 'Other' },
]

function kindOf(asset: MediaAsset): MediaKind {
	if (asset.type === 'audio') return 'audio'
	if (asset.type === 'video') return 'videos'
	if (asset.type === 'photo') return 'images'
	return 'other'
}

function formatDuration(seconds: number): string {
	const h = Math.floor(seconds / 3600)
	const m = Math.floor((seconds % 3600) / 60)
	const s = Math.floor(seconds % 60)
	if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
	return `${m}:${s.toString().padStart(2, '0')}`
}

function formatResolution(w: number | null, h: number | null): string {
	if (!w || !h) return ''
	return `${w}×${h}`
}

function filenameFromPath(path: string): string {
	return path.split('/').pop() ?? 'file'
}

function serveUrl(path: string): string {
	return `/api/assets/serve?path=${encodeURIComponent(path)}`
}

function MusicIcon({ className }: { className: string }) {
	return (
		<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
			/>
		</svg>
	)
}

function VideoIcon({ className }: { className: string }) {
	return (
		<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
			/>
		</svg>
	)
}

export function MediaClient({ initialAssets, initialType }: { initialAssets: MediaAsset[]; initialType: MediaTypeFilter }) {
	const router = useRouter()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [scanning, setScanning] = useState(false)
	const [uploading, setUploading] = useState(false)
	const [message, setMessage] = useState<string | null>(null)
	const [search, setSearch] = useState('')
	const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>(initialType)
	const [activeTags, setActiveTags] = useState<Set<string>>(new Set())
	const [dimensions, setDimensions] = useState<Record<string, { w: number; h: number }>>({})
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editName, setEditName] = useState('')
	const [saving, setSaving] = useState(false)
	const [tagOverrides, setTagOverrides] = useState<Record<string, string[]>>({})
	const [vocabulary, setVocabulary] = useState<string[]>([])

	useEffect(() => {
		fetch('/api/tags')
			.then(res => (res.ok ? res.json() : []))
			.then((all: Array<{ name: string }>) => setVocabulary(all.map(t => t.name)))
			.catch(() => {})
	}, [])

	// Load image dimensions client-side for image-like assets
	useEffect(() => {
		for (const asset of initialAssets) {
			const kind = kindOf(asset)
			if (kind !== 'images' && kind !== 'other') continue
			if (dimensions[asset.id]) continue
			const img = new Image()
			img.onload = () => {
				setDimensions(prev => ({ ...prev, [asset.id]: { w: img.naturalWidth, h: img.naturalHeight } }))
			}
			img.src = serveUrl(asset.originalPath)
		}
	}, [initialAssets]) // eslint-disable-line react-hooks/exhaustive-deps

	const tagsOf = (a: MediaAsset) => tagOverrides[a.id] ?? a.tags

	const typeCounts = useMemo(() => {
		const counts: Record<MediaTypeFilter, number> = { all: initialAssets.length, images: 0, audio: 0, videos: 0, other: 0 }
		for (const a of initialAssets) counts[kindOf(a)]++
		return counts
	}, [initialAssets])

	const tagCounts = useMemo(() => {
		const counts = new Map<string, number>()
		for (const a of initialAssets) for (const t of tagsOf(a)) counts.set(t, (counts.get(t) ?? 0) + 1)
		return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialAssets, tagOverrides])

	const filtered = initialAssets.filter(a => {
		if (typeFilter !== 'all' && kindOf(a) !== typeFilter) return false
		const haystack = `${a.name ?? ''} ${filenameFromPath(a.originalPath)} ${tagsOf(a).join(' ')}`.toLowerCase()
		if (!haystack.includes(search.toLowerCase())) return false
		if (activeTags.size && ![...activeTags].every(t => tagsOf(a).includes(t))) return false
		return true
	})

	const toggleTag = (name: string) => {
		setActiveTags(prev => {
			const next = new Set(prev)
			next.has(name) ? next.delete(name) : next.add(name)
			return next
		})
	}

	const saveTags = async (asset: MediaAsset, tags: string[]) => {
		const previous = tagsOf(asset)
		setTagOverrides(prev => ({ ...prev, [asset.id]: tags }))
		try {
			const res = await fetch(`/api/assets/${asset.id}/tags`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tags }),
			})
			if (!res.ok) throw new Error()
			const data = await res.json()
			setTagOverrides(prev => ({ ...prev, [asset.id]: data.tags }))
			setVocabulary(prev => [...new Set([...prev, ...data.tags])])
			router.refresh()
		} catch {
			setTagOverrides(prev => ({ ...prev, [asset.id]: previous }))
			setMessage('Failed to save tags')
		}
	}

	const handleScan = async () => {
		setScanning(true)
		setMessage(null)
		try {
			const res = await fetch('/api/assets/scan', { method: 'POST' })
			const data = await res.json()
			setMessage(data.message)
			// Also generate thumbnails for any videos missing them
			await fetch('/api/assets/probe', { method: 'POST' })
			router.refresh()
		} catch {
			setMessage('Scan failed')
		} finally {
			setScanning(false)
		}
	}

	const handleUpload = async (files: FileList) => {
		setUploading(true)
		setMessage(null)
		const fileList = Array.from(files)
		let uploaded = 0
		const failures: Array<{ name: string; reason: string }> = []

		for (const file of fileList) {
			const formData = new FormData()
			formData.append('file', file)
			try {
				const res = await fetch('/api/assets', { method: 'POST', body: formData })
				if (res.ok) {
					uploaded++
				} else {
					const data = await res.json().catch(() => null)
					const reason = typeof data?.error === 'string' ? data.error : `Server error (${res.status})`
					failures.push({ name: file.name, reason })
				}
			} catch {
				failures.push({ name: file.name, reason: 'Network error' })
			}
		}

		if (failures.length === 0) {
			setMessage(`Uploaded ${uploaded} file(s)`)
		} else {
			const details = failures.map(f => `${f.name} (${f.reason})`).join(', ')
			setMessage(`Uploaded ${uploaded} of ${fileList.length} files. Failed: ${details}`)
		}
		setUploading(false)
		if (uploaded > 0) router.refresh()
	}

	const handleDelete = async (id: string) => {
		if (!confirm('Delete this asset?')) return
		try {
			const res = await fetch(`/api/assets/${id}`, { method: 'DELETE' })
			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				setMessage(data.error || 'Delete failed')
				return
			}
			router.refresh()
		} catch {
			setMessage('Delete failed')
		}
	}

	const startEditing = (asset: MediaAsset) => {
		setEditingId(asset.id)
		setEditName(asset.name ?? '')
	}

	const handleSaveName = async (id: string) => {
		setSaving(true)
		try {
			await fetch(`/api/assets/${id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: editName }),
			})
			setEditingId(null)
			router.refresh()
		} catch {
			setMessage('Failed to save name')
		} finally {
			setSaving(false)
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleSaveName(id)
		} else if (e.key === 'Escape') {
			setEditingId(null)
		}
	}

	return (
		<>
			<div className="mb-6 space-y-3">
				<div className="flex flex-wrap items-center gap-3">
					<button
						onClick={handleScan}
						disabled={scanning}
						className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
					>
						{scanning ? 'Scanning...' : 'Scan Assets Folder'}
					</button>
					<button
						onClick={() => fileInputRef.current?.click()}
						disabled={uploading}
						className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800 disabled:opacity-50"
					>
						{uploading ? 'Uploading...' : 'Upload Files'}
					</button>
					<input
						ref={fileInputRef}
						type="file"
						multiple
						accept="image/*,video/*,audio/*"
						className="hidden"
						onChange={e => {
							if (e.target.files?.length) handleUpload(e.target.files)
							e.target.value = ''
						}}
					/>
					{message && <span className="text-sm text-slate-400">{message}</span>}
				</div>

				<div className="flex flex-wrap items-center gap-3">
					<input
						type="search"
						value={search}
						onChange={e => setSearch(e.target.value)}
						placeholder="Search media..."
						aria-label="Search media"
						className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
					/>
					<div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
						{typeFilters.map(f => (
							<button
								key={f.key}
								onClick={() => setTypeFilter(f.key)}
								aria-pressed={typeFilter === f.key}
								className={`rounded-full border px-3 py-1 text-xs transition-colors ${
									typeFilter === f.key
										? 'border-blue-500 bg-blue-600/20 text-blue-300'
										: 'border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
								}`}
							>
								{f.label} <span className="opacity-60 tabular-nums">{typeCounts[f.key]}</span>
							</button>
						))}
					</div>
				</div>

				<TagFilterBar tags={tagCounts} active={activeTags} onToggle={toggleTag} />
			</div>

			{initialAssets.length === 0 ? (
				<div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
					<p className="text-slate-400">
						No media yet. Place files in the assets folder and click &quot;Scan Assets Folder&quot;, or upload files directly.
					</p>
				</div>
			) : filtered.length === 0 ? (
				<div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
					<p className="text-slate-400">Nothing matches this search, type, and tag combination.</p>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{filtered.map(asset => {
						const kind = kindOf(asset)
						const filename = filenameFromPath(asset.originalPath)
						const isEditing = editingId === asset.id
						const duration = asset.duration ? formatDuration(asset.duration) : null

						return (
							<div key={asset.id} className="group relative rounded-xl border border-slate-800 bg-slate-900 p-3">
								{/* Media preview */}
								<div className="relative mb-2 overflow-hidden rounded-lg bg-slate-800">
									{kind === 'videos' ? (
										asset.derivedPath ? (
											/* eslint-disable-next-line @next/next/no-img-element */
											<img src={serveUrl(asset.derivedPath)} alt="" className="aspect-video w-full object-cover" loading="lazy" />
										) : (
											<div className="flex aspect-video w-full items-center justify-center">
												<VideoIcon className="h-10 w-10 text-slate-600" />
											</div>
										)
									) : kind === 'audio' ? (
										asset.derivedPath ? (
											/* eslint-disable-next-line @next/next/no-img-element */
											<img src={serveUrl(asset.derivedPath)} alt="" className="aspect-video w-full object-cover" loading="lazy" />
										) : (
											<div className="flex aspect-video w-full items-center justify-center">
												<MusicIcon className="h-10 w-10 text-slate-600" />
											</div>
										)
									) : (
										/* eslint-disable-next-line @next/next/no-img-element */
										<img src={serveUrl(asset.originalPath)} alt="" className="aspect-video w-full object-cover" loading="lazy" />
									)}
									{/* Duration badge for audio and video */}
									{(kind === 'videos' || kind === 'audio') && duration && (
										<span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
											{duration}
										</span>
									)}
								</div>

								{/* Audio playback */}
								{kind === 'audio' && <audio src={serveUrl(asset.originalPath)} controls className="mb-2 h-8 w-full" preload="none" />}

								{/* Name / rename */}
								{isEditing ? (
									<div className="flex items-center gap-1">
										<input
											type="text"
											value={editName}
											onChange={e => setEditName(e.target.value)}
											onKeyDown={e => handleKeyDown(e, asset.id)}
											placeholder={filename}
											autoFocus
											className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
										/>
										<button
											onClick={() => handleSaveName(asset.id)}
											disabled={saving}
											className="shrink-0 rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-500 disabled:opacity-50"
										>
											Save
										</button>
										<button
											onClick={() => setEditingId(null)}
											className="shrink-0 rounded px-1 py-1 text-xs text-slate-400 hover:text-white"
										>
											Cancel
										</button>
									</div>
								) : (
									<button onClick={() => startEditing(asset)} className="group/name block w-full text-left" title="Click to edit name">
										<p className="truncate text-sm font-medium text-white group-hover/name:text-blue-400">{asset.name || filename}</p>
										{asset.name && <p className="truncate text-xs text-slate-500">{filename}</p>}
									</button>
								)}

								{/* Metadata */}
								<p className="mt-0.5 text-xs text-slate-500">
									{kind === 'videos'
										? [formatResolution(asset.width, asset.height), asset.originalPath.split('.').pop()?.toUpperCase()]
												.filter(Boolean)
												.join(' · ') || asset.type
										: kind === 'audio'
											? asset.type
											: `${asset.type}${dimensions[asset.id] ? ` · ${dimensions[asset.id].w}×${dimensions[asset.id].h}` : ''}`}
								</p>

								{/* Tags */}
								<div className="mt-2">
									<TagEditor tags={tagsOf(asset)} allTags={vocabulary} onChange={tags => saveTags(asset, tags)} />
								</div>

								{/* Delete */}
								<button
									onClick={() => handleDelete(asset.id)}
									className="absolute right-2 top-2 rounded bg-red-900/80 px-2 py-1 text-xs text-red-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-800"
								>
									Delete
								</button>
							</div>
						)
					})}
				</div>
			)}
		</>
	)
}
