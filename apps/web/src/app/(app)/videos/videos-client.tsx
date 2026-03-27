'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface VideoAsset {
	id: string
	name: string | null
	originalPath: string
	thumbnailPath: string | null
	width: number | null
	height: number | null
	duration: number | null
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
	return `${w}\u00d7${h}`
}

function filenameFromPath(path: string): string {
	return path.split('/').pop() ?? 'video'
}

function serveUrl(path: string): string {
	return `/api/assets/serve?path=${encodeURIComponent(path)}`
}

export function VideosClient({ initialAssets }: { initialAssets: VideoAsset[] }) {
	const router = useRouter()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [scanning, setScanning] = useState(false)
	const [uploading, setUploading] = useState(false)
	const [message, setMessage] = useState<string | null>(null)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editName, setEditName] = useState('')
	const [saving, setSaving] = useState(false)

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
		let uploaded = 0
		for (const file of Array.from(files)) {
			const formData = new FormData()
			formData.append('file', file)
			try {
				const res = await fetch('/api/assets', { method: 'POST', body: formData })
				if (res.ok) uploaded++
			} catch {
				/* continue */
			}
		}
		setMessage(`Uploaded ${uploaded} file(s)`)
		setUploading(false)
		router.refresh()
	}

	const handleDelete = async (id: string) => {
		if (!confirm('Delete this video?')) return
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

	const startEditing = (asset: VideoAsset) => {
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
			<div className="mb-6 flex flex-wrap items-center gap-3">
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
					{uploading ? 'Uploading...' : 'Upload Videos'}
				</button>
				<input
					ref={fileInputRef}
					type="file"
					multiple
					accept="video/*"
					className="hidden"
					onChange={e => {
						if (e.target.files?.length) handleUpload(e.target.files)
						e.target.value = ''
					}}
				/>
				{message && <span className="text-sm text-slate-400">{message}</span>}
			</div>

			{initialAssets.length === 0 ? (
				<div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
					<p className="text-slate-400">
						No video files yet. Place videos in the assets folder and click &quot;Scan Assets Folder&quot;, or upload files directly.
					</p>
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{initialAssets.map(asset => {
						const filename = filenameFromPath(asset.originalPath)
						const isEditing = editingId === asset.id
						const resolution = formatResolution(asset.width, asset.height)
						const duration = asset.duration ? formatDuration(asset.duration) : null

						return (
							<div key={asset.id} className="group relative rounded-xl border border-slate-800 bg-slate-900 p-3">
								{/* Thumbnail */}
								<div className="relative mb-2 overflow-hidden rounded-lg bg-slate-800">
									{asset.thumbnailPath ? (
										/* eslint-disable-next-line @next/next/no-img-element */
										<img src={serveUrl(asset.thumbnailPath)} alt="" className="aspect-video w-full object-cover" loading="lazy" />
									) : (
										<div className="flex aspect-video w-full items-center justify-center">
											<svg className="h-10 w-10 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z"
												/>
											</svg>
										</div>
									)}
									{/* Duration badge */}
									{duration && (
										<span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">
											{duration}
										</span>
									)}
								</div>

								{/* Name / editing */}
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
									{[resolution, asset.originalPath.split('.').pop()?.toUpperCase()].filter(Boolean).join(' \u00b7 ')}
								</p>

								{/* Delete button */}
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
