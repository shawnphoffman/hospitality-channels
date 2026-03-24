'use client'

import { useState } from 'react'

interface SettingsFormProps {
	initialSettings: Record<string, string>
}

export function SettingsForm({ initialSettings }: SettingsFormProps) {
	const [settings, setSettings] = useState(initialSettings)
	const [saving, setSaving] = useState(false)
	const [saved, setSaved] = useState(false)
	const [testing, setTesting] = useState(false)
	const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

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

	const handleTestConnection = async () => {
		setTesting(true)
		setTestResult(null)
		try {
			// Save settings first so the API can read the URL
			await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(settings),
			})
			const res = await fetch('/api/tunarr/channels')
			if (res.ok) {
				const channels = await res.json()
				setTestResult({ ok: true, message: `Connected — ${channels.length} channel${channels.length !== 1 ? 's' : ''} found` })
			} else {
				const data = await res.json().catch(() => ({}))
				setTestResult({ ok: false, message: data.error || 'Connection failed' })
			}
		} catch {
			setTestResult({ ok: false, message: 'Connection failed' })
		} finally {
			setTesting(false)
		}
	}

	return (
		<div className="max-w-2xl space-y-8">
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
				</div>
			</section>

			<section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
				<h3 className="mb-4 text-lg font-semibold text-white">Tunarr</h3>
				<div className="space-y-4">
					<div>
						<label className="block text-sm text-slate-400">Tunarr URL</label>
						<input
							type="text"
							value={settings.tunarr_url ?? ''}
							onChange={e => update('tunarr_url', e.target.value)}
							placeholder="http://tunarr:8000"
							className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
						/>
						<p className="mt-1 text-xs text-slate-500">Base URL of your Tunarr instance</p>
					</div>
					<div>
						<label className="block text-sm text-slate-400">Tunarr Media Path</label>
						<input
							type="text"
							value={settings.tunarr_media_path ?? ''}
							onChange={e => update('tunarr_media_path', e.target.value)}
							placeholder="/media/tunarr"
							className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
						/>
						<p className="mt-1 text-xs text-slate-500">The path where Tunarr can access exported videos (maps to your export directory)</p>
					</div>
					<div className="flex items-center gap-3">
						<button
							onClick={handleTestConnection}
							disabled={testing || !settings.tunarr_url}
							className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
						>
							{testing ? 'Testing...' : 'Test Connection'}
						</button>
						{testResult && <span className={`text-sm ${testResult.ok ? 'text-green-400' : 'text-red-400'}`}>{testResult.message}</span>}
					</div>
				</div>
			</section>

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
