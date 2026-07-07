'use client'

interface GeneralSettingsProps {
	settings: Record<string, string>
	update: (key: string, value: string) => void
}

export function GeneralSettings({ settings, update }: GeneralSettingsProps) {
	return (
		<section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
			<h3 className="mb-4 text-lg font-semibold text-white">General</h3>
			<div className="space-y-4">
				<div>
					<label className="block text-sm text-slate-400">Property Name</label>
					<input
						type="text"
						value={settings.property_name ?? ''}
						onChange={e => update('property_name', e.target.value)}
						placeholder="Lake Tahoe Guest House"
						className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
					/>
				</div>
				<label className="flex items-center gap-3 cursor-pointer">
					<div className="relative">
						<input
							type="checkbox"
							checked={settings.generate_nfo === 'true'}
							onChange={e => update('generate_nfo', e.target.checked ? 'true' : 'false')}
							className="peer sr-only"
						/>
						<div className="h-5 w-9 rounded-full bg-slate-700 transition-colors peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-900" />
						<div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-slate-400 transition-all peer-checked:translate-x-4 peer-checked:bg-white" />
					</div>
					<div>
						<span className="text-sm text-slate-300">Generate .nfo metadata files</span>
						<p className="text-xs text-slate-500">Creates Kodi-style XML sidecar files alongside published videos</p>
					</div>
				</label>
			</div>
		</section>
	)
}
