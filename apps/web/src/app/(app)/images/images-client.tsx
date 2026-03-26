'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface AssetData {
	id: string
	name: string | null
	type: string
	originalPath: string
}

export function ImagesClient({ initialAssets }: { initialAssets: AssetData[] }) {
	const router = useRouter()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [scanning, setScanning] = useState(false)
	const [uploading, setUploading] = useState(false)
	const [message, setMessage] = useState<string | null>(null)
	const [dimensions, setDimensions] = useState<Record<string, { w: number; h: number }>>({})
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editName, setEditName] = useState('')
	const [saving, setSaving] = useState(false)

	useEffect(() => {
		for (const asset of initialAssets) {
			if (dimensions[asset.id]) continue
			const img = new Image()
			img.onload = () => {
				setDimensions(prev => ({ ...prev, [asset.id]: { w: img.naturalWidth, h: img.naturalHeight } }))
			}
			img.src = `/api/assets/serve?path=${encodeURIComponent(asset.originalPath)}`
		}
	}, [initialAssets]) // eslint-disable-line react-hooks/exhaustive-deps

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
		if (!confirm('Delete this asset?')) return
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
					{uploading ? 'Uploading...' : 'Upload Images'}
				</button>
				<input
					ref={fileInputRef}
					type="file"
					multiple
					accept="image/*"
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
						No images yet. Place images in the assets folder and click &quot;Scan Assets Folder&quot;, or upload files directly.
					</p>
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
					{initialAssets.map(asset => {
						const filename = asset.originalPath.split('/').pop() ?? ''
						const isEditing = editingId === asset.id

						return (
							<div key={asset.id} className="group relative rounded-xl border border-slate-800 bg-slate-900 p-3">
								<div className="mb-2 overflow-hidden rounded-lg bg-slate-800">
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={`/api/assets/serve?path=${encodeURIComponent(asset.originalPath)}`}
										alt=""
										className="aspect-video w-full object-cover"
										loading="lazy"
									/>
								</div>
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
										{!asset.name && (
											<p className="text-xs text-slate-500">
												{asset.type}
												{dimensions[asset.id] && (
													<span className="ml-1">
														&middot; {dimensions[asset.id].w}&times;{dimensions[asset.id].h}
													</span>
												)}
											</p>
										)}
									</button>
								)}
								{asset.name && (
									<p className="text-xs text-slate-500">
										{asset.type}
										{dimensions[asset.id] && (
											<span className="ml-1">
												&middot; {dimensions[asset.id].w}&times;{dimensions[asset.id].h}
											</span>
										)}
									</p>
								)}
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
