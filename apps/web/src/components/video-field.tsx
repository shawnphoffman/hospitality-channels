'use client'

import { AssetField, assetThumbnailUrl, type AssetData } from './asset-field'

interface VideoFieldProps {
	id: string
	label: string
	value: string
	onChange: (value: string) => void
	required?: boolean
	placeholder?: string
}

export function VideoField(props: VideoFieldProps) {
	return (
		<AssetField
			{...props}
			placeholder={props.placeholder || 'https://... or /path/to/video.mp4'}
			assetFilter={(a: AssetData) => a.type === 'video'}
			accept="video/*"
			pickerTitle="Select Video"
			pickerClassName="grid grid-cols-2 gap-3"
			emptyMessage="No video assets found. Upload one or scan the assets folder."
			renderPreview={(value, onClear) => (
				<div className="relative inline-block overflow-hidden rounded-lg border border-slate-700">
					<video src={value} muted loop autoPlay playsInline className="h-24 max-w-xs object-cover" />
					<button
						type="button"
						onClick={onClear}
						className="absolute right-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white hover:bg-black/80"
					>
						Clear
					</button>
				</div>
			)}
			renderPickerItem={(asset, assetUrl) => {
				const thumbUrl = assetThumbnailUrl(asset)
				return (
					<div className="overflow-hidden rounded-lg border border-slate-700 transition-colors hover:border-blue-500">
						{thumbUrl ? (
							<img src={thumbUrl} alt="" className="aspect-video w-full object-cover" />
						) : (
							<video src={assetUrl} muted loop autoPlay playsInline className="aspect-video w-full object-cover" />
						)}
						<p className="truncate px-2 py-1 text-xs text-slate-400">{asset.name ?? asset.originalPath.split('/').pop()}</p>
					</div>
				)
			}}
		/>
	)
}
