'use client'

import { AssetField, type AssetData } from './asset-field'

interface AudioFieldProps {
	id: string
	label: string
	value: string
	onChange: (value: string) => void
	required?: boolean
	placeholder?: string
}

export function AudioField(props: AudioFieldProps) {
	return (
		<AssetField
			{...props}
			placeholder={props.placeholder || 'https://... or /path/to/audio.mp3'}
			assetFilter={(a: AssetData) => a.type === 'audio'}
			accept="audio/*"
			pickerTitle="Select Audio"
			pickerClassName="space-y-2"
			emptyMessage="No audio assets found. Upload one or scan the assets folder."
			renderPreview={(value, onClear) => (
				<div className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2">
					<audio src={value} controls className="h-8 flex-1" />
					<button type="button" onClick={onClear} className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-600">
						Clear
					</button>
				</div>
			)}
			renderPickerItem={asset => (
				<div className="flex w-full items-center gap-3 rounded-lg border border-slate-700 p-3 text-left transition-colors hover:border-blue-500">
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
						<p className="truncate text-sm text-white">{asset.originalPath.split('/').pop()}</p>
					</div>
				</div>
			)}
		/>
	)
}
