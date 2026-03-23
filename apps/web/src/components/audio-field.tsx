'use client'

import { useState, useRef } from 'react'

interface AssetData {
	id: string
	type: string
	originalPath: string
}

interface AudioFieldProps {
	id: string
	label: string
	value: string
	onChange: (value: string) => void
	required?: boolean
	placeholder?: string
}

export function AudioField({ id, label, value, onChange, required, placeholder }: AudioFieldProps) {
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
				setAssets(data.filter(a => a.type === 'audio'))
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
	const fileName = (asset: AssetData) => asset.originalPath.split('/').pop() ?? ''

	const hasValue = value && value.length > 0

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
							placeholder={placeholder || 'https://... or /path/to/audio.mp3'}
							className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
						/>
					) : (
						<div className="flex flex-1 items-center gap-2">
							<button
								type="button"
								onClick={openPicker}
								className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition-colors hover:border-slate-500"
							>
								{value ? 'Change Audio' : 'Select Audio'}
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

				{/* Audio preview */}
				{hasValue && (
					<div className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2">
						<audio src={value} controls className="h-8 flex-1" />
						<button
							type="button"
							onClick={() => onChange('')}
							className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-600"
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
							<h3 className="text-lg font-semibold text-white">Select Audio</h3>
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
									accept="audio/*"
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
							<p className="py-8 text-center text-slate-400">Loading audio assets...</p>
						) : assets.length === 0 ? (
							<p className="py-8 text-center text-slate-400">No audio assets found. Upload one or scan the assets folder.</p>
						) : (
							<div className="space-y-2">
								{assets.map(asset => (
									<button
										key={asset.id}
										type="button"
										onClick={() => selectAsset(asset)}
										className="flex w-full items-center gap-3 rounded-lg border border-slate-700 p-3 text-left transition-colors hover:border-blue-500"
									>
										<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400">
											<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
												<path
													fillRule="evenodd"
													d="M19.952 1.651a.75.75 0 01.298.599V16.303a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.403-4.909l2.311-.66a1.5 1.5 0 001.088-1.442V6.994l-9 2.572v9.737a3 3 0 01-2.176 2.884l-1.32.377a2.553 2.553 0 11-1.402-4.909l2.31-.66a1.5 1.5 0 001.088-1.442V5.25a.75.75 0 01.544-.721l10.5-3a.75.75 0 01.456.122z"
													clipRule="evenodd"
												/>
											</svg>
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm text-white">{fileName(asset)}</p>
										</div>
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
