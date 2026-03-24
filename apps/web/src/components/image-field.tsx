'use client'

import { AssetField, type AssetData } from './asset-field'

interface ImageFieldProps {
	id: string
	label: string
	value: string
	onChange: (value: string) => void
	required?: boolean
	placeholder?: string
}

export function ImageField(props: ImageFieldProps) {
	return (
		<AssetField
			{...props}
			assetFilter={(a: AssetData) => a.type !== 'video' && a.type !== 'audio'}
			accept="image/*"
			pickerTitle="Select Asset"
			pickerClassName="grid grid-cols-3 gap-3"
			emptyMessage="No image assets found. Upload one or scan the assets folder first."
			renderPreview={(value, onClear) => (
				<div className="relative inline-block overflow-hidden rounded-lg border border-slate-700">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={value} alt="" className="h-24 max-w-xs object-cover" />
					<button
						type="button"
						onClick={onClear}
						className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white hover:bg-black/80"
					>
						Clear
					</button>
				</div>
			)}
			renderPickerItem={(asset, assetUrl) => (
				<div className="overflow-hidden rounded-lg border border-slate-700 transition-colors hover:border-blue-500">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={assetUrl} alt="" className="aspect-video w-full object-cover" loading="lazy" />
					<p className="truncate px-2 py-1 text-xs text-slate-400">{asset.originalPath.split('/').pop()}</p>
				</div>
			)}
		/>
	)
}
