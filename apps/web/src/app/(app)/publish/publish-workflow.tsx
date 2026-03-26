'use client'

import { useState } from 'react'

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
	artifacts: Artifact[]
	tunarrConfigured?: boolean
	tunarrMediaPath?: string
	channelBindings?: Record<string, ChannelBinding>
}

export function PublishWorkflow({ artifacts, tunarrConfigured, tunarrMediaPath, channelBindings = {} }: PublishWorkflowProps) {
	// Tunarr push state
	const [pushingArtifactId, setPushingArtifactId] = useState<string | null>(null)
	const [tunarrChannels, setTunarrChannels] = useState<TunarrChannel[]>([])
	const [loadingChannels, setLoadingChannels] = useState(false)
	const [selectedChannelId, setSelectedChannelId] = useState('')
	const [pushMode, setPushMode] = useState<'append' | 'replace'>('append')
	const [pushing, setPushing] = useState(false)
	const [pushResult, setPushResult] = useState<{ ok: boolean; message: string } | null>(null)

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
		<div>
			{artifacts.length === 0 ? (
				<p className="text-slate-400">No artifacts published yet. Publish a program to see it here.</p>
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
		</div>
	)
}
