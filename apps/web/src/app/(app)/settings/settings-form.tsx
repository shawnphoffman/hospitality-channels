'use client'

import { useState } from 'react'
import { GeneralSettings } from './general-settings'
import { PublishProfilesSection, type Profile } from './publish-profiles-section'
import { TunarrSettings } from './tunarr-settings'

interface SettingsFormProps {
	initialSettings: Record<string, string>
	initialProfiles: Profile[]
}

export function SettingsForm({ initialSettings, initialProfiles }: SettingsFormProps) {
	const [settings, setSettings] = useState(initialSettings)
	const [saving, setSaving] = useState(false)
	const [saved, setSaved] = useState(false)

	const update = (key: string, value: string) => {
		setSettings(prev => ({ ...prev, [key]: value }))
		setSaved(false)
	}

	const handleSave = async () => {
		setSaving(true)
		try {
			const res = await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(settings),
			})
			if (res.ok) {
				setSaved(true)
				setTimeout(() => setSaved(false), 3000)
			}
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="max-w-2xl space-y-8">
			<GeneralSettings settings={settings} update={update} />

			<PublishProfilesSection initialProfiles={initialProfiles} />

			<TunarrSettings settings={settings} update={update} setSettings={setSettings} setSaved={setSaved} />

			<div className="flex items-center gap-3">
				<button
					onClick={handleSave}
					disabled={saving}
					className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
				>
					{saving ? 'Saving...' : 'Save Settings'}
				</button>
				{saved && <span className="text-sm text-green-400">Saved</span>}
			</div>
		</div>
	)
}
