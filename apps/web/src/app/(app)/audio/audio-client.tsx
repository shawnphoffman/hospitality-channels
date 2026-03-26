'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface AssetData {
	id: string
	name: string | null
	originalPath: string
	duration: number | null
	coverArtPath: string | null
}

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60)
	const s = Math.floor(seconds % 60)
	return `${m}:${s.toString().padStart(2, '0')}`
}

function filenameFromPath(path: string): string {
	return path.split('/').pop() ?? 'audio'
}

export function AudioClient({ initialAssets }: { initialAssets: AssetData[] }) {
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
		if (!confirm('Delete this audio file?')) return
		try {
			await fetch(`/api/assets/${id}`, { method: 'DELETE' })
			router.refresh()
		} catch {
			setMessage('Delete failed')
		}
	}

	const startEditing = (asset: AssetData) => {
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
					{uploading ? 'Uploading...' : 'Upload Audio'}
				</button>
				<input
					ref={fileInputRef}
					type="file"
					multiple
					accept="audio/*"
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
						No audio files yet. Place audio in the assets folder and click &quot;Scan Assets Folder&quot;, or upload files directly.
					</p>
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border border-slate-800">
					<table className="w-full">
						<thead>
							<tr className="border-b border-slate-800 bg-slate-900/50 text-left text-xs font-medium uppercase tracking-wider text-slate-500">
								<th className="px-4 py-3">Name</th>
								<th className="hidden px-4 py-3 sm:table-cell">File</th>
								<th className="px-4 py-3 text-right">Duration</th>
								<th className="px-4 py-3 text-right">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-800/50">
							{initialAssets.map(asset => {
								const filename = filenameFromPath(asset.originalPath)
								const isEditing = editingId === asset.id

								return (
									<tr key={asset.id} className="group bg-slate-900 transition-colors hover:bg-slate-800/50">
										<td className="px-4 py-3">
											{isEditing ? (
												<div className="flex items-center gap-2">
													<input
														type="text"
														value={editName}
														onChange={e => setEditName(e.target.value)}
														onKeyDown={e => handleKeyDown(e, asset.id)}
														placeholder={filename}
														autoFocus
														className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
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
														className="shrink-0 rounded px-2 py-1 text-xs text-slate-400 hover:text-white"
													>
														Cancel
													</button>
												</div>
											) : (
												<div className="flex items-center gap-2">
													{asset.coverArtPath ? (
														/* eslint-disable-next-line @next/next/no-img-element */
														<img
															src={`/api/assets/serve?path=${encodeURIComponent(asset.coverArtPath)}`}
															alt=""
															className="h-8 w-8 shrink-0 rounded object-cover"
														/>
													) : (
														<svg
															className="h-5 w-5 shrink-0 text-slate-500"
															fill="none"
															viewBox="0 0 24 24"
															stroke="currentColor"
															strokeWidth={1.5}
														>
															<path
																strokeLinecap="round"
																strokeLinejoin="round"
																d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
															/>
														</svg>
													)}
													<button onClick={() => startEditing(asset)} className="group/name min-w-0 text-left" title="Click to edit name">
														<span className="block truncate text-sm font-medium text-white group-hover/name:text-blue-400">
															{asset.name || filename}
														</span>
														{asset.name && <span className="block truncate text-xs text-slate-500">{filename}</span>}
													</button>
												</div>
											)}
										</td>
										<td className="hidden px-4 py-3 sm:table-cell">
											<audio
												src={`/api/assets/serve?path=${encodeURIComponent(asset.originalPath)}`}
												controls
												className="h-8 w-full max-w-xs"
												preload="none"
											/>
										</td>
										<td className="px-4 py-3 text-right">
											<span className="text-sm text-slate-400">{asset.duration ? formatDuration(asset.duration) : '--:--'}</span>
										</td>
										<td className="px-4 py-3 text-right">
											<div className="flex items-center justify-end gap-1">
												{/* Mobile audio player toggle */}
												<button
													onClick={e => {
														const row = (e.target as HTMLElement).closest('tr')
														const audio = row?.querySelector('audio')
														if (audio) {
															if (audio.paused) audio.play()
															else audio.pause()
														}
													}}
													className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-700 hover:text-white sm:hidden"
													title="Play"
												>
													<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
														/>
														<path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
												</button>
												<button
													onClick={() => handleDelete(asset.id)}
													className="rounded p-1.5 text-slate-500 transition-colors hover:bg-red-900/50 hover:text-red-400"
													title="Delete"
												>
													<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
														/>
													</svg>
												</button>
											</div>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}
		</>
	)
}
