'use client'

import { useState, useEffect, useCallback } from 'react'

interface Profile {
	id: string
	name: string
	exportPath: string
	fileNamingPattern: string | null
}

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

interface SettingsFormProps {
	initialSettings: Record<string, string>
	initialProfiles: Profile[]
}

export function SettingsForm({ initialSettings, initialProfiles }: SettingsFormProps) {
	const [settings, setSettings] = useState(initialSettings)
	const [saving, setSaving] = useState(false)
	const [saved, setSaved] = useState(false)
	const [testing, setTesting] = useState(false)
	const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null)

	// Media source/library state
	const [mediaSources, setMediaSources] = useState<MediaSource[]>([])
	const [loadingSources, setLoadingSources] = useState(false)

	// Publish profiles state
	const [profiles, setProfiles] = useState(initialProfiles)
	const [showNewProfile, setShowNewProfile] = useState(false)
	const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
	const [newProfileName, setNewProfileName] = useState('')
	const [newProfilePath, setNewProfilePath] = useState('')
	const [newProfilePattern, setNewProfilePattern] = useState('{title}-{programId}.mp4')
	const [savingProfile, setSavingProfile] = useState(false)
	const [profileError, setProfileError] = useState<string | null>(null)

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

	// Profile CRUD
	const handleCreateProfile = async () => {
		if (!newProfileName.trim() || !newProfilePath.trim()) return
		setSavingProfile(true)
		try {
			const res = await fetch('/api/publish-profiles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: newProfileName,
					exportPath: newProfilePath,
					fileNamingPattern: newProfilePattern || null,
				}),
			})
			if (res.ok) {
				const profile = await res.json()
				setProfiles(prev => [...prev, profile])
				setShowNewProfile(false)
				setNewProfileName('')
				setNewProfilePath('')
				setNewProfilePattern('{title}-{programId}.mp4')
			}
		} catch {
			setProfileError('Failed to create profile')
		} finally {
			setSavingProfile(false)
		}
	}

	const handleUpdateProfile = async (profile: Profile) => {
		setSavingProfile(true)
		try {
			const res = await fetch(`/api/publish-profiles/${profile.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: profile.name,
					exportPath: profile.exportPath,
					fileNamingPattern: profile.fileNamingPattern,
				}),
			})
			if (res.ok) {
				const updated = await res.json()
				setProfiles(prev => prev.map(p => (p.id === updated.id ? { ...p, ...updated } : p)))
				setEditingProfileId(null)
			}
		} catch {
			setProfileError('Failed to update profile')
		} finally {
			setSavingProfile(false)
		}
	}

	const handleDeleteProfile = async (profileId: string) => {
		if (!confirm('Delete this publish profile? Associated artifacts will be unlinked.')) return
		try {
			const res = await fetch(`/api/publish-profiles/${profileId}`, { method: 'DELETE' })
			if (res.ok) {
				setProfiles(prev => prev.filter(p => p.id !== profileId))
			} else {
				const data = await res.json().catch(() => ({}))
				setProfileError(data.error || 'Failed to delete profile')
			}
		} catch {
			setProfileError('Failed to delete profile')
		}
	}

	return (
		<div className="max-w-2xl space-y-8">
			{/* General */}
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

			{/* Publish Profiles */}
			<section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-lg font-semibold text-white">Publish Profiles</h3>
					<button onClick={() => setShowNewProfile(!showNewProfile)} className="text-sm text-blue-400 hover:text-blue-300">
						{showNewProfile ? 'Cancel' : '+ New Profile'}
					</button>
				</div>

				{profileError && (
					<div className="mb-4 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
						{profileError}
						<button onClick={() => setProfileError(null)} className="ml-3 text-red-400 hover:text-red-200">
							&times;
						</button>
					</div>
				)}

				{showNewProfile && (
					<div className="mb-4 space-y-3 rounded-lg border border-slate-700 bg-slate-800 p-4">
						<div>
							<label className="block text-xs text-slate-400">Name</label>
							<input
								type="text"
								value={newProfileName}
								onChange={e => setNewProfileName(e.target.value)}
								placeholder="e.g. Local Export"
								className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div>
							<label className="block text-xs text-slate-400">Export Path</label>
							<input
								type="text"
								value={newProfilePath}
								onChange={e => setNewProfilePath(e.target.value)}
								placeholder="e.g. /media/exports"
								className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div>
							<label className="block text-xs text-slate-400">File Naming Pattern</label>
							<input
								type="text"
								value={newProfilePattern}
								onChange={e => setNewProfilePattern(e.target.value)}
								placeholder="{title}-{programId}.mp4"
								className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
							/>
							<p className="mt-1 text-xs text-slate-500">
								Tokens: {'{title}'}, {'{clipId}'}, {'{programId}'}, {'{timestamp}'}
							</p>
						</div>
						<button
							onClick={handleCreateProfile}
							disabled={savingProfile || !newProfileName.trim() || !newProfilePath.trim()}
							className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
						>
							{savingProfile ? 'Creating...' : 'Create Profile'}
						</button>
					</div>
				)}

				{profiles.length === 0 && !showNewProfile ? (
					<div className="rounded-lg border border-dashed border-slate-700 p-6 text-center">
						<p className="text-sm text-slate-400">No publish profiles configured.</p>
						<button onClick={() => setShowNewProfile(true)} className="mt-2 text-sm text-blue-400 hover:text-blue-300">
							Create your first profile
						</button>
					</div>
				) : (
					<div className="space-y-2">
						{profiles.map(p =>
							editingProfileId === p.id ? (
								<ProfileEditForm
									key={p.id}
									profile={p}
									saving={savingProfile}
									onSave={handleUpdateProfile}
									onCancel={() => setEditingProfileId(null)}
								/>
							) : (
								<div key={p.id} className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 p-3">
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium text-white">{p.name}</p>
										<p className="mt-0.5 text-xs text-slate-400">{p.exportPath}</p>
										{p.fileNamingPattern && <p className="mt-0.5 text-xs text-slate-500">{p.fileNamingPattern}</p>}
									</div>
									<div className="flex shrink-0 gap-2">
										<button
											onClick={() => setEditingProfileId(p.id)}
											className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-700 hover:text-white"
										>
											Edit
										</button>
										<button
											onClick={() => handleDeleteProfile(p.id)}
											className="rounded-lg border border-red-800/50 px-3 py-1.5 text-xs text-red-400 hover:bg-red-950 hover:text-red-300"
										>
											Delete
										</button>
									</div>
								</div>
							)
						)}
					</div>
				)}
			</section>

			{/* Tunarr */}
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
						<p className="mt-1 text-xs text-slate-500">Filesystem path where Tunarr can access exported videos</p>
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

function ProfileEditForm({
	profile,
	saving,
	onSave,
	onCancel,
}: {
	profile: Profile
	saving: boolean
	onSave: (p: Profile) => void
	onCancel: () => void
}) {
	const [name, setName] = useState(profile.name)
	const [exportPath, setExportPath] = useState(profile.exportPath)
	const [pattern, setPattern] = useState(profile.fileNamingPattern ?? '')

	return (
		<div className="space-y-3 rounded-lg border border-blue-800 bg-slate-800 p-3">
			<div>
				<label className="block text-xs text-slate-400">Name</label>
				<input
					type="text"
					value={name}
					onChange={e => setName(e.target.value)}
					className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
				/>
			</div>
			<div>
				<label className="block text-xs text-slate-400">Export Path</label>
				<input
					type="text"
					value={exportPath}
					onChange={e => setExportPath(e.target.value)}
					className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
				/>
			</div>
			<div>
				<label className="block text-xs text-slate-400">File Naming Pattern</label>
				<input
					type="text"
					value={pattern}
					onChange={e => setPattern(e.target.value)}
					placeholder="{title}-{programId}.mp4"
					className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
				/>
			</div>
			<div className="flex gap-2">
				<button
					onClick={() => onSave({ ...profile, name, exportPath, fileNamingPattern: pattern || null })}
					disabled={saving || !name.trim() || !exportPath.trim()}
					className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
				>
					{saving ? 'Saving...' : 'Save'}
				</button>
				<button onClick={onCancel} className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 hover:text-white">
					Cancel
				</button>
			</div>
		</div>
	)
}
