'use client'

import { useState } from 'react'

export interface Profile {
	id: string
	name: string
	exportPath: string
	fileNamingPattern: string | null
	allowDownload: boolean
}

interface PublishProfilesSectionProps {
	initialProfiles: Profile[]
}

export function PublishProfilesSection({ initialProfiles }: PublishProfilesSectionProps) {
	const [profiles, setProfiles] = useState(initialProfiles)
	const [showNewProfile, setShowNewProfile] = useState(false)
	const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
	const [newProfileName, setNewProfileName] = useState('')
	const [newProfilePath, setNewProfilePath] = useState('')
	const [newProfilePattern, setNewProfilePattern] = useState('{title}.mp4')
	const [newProfileAllowDownload, setNewProfileAllowDownload] = useState(false)
	const [savingProfile, setSavingProfile] = useState(false)
	const [profileError, setProfileError] = useState<string | null>(null)

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
					allowDownload: newProfileAllowDownload,
				}),
			})
			if (res.ok) {
				const profile = await res.json()
				setProfiles(prev => [...prev, profile])
				setShowNewProfile(false)
				setNewProfileName('')
				setNewProfilePath('')
				setNewProfilePattern('{title}.mp4')
				setNewProfileAllowDownload(false)
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
					allowDownload: profile.allowDownload,
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
							placeholder="{title}.mp4"
							className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
						/>
						<TokenReference />
					</div>
					<label className="flex items-center gap-3 cursor-pointer">
						<div className="relative">
							<input
								type="checkbox"
								checked={newProfileAllowDownload}
								onChange={e => setNewProfileAllowDownload(e.target.checked)}
								className="peer sr-only"
							/>
							<div className="h-5 w-9 rounded-full bg-slate-700 transition-colors peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-900" />
							<div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-slate-400 transition-all peer-checked:translate-x-4 peer-checked:bg-white" />
						</div>
						<div>
							<span className="text-sm text-slate-300">Allow web downloads</span>
							<p className="text-xs text-slate-500">Enable downloading published artifacts from the browser</p>
						</div>
					</label>
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
									<div className="flex items-center gap-2">
										<p className="text-sm font-medium text-white">{p.name}</p>
										{p.allowDownload && (
											<span className="inline-block rounded-full bg-blue-900/50 px-1.5 py-0.5 text-[10px] font-medium text-blue-300">
												Downloads
											</span>
										)}
									</div>
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
	const [allowDownload, setAllowDownload] = useState(profile.allowDownload)

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
					placeholder="{title}.mp4"
					className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
				/>
				<TokenReference />
			</div>
			<label className="flex items-center gap-3 cursor-pointer">
				<div className="relative">
					<input type="checkbox" checked={allowDownload} onChange={e => setAllowDownload(e.target.checked)} className="peer sr-only" />
					<div className="h-5 w-9 rounded-full bg-slate-700 transition-colors peer-checked:bg-blue-600 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-slate-900" />
					<div className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-slate-400 transition-all peer-checked:translate-x-4 peer-checked:bg-white" />
				</div>
				<div>
					<span className="text-sm text-slate-300">Allow web downloads</span>
					<p className="text-xs text-slate-500">Enable downloading published artifacts from the browser</p>
				</div>
			</label>
			<div className="flex gap-2">
				<button
					onClick={() => onSave({ ...profile, name, exportPath, fileNamingPattern: pattern || null, allowDownload })}
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

const FILENAME_TOKENS = [
	{ token: '{title}', description: 'Clip or program title (sanitized)' },
	{ token: '{clipId}', description: 'Clip identifier' },
	{ token: '{programId}', description: 'Program identifier' },
	{ token: '{date}', description: 'Publish date (YYYY-MM-DD)' },
	{ token: '{datetime}', description: 'Publish date and time (YYYY-MM-DD-HH-mm-ss)' },
	{ token: '{seq}', description: 'Sequence number, zero-padded (001, 002, ...)' },
	{ token: '{timestamp}', description: 'Unix timestamp in milliseconds' },
] as const

function TokenReference() {
	const [open, setOpen] = useState(false)

	return (
		<div className="mt-1.5">
			<button type="button" onClick={() => setOpen(!open)} className="text-xs text-blue-400 hover:text-blue-300">
				{open ? 'Hide' : 'Show'} available tokens
			</button>
			{open && (
				<div className="mt-2 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
					<table className="w-full text-xs">
						<thead>
							<tr className="text-left text-slate-400">
								<th className="pb-1.5 pr-4 font-medium">Token</th>
								<th className="pb-1.5 font-medium">Description</th>
							</tr>
						</thead>
						<tbody className="text-slate-300">
							{FILENAME_TOKENS.map(({ token, description }) => (
								<tr key={token}>
									<td className="pr-4 py-0.5">
										<code className="rounded bg-slate-700 px-1.5 py-0.5 text-blue-300">{token}</code>
									</td>
									<td className="py-0.5 text-slate-400">{description}</td>
								</tr>
							))}
						</tbody>
					</table>
					<p className="mt-2 text-xs text-slate-500">
						Example:{' '}
						<code className="rounded bg-slate-700 px-1 text-slate-300">
							{'{title}'}-{'{date}'}.mp4
						</code>{' '}
						→ <code className="rounded bg-slate-700 px-1 text-slate-300">Welcome-2026-03-28.mp4</code>
					</p>
				</div>
			)}
		</div>
	)
}
