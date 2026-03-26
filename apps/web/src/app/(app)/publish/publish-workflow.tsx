'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Profile {
	id: string
	name: string
	exportPath: string
	fileNamingPattern: string | null
}

interface Artifact {
	id: string
	clipId: string | null
	clipTitle: string | null
	programId?: string | null
	programTitle?: string | null
	profileName: string
	outputPath: string
	durationSec: number
	status: string
	publishedAt: string | null
}

interface JobData {
	id: string
	status: string
	error: string | null
	outputPath: string | null
}

interface TunarrChannel {
	id: string
	number: number
	name: string
}

interface ChannelBinding {
	tunarrChannelId: string
	pushMode: string
}

interface PublishWorkflowProps {
	profiles: Profile[]
	artifacts: Artifact[]
	tunarrConfigured?: boolean
	tunarrMediaPath?: string
	channelBindings?: Record<string, ChannelBinding>
}

export function PublishWorkflow({
	profiles: initialProfiles,
	artifacts,
	tunarrConfigured,
	tunarrMediaPath,
	channelBindings = {},
}: PublishWorkflowProps) {
	const router = useRouter()
	const [profiles, setProfiles] = useState(initialProfiles)
	const [showNewProfile, setShowNewProfile] = useState(false)
	const [editingProfileId, setEditingProfileId] = useState<string | null>(null)
	const [newProfileName, setNewProfileName] = useState('')
	const [newProfilePath, setNewProfilePath] = useState('')
	const [newProfilePattern, setNewProfilePattern] = useState('{title}-{pageId}.mp4')
	const [savingProfile, setSavingProfile] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Tunarr push state
	const [pushingArtifactId, setPushingArtifactId] = useState<string | null>(null)
	const [tunarrChannels, setTunarrChannels] = useState<TunarrChannel[]>([])
	const [loadingChannels, setLoadingChannels] = useState(false)
	const [selectedChannelId, setSelectedChannelId] = useState('')
	const [pushMode, setPushMode] = useState<'append' | 'replace'>('append')
	const [pushing, setPushing] = useState(false)
	const [pushResult, setPushResult] = useState<{ ok: boolean; message: string } | null>(null)

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
				setNewProfilePattern('{title}-{pageId}.mp4')
			}
		} catch {
			setError('Failed to create profile')
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
			setError('Failed to update profile')
		} finally {
			setSavingProfile(false)
		}
	}

	const handleDeleteProfile = async (profileId: string) => {
		if (!confirm('Delete this publish profile?')) return
		try {
			const res = await fetch(`/api/publish-profiles/${profileId}`, { method: 'DELETE' })
			if (res.ok) {
				setProfiles(prev => prev.filter(p => p.id !== profileId))
			} else {
				const data = await res.json().catch(() => ({}))
				setError(data.error || 'Failed to delete profile')
			}
		} catch {
			setError('Failed to delete profile')
		}
	}

	const handleOpenPush = async (artifactId: string, clipId?: string | null, programId?: string | null) => {
		if (pushingArtifactId === artifactId) {
			setPushingArtifactId(null)
			return
		}
		setPushingArtifactId(artifactId)
		setPushResult(null)
		setSelectedChannelId('')

		// Check for channel binding to pre-select
		const bindingKey = programId || clipId
		const binding = bindingKey ? channelBindings[bindingKey] : undefined
		if (binding) {
			setPushMode(binding.pushMode as 'append' | 'replace')
		}

		if (tunarrChannels.length === 0) {
			setLoadingChannels(true)
			try {
				const res = await fetch('/api/tunarr/channels')
				if (res.ok) {
					const channels: TunarrChannel[] = await res.json()
					setTunarrChannels(channels)
					const boundId = binding?.tunarrChannelId
					if (boundId && channels.some(c => c.id === boundId)) {
						setSelectedChannelId(boundId)
					} else if (channels.length > 0) {
						setSelectedChannelId(channels[0].id)
					}
				}
			} catch {
				/* will show empty */
			} finally {
				setLoadingChannels(false)
			}
		} else if (tunarrChannels.length > 0) {
			const boundId = binding?.tunarrChannelId
			if (boundId && tunarrChannels.some(c => c.id === boundId)) {
				setSelectedChannelId(boundId)
			} else {
				setSelectedChannelId(tunarrChannels[0].id)
			}
		}
	}

	const handlePush = async () => {
		if (!pushingArtifactId || !selectedChannelId) return
		setPushing(true)
		setPushResult(null)
		try {
			const res = await fetch('/api/tunarr/push', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ artifactId: pushingArtifactId, channelId: selectedChannelId, mode: pushMode }),
			})
			if (res.ok) {
				const data = await res.json()
				const channelName = tunarrChannels.find(c => c.id === selectedChannelId)?.name ?? 'channel'
				setPushResult({ ok: true, message: `Pushed "${data.title}" to ${channelName}` })
			} else {
				const data = await res.json().catch(() => ({}))
				setPushResult({ ok: false, message: data.error || 'Push failed' })
			}
		} catch {
			setPushResult({ ok: false, message: 'Push failed' })
		} finally {
			setPushing(false)
		}
	}

	const isInTunarrPath = (outputPath: string) => {
		if (!tunarrMediaPath) return false
		return outputPath.startsWith(tunarrMediaPath)
	}

	return (
		<div className="space-y-10">
			{error && (
				<div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
					{error}
					<button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-200">
						&times;
					</button>
				</div>
			)}

			{/* Publish Profiles */}
			<section>
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-lg font-semibold text-slate-200">Publish Profiles</h3>
					<button onClick={() => setShowNewProfile(!showNewProfile)} className="text-sm text-blue-400 hover:text-blue-300">
						{showNewProfile ? 'Cancel' : '+ New Profile'}
					</button>
				</div>

				{showNewProfile && (
					<div className="mb-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
						<div>
							<label htmlFor="profile-name" className="block text-sm text-slate-400">
								Name
							</label>
							<input
								id="profile-name"
								type="text"
								value={newProfileName}
								onChange={e => setNewProfileName(e.target.value)}
								placeholder="e.g. Tunarr"
								className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div>
							<label htmlFor="profile-path" className="block text-sm text-slate-400">
								Export Path
							</label>
							<input
								id="profile-path"
								type="text"
								value={newProfilePath}
								onChange={e => setNewProfilePath(e.target.value)}
								placeholder="e.g. /media/tunarr/guest-clips"
								className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div>
							<label htmlFor="profile-pattern" className="block text-sm text-slate-400">
								File Naming Pattern
							</label>
							<input
								id="profile-pattern"
								type="text"
								value={newProfilePattern}
								onChange={e => setNewProfilePattern(e.target.value)}
								placeholder="{title}-{clipId}.mp4"
								className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
							/>
							<p className="mt-1 text-xs text-slate-500">
								Available tokens: {'{title}'}, {'{clipId}'}, {'{programId}'}, {'{timestamp}'}
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
					<div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
						<p className="text-slate-400">No publish profiles configured.</p>
						<button onClick={() => setShowNewProfile(true)} className="mt-3 text-sm text-blue-400 hover:text-blue-300">
							Create your first profile
						</button>
					</div>
				) : (
					<div className="space-y-3">
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
								<div key={p.id} className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4">
									<div className="min-w-0 flex-1">
										<p className="font-medium text-white">{p.name}</p>
										<p className="mt-0.5 text-xs text-slate-400">{p.exportPath}</p>
										{p.fileNamingPattern && <p className="mt-0.5 text-xs text-slate-500">{p.fileNamingPattern}</p>}
									</div>
									<div className="flex shrink-0 gap-2">
										<button
											onClick={() => setEditingProfileId(p.id)}
											className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
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

			{/* Published Artifacts */}
			<section>
				<h3 className="mb-4 text-lg font-semibold text-slate-200">Published Artifacts</h3>
				{artifacts.length === 0 ? (
					<p className="text-slate-400">No artifacts published yet.</p>
				) : (
					<div className="space-y-3">
						{artifacts.map(a => {
							const showTunarrPush = tunarrConfigured && a.status === 'published' && isInTunarrPath(a.outputPath)
							return (
								<div key={a.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
									<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<p className="font-medium text-white">{a.programTitle ?? a.clipTitle ?? 'Untitled'}</p>
												<span
													className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
														a.status === 'published' ? 'bg-green-900 text-green-300' : 'bg-slate-800 text-slate-400'
													}`}
												>
													{a.status}
												</span>
											</div>
											<p className="mt-0.5 text-xs text-slate-400">
												{a.profileName} &middot; {a.durationSec}s &middot; {a.publishedAt ? new Date(a.publishedAt).toLocaleString() : ''}
											</p>
											<p className="truncate text-xs text-slate-500">{a.outputPath}</p>
										</div>
										{showTunarrPush && (
											<button
												onClick={() => handleOpenPush(a.id, a.clipId, a.programId)}
												className={`w-full rounded-lg px-3 py-1.5 text-xs font-medium transition-colors md:w-auto ${
													pushingArtifactId === a.id
														? 'bg-purple-600 text-white'
														: 'border border-purple-700 text-purple-400 hover:bg-purple-950'
												}`}
											>
												Push to Tunarr
											</button>
										)}
									</div>

									{/* Tunarr push panel */}
									{pushingArtifactId === a.id && (
										<div className="mt-3 rounded-lg border border-purple-800 bg-purple-950/30 p-4">
											{loadingChannels ? (
												<p className="text-sm text-slate-400">Loading channels...</p>
											) : tunarrChannels.length === 0 ? (
												<p className="text-sm text-slate-400">No Tunarr channels found. Create one in Tunarr first.</p>
											) : (
												<div className="space-y-3">
													<div>
														<label className="block text-xs text-slate-400">Channel</label>
														<select
															value={selectedChannelId}
															onChange={e => setSelectedChannelId(e.target.value)}
															className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none"
														>
															{tunarrChannels.map(ch => (
																<option key={ch.id} value={ch.id}>
																	{ch.number}. {ch.name}
																</option>
															))}
														</select>
													</div>
													<div className="flex gap-4">
														<label className="flex items-center gap-2 text-sm text-slate-300">
															<input
																type="radio"
																name={`push-mode-${a.id}`}
																checked={pushMode === 'append'}
																onChange={() => setPushMode('append')}
																className="accent-purple-500"
															/>
															Add to channel
														</label>
														<label className="flex items-center gap-2 text-sm text-slate-300">
															<input
																type="radio"
																name={`push-mode-${a.id}`}
																checked={pushMode === 'replace'}
																onChange={() => setPushMode('replace')}
																className="accent-purple-500"
															/>
															Replace channel content
														</label>
													</div>
													<div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
														<button
															onClick={handlePush}
															disabled={pushing || !selectedChannelId}
															className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50 md:w-auto"
														>
															{pushing ? 'Pushing...' : 'Push'}
														</button>
														{pushResult && (
															<span className={`text-sm ${pushResult.ok ? 'text-green-400' : 'text-red-400'}`}>{pushResult.message}</span>
														)}
													</div>
												</div>
											)}
										</div>
									)}
								</div>
							)
						})}
					</div>
				)}
			</section>
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
		<div className="space-y-3 rounded-xl border border-blue-800 bg-slate-900 p-4">
			<div>
				<label className="block text-xs text-slate-400">Name</label>
				<input
					type="text"
					value={name}
					onChange={e => setName(e.target.value)}
					className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
				/>
			</div>
			<div>
				<label className="block text-xs text-slate-400">Export Path</label>
				<input
					type="text"
					value={exportPath}
					onChange={e => setExportPath(e.target.value)}
					className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
				/>
			</div>
			<div>
				<label className="block text-xs text-slate-400">File Naming Pattern</label>
				<input
					type="text"
					value={pattern}
					onChange={e => setPattern(e.target.value)}
					placeholder="{title}-{pageId}.mp4"
					className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
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
