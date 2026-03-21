'use client'

import { useState, useEffect, useRef } from 'react'

interface AssetData {
	id: string
	type: string
	originalPath: string
}

interface ImageFieldProps {
	id: string
	label: string
	value: string
	onChange: (value: string) => void
	required?: boolean
	placeholder?: string
}

export function ImageField({ id, label, value, onChange, required, placeholder }: ImageFieldProps) {
	const [mode, setMode] = useState<'url' | 'asset'>(value && !value.startsWith('/api/assets/serve') ? 'url' : 'asset')
	const [showPicker, setShowPicker] = useState(false)
	const [assets, setAssets] = useState<AssetData[]>([])
	const [loadingAssets, setLoadingAssets] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [uploading, setUploading] = useState(false)

	const loadAssets = async () => {
		setLoadingAssets(true)
		try {
			const res = await fetch('/api/assets')
			if (res.ok) {
				const data: AssetData[] = await res.json()
				setAssets(data.filter(a => a.type !== 'video'))
			}
		} catch {
			// ignore
		} finally {
			setLoadingAssets(false)
		}
	}

	const openPicker = () => {
		setShowPicker(true)
		loadAssets()
	}

	const selectAsset = (asset: AssetData) => {
		onChange(`/api/assets/serve?path=${encodeURIComponent(asset.originalPath)}`)
		setShowPicker(false)
		setMode('asset')
	}

	const handleUpload = async (file: File) => {
		setUploading(true)
		const formData = new FormData()
		formData.append('file', file)
		try {
			const res = await fetch('/api/assets', { method: 'POST', body: formData })
			if (res.ok) {
				const asset: AssetData = await res.json()
				selectAsset(asset)
				await loadAssets()
			}
		} catch {
			// ignore
		} finally {
			setUploading(false)
		}
	}

	const assetUrl = (asset: AssetData) => `/api/assets/serve?path=${encodeURIComponent(asset.originalPath)}`

	const hasPreview = value && value.length > 0

	return (
		<div>
			<label htmlFor={id} className="block text-sm text-slate-400">
				{label}
				{required && <span className="text-red-400"> *</span>}
			</label>

			<div className="mt-1 space-y-2">
				{/* Mode toggle + input */}
				<div className="flex gap-2">
					<div className="flex overflow-hidden rounded-lg border border-slate-700">
						<button
							type="button"
							onClick={() => setMode('url')}
							className={`px-3 py-2 text-xs ${mode === 'url' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-300'}`}
						>
							URL
						</button>
						<button
							type="button"
							onClick={() => {
								setMode('asset')
								openPicker()
							}}
							className={`px-3 py-2 text-xs ${mode === 'asset' ? 'bg-slate-700 text-white' : 'bg-slate-800 text-slate-400 hover:text-slate-300'}`}
						>
							Asset
						</button>
					</div>
					{mode === 'url' ? (
						<input
							id={id}
							type="text"
							value={value}
							onChange={e => onChange(e.target.value)}
							placeholder={placeholder || 'https://...'}
							className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
						/>
					) : (
						<div className="flex flex-1 items-center gap-2">
							<button
								type="button"
								onClick={openPicker}
								className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-slate-500"
							>
								{value ? 'Change Asset' : 'Select Asset'}
							</button>
							{value && (
								<span className="truncate text-xs text-slate-500">
									{decodeURIComponent(value.split('path=')[1] ?? '')
										.split('/')
										.pop()}
								</span>
							)}
						</div>
					)}
				</div>

				{/* Preview */}
				{hasPreview && (
					<div className="relative inline-block overflow-hidden rounded-lg border border-slate-700">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={value} alt="" className="h-24 max-w-xs object-cover" />
						<button
							type="button"
							onClick={() => onChange('')}
							className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white hover:bg-black/80"
						>
							Clear
						</button>
					</div>
				)}
			</div>

			{/* Asset picker modal */}
			{showPicker && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowPicker(false)}>
					<div
						className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6"
						onClick={e => e.stopPropagation()}
					>
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-lg font-semibold text-white">Select Asset</h3>
							<div className="flex items-center gap-2">
								<button
									type="button"
									onClick={() => fileInputRef.current?.click()}
									disabled={uploading}
									className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500 disabled:opacity-50"
								>
									{uploading ? 'Uploading...' : 'Upload New'}
								</button>
								<input
									ref={fileInputRef}
									type="file"
									accept="image/*"
									className="hidden"
									onChange={e => {
										const file = e.target.files?.[0]
										if (file) handleUpload(file)
										e.target.value = ''
									}}
								/>
								<button type="button" onClick={() => setShowPicker(false)} className="text-sm text-slate-400 hover:text-white">
									Cancel
								</button>
							</div>
						</div>

						{loadingAssets ? (
							<p className="py-8 text-center text-slate-400">Loading assets...</p>
						) : assets.length === 0 ? (
							<p className="py-8 text-center text-slate-400">No image assets found. Upload one or scan the assets folder first.</p>
						) : (
							<div className="grid grid-cols-3 gap-3">
								{assets.map(asset => (
									<button
										key={asset.id}
										type="button"
										onClick={() => selectAsset(asset)}
										className="overflow-hidden rounded-lg border border-slate-700 transition-colors hover:border-blue-500"
									>
										{/* eslint-disable-next-line @next/next/no-img-element */}
										<img src={assetUrl(asset)} alt="" className="aspect-video w-full object-cover" loading="lazy" />
										<p className="truncate px-2 py-1 text-xs text-slate-400">{asset.originalPath.split('/').pop()}</p>
									</button>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}
