'use client'

import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react'

interface MediaLibrary {
	id?: string
	uuid?: string
	name: string
}

interface MediaSource {
	id: string
	name: string
	type: string
	libraries: MediaLibrary[]
}

interface TunarrSettingsProps {
	settings: Record<string, string>
	update: (key: string, value: string) => void
	setSettings: Dispatch<SetStateAction<Record<string, string>>>
	setSaved: (saved: boolean) => void
	profiles: { id: string; name: string; exportPath: string }[]
}

interface DiagnosticStep {
	name: string
	ok: boolean
	detail: string
	suggestion?: string
}

export function TunarrSettings({ settings, update, setSettings, setSaved, profiles }: TunarrSettingsProps) {
	const [testing, setTesting] = useState(false)
	const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)
	const [diagnosing, setDiagnosing] = useState(false)
	const [diagnosticSteps, setDiagnosticSteps] = useState<DiagnosticStep[] | null>(null)

	// Media source/library state
	const [mediaSources, setMediaSources] = useState<MediaSource[]>([])
	const [loadingSources, setLoadingSources] = useState(false)

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
				setTestResult({ ok: true, message: `Connected - ${channels.length} channel${channels.length !== 1 ? 's' : ''} found` })
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

	const handleDiagnose = async () => {
		setDiagnosing(true)
		setDiagnosticSteps(null)
		try {
			// Save settings first so the diagnostics run against the current values
			await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(settings),
			})
			const res = await fetch('/api/tunarr/diagnose')
			if (res.ok) {
				const data = await res.json()
				setDiagnosticSteps(data.steps ?? [])
			} else {
				const data = await res.json().catch(() => ({}))
				setDiagnosticSteps([{ name: 'Diagnostics', ok: false, detail: data.error || `Diagnostics failed (${res.status})` }])
			}
		} catch {
			setDiagnosticSteps([{ name: 'Diagnostics', ok: false, detail: 'Diagnostics request failed' }])
		} finally {
			setDiagnosing(false)
		}
	}

	const fetchMediaSources = useCallback(async () => {
		if (!settings.tunarr_url) return
		setLoadingSources(true)
		try {
			// Save settings first so the API reads the current URL
			await fetch('/api/settings', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(settings),
			})
			const res = await fetch('/api/tunarr/media-sources')
			if (res.ok) {
				const sources: MediaSource[] = await res.json()
				setMediaSources(sources)
			}
		} catch {
			/* ignore */
		} finally {
			setLoadingSources(false)
		}
	}, [settings])

	// Auto-load media sources when Tunarr URL is set and we have a connection
	useEffect(() => {
		if (settings.tunarr_url && mediaSources.length === 0) {
			fetchMediaSources()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const getLibraryId = (lib: MediaLibrary) => lib.id || lib.uuid || ''

	// Build flat list of selectable libraries: "Source Name / Library Name"
	const libraryOptions = mediaSources.flatMap(source =>
		source.libraries.map(lib => ({
			sourceId: source.id,
			sourceName: source.name,
			libraryId: getLibraryId(lib),
			libraryName: lib.name,
			label: `${source.name} / ${lib.name}`,
			value: `${source.id}:${getLibraryId(lib)}`,
		}))
	)

	const selectedLibraryValue =
		settings.tunarr_media_source_id && settings.tunarr_library_id ? `${settings.tunarr_media_source_id}:${settings.tunarr_library_id}` : ''

	const handleLibraryChange = (value: string) => {
		if (!value) {
			setSettings(prev => ({
				...prev,
				tunarr_media_source_id: '',
				tunarr_library_id: '',
			}))
			setSaved(false)
			return
		}
		const [sourceId, libraryId] = value.split(':')
		setSettings(prev => ({
			...prev,
			tunarr_media_source_id: sourceId,
			tunarr_library_id: libraryId,
		}))
		setSaved(false)
	}

	return (
		<section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
			<h3 className="mb-4 text-lg font-semibold text-white">Tunarr</h3>
			<div className="space-y-4">
				<div>
					<label className="block text-sm text-slate-400">Tunarr URL</label>
					<div className="mt-1 flex gap-2">
						<input
							type="text"
							value={settings.tunarr_url ?? ''}
							onChange={e => update('tunarr_url', e.target.value)}
							placeholder="http://tunarr:8000"
							className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
						/>
						<button
							onClick={handleTestConnection}
							disabled={testing || !settings.tunarr_url}
							className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
						>
							{testing ? 'Testing...' : 'Test'}
						</button>
					</div>
					{testResult ? (
						<p className={`mt-1 text-xs ${testResult.ok ? 'text-green-400' : 'text-red-400'}`}>{testResult.message}</p>
					) : (
						<p className="mt-1 text-xs text-slate-500">Base URL of your Tunarr instance</p>
					)}
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
					<p className="mt-1 text-xs text-slate-500">Filesystem path where Tunarr can access exported videos</p>
				</div>

				<div>
					<label className="block text-sm text-slate-400">Channel publish profile</label>
					<select
						value={settings.tunarr_publish_profile_id ?? ''}
						onChange={e => update('tunarr_publish_profile_id', e.target.value)}
						className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
					>
						<option value="">First profile (default)</option>
						{profiles.map(p => (
							<option key={p.id} value={p.id}>
								{p.name} ({p.exportPath})
							</option>
						))}
					</select>
					<p className="mt-1 text-xs text-slate-500">
						Export location used when publishing a program to a channel. Its path should match the Tunarr media path above so Tunarr can
						index the file.
					</p>
				</div>

				{/* Media Library Selection */}
				<div className="border-t border-slate-700 pt-4">
					<div className="flex items-center justify-between">
						<label className="block text-sm text-slate-400">Media Library</label>
						<button
							onClick={fetchMediaSources}
							disabled={loadingSources || !settings.tunarr_url}
							className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
						>
							{loadingSources ? 'Loading...' : 'Refresh'}
						</button>
					</div>
					{libraryOptions.length > 0 ? (
						<select
							value={selectedLibraryValue}
							onChange={e => handleLibraryChange(e.target.value)}
							className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
						>
							<option value="">None selected</option>
							{libraryOptions.map(opt => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</select>
					) : (
						<p className="mt-1 text-xs text-slate-500">
							{settings.tunarr_url ? 'Click Refresh to load available media libraries from Tunarr' : 'Enter a Tunarr URL first'}
						</p>
					)}
					<p className="mt-1 text-xs text-slate-500">The library used when scanning for published artifacts and pushing to channels</p>
				</div>

				{/* Diagnostics */}
				<div className="border-t border-slate-700 pt-4">
					<div className="flex items-center justify-between">
						<div>
							<label className="block text-sm text-slate-400">Diagnostics</label>
							<p className="mt-1 text-xs text-slate-500">Checks the full push chain: connection, media source, library, and path mapping</p>
						</div>
						<button
							onClick={handleDiagnose}
							disabled={diagnosing || !settings.tunarr_url}
							className="shrink-0 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
						>
							{diagnosing ? 'Running...' : 'Run diagnostics'}
						</button>
					</div>
					{diagnosticSteps && (
						<ul className="mt-3 space-y-2">
							{diagnosticSteps.map(step => (
								<li key={step.name} className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2">
									<div className="flex items-start gap-2">
										<span className={`mt-0.5 text-sm ${step.ok ? 'text-green-400' : 'text-red-400'}`}>{step.ok ? '✓' : '✗'}</span>
										<div className="min-w-0">
											<p className="text-sm text-white">{step.name}</p>
											<p className="break-all text-xs text-slate-400">{step.detail}</p>
											{step.suggestion && <p className="mt-1 break-all text-xs text-amber-400">{step.suggestion}</p>}
										</div>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</section>
	)
}
