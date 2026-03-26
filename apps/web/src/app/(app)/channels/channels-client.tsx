'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ChannelDef {
	id: string
	tunarrChannelId: string | null
	channelNumber: number
	channelName: string
	clipId: string | null
	programId: string | null
	pushMode: string | null
	enabled: boolean | null
	description: string | null
	clipTitle: string | null
	programTitle: string | null
	latestArtifact: {
		id: string
		outputPath: string
		durationSec: number
		publishedAt: string | null
	} | null
}

interface ClipInfo {
	id: string
	title: string
}

interface ProgramInfoItem {
	id: string
	title: string
}

interface TunarrChannel {
	id: string
	number: number
	name: string
}

interface ProgramInfo {
	title: string
	duration: number
}

interface ChannelsClientProps {
	initialChannels: ChannelDef[]
	clips: ClipInfo[]
	programs: ProgramInfoItem[]
	tunarrConfigured: boolean
}

function formatDuration(ms: number): string {
	const totalSec = Math.round(ms / 1000)
	const m = Math.floor(totalSec / 60)
	const s = totalSec % 60
	return `${m}:${s.toString().padStart(2, '0')}`
}

export function ChannelsClient({ initialChannels, clips, programs, tunarrConfigured }: ChannelsClientProps) {
	const router = useRouter()
	const [channels, setChannels] = useState(initialChannels)

	// Add channel state
	const [showAdd, setShowAdd] = useState(false)
	const [tunarrChannels, setTunarrChannels] = useState<TunarrChannel[]>([])
	const [loadingTunarr, setLoadingTunarr] = useState(false)
	const [selectedTunarrId, setSelectedTunarrId] = useState('')
	const [bindType, setBindType] = useState<'program' | 'clip'>('program')
	const [bindProgramId, setBindProgramId] = useState('')
	const [bindClipId, setBindClipId] = useState('')
	const [addPushMode, setAddPushMode] = useState<'replace' | 'append'>('replace')
	const [adding, setAdding] = useState(false)

	// Edit state
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editBindType, setEditBindType] = useState<'program' | 'clip'>('program')
	const [editProgramId, setEditProgramId] = useState('')
	const [editClipId, setEditClipId] = useState('')
	const [editPushMode, setEditPushMode] = useState<'replace' | 'append'>('replace')

	// Programming state
	const [expandedId, setExpandedId] = useState<string | null>(null)
	const [programming, setProgramming] = useState<Record<string, ProgramInfo[]>>({})
	const [loadingProgramming, setLoadingProgramming] = useState<string | null>(null)

	// Push state
	const [pushingId, setPushingId] = useState<string | null>(null)
	const [pushResult, setPushResult] = useState<{ id: string; ok: boolean; message: string } | null>(null)

	const fetchTunarrChannels = async () => {
		setLoadingTunarr(true)
		try {
			const res = await fetch('/api/tunarr/channels', { cache: 'no-store' })
			if (res.ok) {
				const all: TunarrChannel[] = await res.json()
				const managedIds = new Set(channels.map(c => c.tunarrChannelId))
				const available = all.filter(c => !managedIds.has(c.id))
				setTunarrChannels(available)
				if (available.length > 0) setSelectedTunarrId(available[0].id)
			}
		} catch {
			/* empty */
		} finally {
			setLoadingTunarr(false)
		}
	}

	const handleOpenAdd = async () => {
		if (showAdd) {
			setShowAdd(false)
			return
		}
		setShowAdd(true)
		await fetchTunarrChannels()
	}

	const handleAdd = async () => {
		const ch = tunarrChannels.find(c => c.id === selectedTunarrId)
		if (!ch) return
		setAdding(true)
		try {
			const res = await fetch('/api/channels', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					tunarrChannelId: ch.id,
					channelNumber: ch.number,
					channelName: ch.name,
					programId: bindType === 'program' && bindProgramId ? bindProgramId : null,
					clipId: bindType === 'clip' && bindClipId ? bindClipId : null,
					pushMode: addPushMode,
				}),
			})
			if (res.ok) {
				setShowAdd(false)
				setSelectedTunarrId('')
				setBindProgramId('')
				setBindClipId('')
				setAddPushMode('replace')
				router.refresh()
				// Optimistic: refetch
				const listRes = await fetch('/api/channels')
				if (listRes.ok) setChannels(await listRes.json())
			}
		} catch {
			/* empty */
		} finally {
			setAdding(false)
		}
	}

	const handleRemove = async (id: string) => {
		await fetch(`/api/channels/${id}`, { method: 'DELETE' })
		setChannels(prev => prev.filter(c => c.id !== id))
	}

	const handleStartEdit = (ch: ChannelDef) => {
		setEditingId(ch.id)
		if (ch.programId) {
			setEditBindType('program')
			setEditProgramId(ch.programId)
			setEditClipId('')
		} else {
			setEditBindType(ch.clipId ? 'clip' : 'program')
			setEditClipId(ch.clipId ?? '')
			setEditProgramId('')
		}
		setEditPushMode((ch.pushMode as 'replace' | 'append') ?? 'replace')
	}

	const handleSaveEdit = async (id: string) => {
		await fetch(`/api/channels/${id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				programId: editBindType === 'program' && editProgramId ? editProgramId : null,
				clipId: editBindType === 'clip' && editClipId ? editClipId : null,
				pushMode: editPushMode,
			}),
		})
		setEditingId(null)
		router.refresh()
		const listRes = await fetch('/api/channels')
		if (listRes.ok) setChannels(await listRes.json())
	}

	const handleToggleEnabled = async (ch: ChannelDef) => {
		await fetch(`/api/channels/${ch.id}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ enabled: !ch.enabled }),
		})
		setChannels(prev => prev.map(c => (c.id === ch.id ? { ...c, enabled: !c.enabled } : c)))
	}

	const fetchProgramming = async (ch: ChannelDef) => {
		if (!ch.tunarrChannelId) return
		setLoadingProgramming(ch.id)
		try {
			const res = await fetch(`/api/tunarr/channels/${ch.tunarrChannelId}/programming`)
			if (res.ok) {
				const data = await res.json()
				// Handle multiple possible Tunarr response shapes
				let programList: Array<{ title?: string; duration?: number; originalProgram?: { title?: string; duration?: number } }>
				if (Array.isArray(data)) {
					programList = data
				} else if (Array.isArray(data.programs)) {
					programList = data.programs
				} else if (data.lineup && Array.isArray(data.lineup)) {
					programList = data.lineup
				} else if (data.programs && typeof data.programs === 'object') {
					programList = Object.values(data.programs)
				} else {
					programList = []
				}
				const progs: ProgramInfo[] = programList.map(p => ({
					title: p.title ?? p.originalProgram?.title ?? 'Untitled',
					duration: p.duration ?? p.originalProgram?.duration ?? 0,
				}))
				setProgramming(prev => ({ ...prev, [ch.id]: progs }))
			} else {
				setProgramming(prev => ({ ...prev, [ch.id]: [] }))
			}
		} catch {
			setProgramming(prev => ({ ...prev, [ch.id]: [] }))
		} finally {
			setLoadingProgramming(null)
		}
	}

	const handleToggleProgramming = async (ch: ChannelDef) => {
		if (expandedId === ch.id) {
			setExpandedId(null)
			return
		}
		setExpandedId(ch.id)
		if (!programming[ch.id]) {
			await fetchProgramming(ch)
		}
	}

	const handleRefreshProgramming = async (ch: ChannelDef) => {
		setProgramming(prev => {
			const next = { ...prev }
			delete next[ch.id]
			return next
		})
		await fetchProgramming(ch)
	}

	const handlePush = async (ch: ChannelDef) => {
		if (!ch.latestArtifact || !ch.tunarrChannelId) return
		setPushingId(ch.id)
		setPushResult(null)
		try {
			const res = await fetch('/api/tunarr/push', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					artifactId: ch.latestArtifact.id,
					channelId: ch.tunarrChannelId,
					mode: ch.pushMode ?? 'replace',
				}),
			})
			if (res.ok) {
				const data = await res.json()
				setPushResult({ id: ch.id, ok: true, message: `Pushed "${data.title}" to ${ch.channelName}` })
				// Refresh programming if expanded
				if (expandedId === ch.id) {
					setProgramming(prev => ({ ...prev }))
					// Remove cached so next expand refetches
					setProgramming(prev => {
						const next = { ...prev }
						delete next[ch.id]
						return next
					})
					setExpandedId(null)
				}
			} else {
				const data = await res.json().catch(() => ({}))
				setPushResult({ id: ch.id, ok: false, message: data.error || 'Push failed' })
			}
		} catch {
			setPushResult({ id: ch.id, ok: false, message: 'Push failed' })
		} finally {
			setPushingId(null)
		}
	}

	if (!tunarrConfigured) {
		return (
			<div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
				<p className="text-slate-400">Tunarr is not configured.</p>
				<a href="/settings" className="mt-3 inline-block text-sm text-blue-400 hover:text-blue-300">
					Go to Settings
				</a>
			</div>
		)
	}

	return (
		<div className="space-y-8">
			{/* Managed Channels */}
			<section>
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-lg font-semibold text-slate-200">Managed Channels</h3>
					<button onClick={handleOpenAdd} className="text-sm text-blue-400 hover:text-blue-300">
						{showAdd ? 'Cancel' : '+ Add Channel'}
					</button>
				</div>

				{showAdd && (
					<div className="mb-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
						{loadingTunarr ? (
							<p className="text-sm text-slate-400">Loading Tunarr channels...</p>
						) : tunarrChannels.length === 0 ? (
							<div className="flex items-center justify-between">
								<p className="text-sm text-slate-400">No unmanaged Tunarr channels available.</p>
								<button onClick={fetchTunarrChannels} className="text-xs text-blue-400 hover:text-blue-300">
									Refresh
								</button>
							</div>
						) : (
							<>
								<div>
									<div className="flex items-center justify-between">
										<label className="block text-sm text-slate-400">Tunarr Channel</label>
										<button onClick={fetchTunarrChannels} className="text-xs text-blue-400 hover:text-blue-300">
											Refresh
										</button>
									</div>
									<select
										value={selectedTunarrId}
										onChange={e => setSelectedTunarrId(e.target.value)}
										className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
									>
										{tunarrChannels.map(c => (
											<option key={c.id} value={c.id}>
												{c.number}. {c.name}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-sm text-slate-400">Bind to (optional)</label>
									<div className="mt-1 flex gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5 mb-2">
										<button
											type="button"
											onClick={() => {
												setBindType('program')
												setBindClipId('')
											}}
											className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${bindType === 'program' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
										>
											Program
										</button>
										<button
											type="button"
											onClick={() => {
												setBindType('clip')
												setBindProgramId('')
											}}
											className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${bindType === 'clip' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
										>
											Clip (legacy)
										</button>
									</div>
									{bindType === 'program' ? (
										<select
											value={bindProgramId}
											onChange={e => setBindProgramId(e.target.value)}
											className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
										>
											<option value="">None</option>
											{programs.map(p => (
												<option key={p.id} value={p.id}>
													{p.title}
												</option>
											))}
										</select>
									) : (
										<select
											value={bindClipId}
											onChange={e => setBindClipId(e.target.value)}
											className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
										>
											<option value="">None</option>
											{clips.map(c => (
												<option key={c.id} value={c.id}>
													{c.title}
												</option>
											))}
										</select>
									)}
								</div>
								<div>
									<label className="block text-sm text-slate-400">Default Push Mode</label>
									<div className="mt-1 flex gap-4">
										<label className="flex items-center gap-2 text-sm text-slate-300">
											<input
												type="radio"
												checked={addPushMode === 'replace'}
												onChange={() => setAddPushMode('replace')}
												className="accent-blue-500"
											/>
											Replace
										</label>
										<label className="flex items-center gap-2 text-sm text-slate-300">
											<input
												type="radio"
												checked={addPushMode === 'append'}
												onChange={() => setAddPushMode('append')}
												className="accent-blue-500"
											/>
											Append
										</label>
									</div>
								</div>
								<button
									onClick={handleAdd}
									disabled={adding || !selectedTunarrId}
									className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
								>
									{adding ? 'Adding...' : 'Add Channel'}
								</button>
							</>
						)}
					</div>
				)}

				{channels.length === 0 && !showAdd ? (
					<div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
						<p className="text-slate-400">No channels managed yet.</p>
						<button onClick={handleOpenAdd} className="mt-3 text-sm text-blue-400 hover:text-blue-300">
							Add your first channel
						</button>
					</div>
				) : (
					<div className="space-y-3">
						{channels.map(ch => (
							<div key={ch.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
								{/* Channel info */}
								<div className="flex flex-wrap items-center gap-2">
									<span className="text-sm font-mono text-slate-500">{ch.channelNumber}.</span>
									<p className="font-medium text-white">{ch.channelName}</p>
									<span
										className={`rounded-full px-2 py-0.5 text-xs font-medium ${
											ch.pushMode === 'append' ? 'bg-blue-900 text-blue-300' : 'bg-amber-900 text-amber-300'
										}`}
									>
										{ch.pushMode}
									</span>
									{!ch.enabled && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-500">disabled</span>}
								</div>
								<p className="mt-1 text-xs text-slate-400">
									{ch.programTitle ? (
										`Bound to program: ${ch.programTitle}`
									) : ch.clipTitle ? (
										<>
											<span className="text-amber-400">(legacy)</span> Bound to clip: {ch.clipTitle}
										</>
									) : (
										'Unbound'
									)}
									{ch.latestArtifact && (
										<span className="ml-2 text-slate-500">
											&middot; Last published{' '}
											{ch.latestArtifact.publishedAt ? new Date(ch.latestArtifact.publishedAt).toLocaleDateString() : 'unknown'}
										</span>
									)}
								</p>

								{/* Actions */}
								<div className="mt-3 flex flex-wrap gap-2">
									{ch.latestArtifact && ch.tunarrChannelId && (
										<button
											onClick={() => handlePush(ch)}
											disabled={pushingId === ch.id}
											className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
										>
											{pushingId === ch.id ? 'Pushing...' : 'Push Now'}
										</button>
									)}
									<button
										onClick={() => handleToggleProgramming(ch)}
										className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
											expandedId === ch.id ? 'bg-slate-700 text-white' : 'border border-slate-700 text-slate-400 hover:bg-slate-800'
										}`}
									>
										Programming
									</button>
									<button
										onClick={() => (editingId === ch.id ? setEditingId(null) : handleStartEdit(ch))}
										className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800"
									>
										{editingId === ch.id ? 'Cancel' : 'Edit'}
									</button>
									<button
										onClick={() => handleToggleEnabled(ch)}
										className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
											ch.enabled
												? 'border-slate-700 text-slate-400 hover:bg-slate-800'
												: 'border-green-800 text-green-400 hover:bg-green-950'
										}`}
									>
										{ch.enabled ? 'Disable' : 'Enable'}
									</button>
									<button
										onClick={() => handleRemove(ch.id)}
										className="rounded-lg border border-red-900 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-950"
									>
										Remove
									</button>
								</div>

								{pushResult && pushResult.id === ch.id && (
									<p className={`mt-2 text-sm ${pushResult.ok ? 'text-green-400' : 'text-red-400'}`}>{pushResult.message}</p>
								)}

								{/* Edit panel */}
								{editingId === ch.id && (
									<div className="mt-3 space-y-3 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
										<div>
											<label className="block text-xs text-slate-400">Bind to</label>
											<div className="mt-1 flex gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5 mb-2">
												<button
													type="button"
													onClick={() => {
														setEditBindType('program')
														setEditClipId('')
													}}
													className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${editBindType === 'program' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
												>
													Program
												</button>
												<button
													type="button"
													onClick={() => {
														setEditBindType('clip')
														setEditProgramId('')
													}}
													className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${editBindType === 'clip' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
												>
													Clip (legacy)
												</button>
											</div>
											{editBindType === 'program' ? (
												<select
													value={editProgramId}
													onChange={e => setEditProgramId(e.target.value)}
													className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
												>
													<option value="">None</option>
													{programs.map(p => (
														<option key={p.id} value={p.id}>
															{p.title}
														</option>
													))}
												</select>
											) : (
												<select
													value={editClipId}
													onChange={e => setEditClipId(e.target.value)}
													className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
												>
													<option value="">None</option>
													{clips.map(c => (
														<option key={c.id} value={c.id}>
															{c.title}
														</option>
													))}
												</select>
											)}
										</div>
										<div>
											<label className="block text-xs text-slate-400">Push Mode</label>
											<div className="mt-1 flex gap-4">
												<label className="flex items-center gap-2 text-sm text-slate-300">
													<input
														type="radio"
														checked={editPushMode === 'replace'}
														onChange={() => setEditPushMode('replace')}
														className="accent-blue-500"
													/>
													Replace
												</label>
												<label className="flex items-center gap-2 text-sm text-slate-300">
													<input
														type="radio"
														checked={editPushMode === 'append'}
														onChange={() => setEditPushMode('append')}
														className="accent-blue-500"
													/>
													Append
												</label>
											</div>
										</div>
										<button
											onClick={() => handleSaveEdit(ch.id)}
											className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
										>
											Save
										</button>
									</div>
								)}

								{/* Programming panel */}
								{expandedId === ch.id && (
									<div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
										<div className="mb-2 flex items-center justify-between">
											<span className="text-xs font-medium text-slate-400">Channel Programming</span>
											<button
												onClick={() => handleRefreshProgramming(ch)}
												disabled={loadingProgramming === ch.id}
												className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
											>
												{loadingProgramming === ch.id ? 'Loading...' : 'Refresh'}
											</button>
										</div>
										{loadingProgramming === ch.id ? (
											<p className="text-sm text-slate-400">Loading programming...</p>
										) : programming[ch.id] && programming[ch.id].length > 0 ? (
											<>
												<p className="mb-2 text-xs text-slate-500">
													{programming[ch.id].length} program{programming[ch.id].length !== 1 ? 's' : ''} &middot; Total{' '}
													{formatDuration(programming[ch.id].reduce((sum, p) => sum + p.duration, 0))}
												</p>
												<div className="space-y-1">
													{programming[ch.id].map((p, i) => (
														<div key={i} className="flex items-center justify-between text-sm">
															<span className="text-slate-300">{p.title}</span>
															<span className="text-xs text-slate-500">{formatDuration(p.duration)}</span>
														</div>
													))}
												</div>
											</>
										) : (
											<p className="text-sm text-slate-400">No programming found for this channel.</p>
										)}
									</div>
								)}
							</div>
						))}
					</div>
				)}
			</section>
		</div>
	)
}
