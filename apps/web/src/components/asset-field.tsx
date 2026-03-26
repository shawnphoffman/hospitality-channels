'use client'

import { useState, useRef, type ReactNode } from 'react'

export interface AssetData {
	id: string
	type: string
	originalPath: string
}

interface AssetFieldProps {
	id: string
	label: string
	value: string
	onChange: (value: string) => void
	required?: boolean
	placeholder?: string
	assetFilter: (asset: AssetData) => boolean
	accept: string
	pickerTitle: string
	pickerClassName?: string
	emptyMessage: string
	renderPreview: (value: string, onClear: () => void) => ReactNode
	renderPickerItem: (asset: AssetData, assetUrl: string) => ReactNode
}

export function assetServeUrl(asset: AssetData) {
	return `/api/assets/serve?path=${encodeURIComponent(asset.originalPath)}`
}

export function AssetField({
	id,
	label,
	value,
	onChange,
	required,
	placeholder,
	assetFilter,
	accept,
	pickerTitle,
	pickerClassName,
	emptyMessage,
	renderPreview,
	renderPickerItem,
}: AssetFieldProps) {
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
				setAssets(data.filter(assetFilter))
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
		onChange(assetServeUrl(asset))
		setShowPicker(false)
		setMode('asset')
	}

	const handleUpload = async (file: File) => {
		setUploading(true)
		try {
			const formData = new FormData()
			formData.append('file', file)
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

	const hasValue = value && value.length > 0

	return (
		<div>
			<label htmlFor={id} className="block text-sm text-slate-400">
				{label}
				{required && <span className="text-red-400"> *</span>}
			</label>

			<div className="mt-1 space-y-2">
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
						<div className="flex flex-1 items-center">
							<span className="truncate text-sm text-slate-400">
								{value
									? decodeURIComponent(value.split('path=')[1] ?? '')
											.split('/')
											.pop()
									: 'No asset selected'}
							</span>
						</div>
					)}
				</div>

				{hasValue && renderPreview(value, () => onChange(''))}
			</div>

			{showPicker && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowPicker(false)}>
					<div
						className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 p-6"
						onClick={e => e.stopPropagation()}
					>
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-lg font-semibold text-white">{pickerTitle}</h3>
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
									accept={accept}
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
							<p className="py-8 text-center text-slate-400">{emptyMessage}</p>
						) : (
							<div className={pickerClassName}>
								{assets.map(asset => (
									<button key={asset.id} type="button" onClick={() => selectAsset(asset)} className="w-full">
										{renderPickerItem(asset, assetServeUrl(asset))}
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
