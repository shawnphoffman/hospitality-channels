'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { ChannelDef, ClipInfo, ProgramInfo, ProgramInfoItem, TunarrChannel } from './channels-shared'
import { AddChannelForm } from './add-channel-form'
import { ChannelCard } from './channel-card'

interface ChannelsClientProps {
	initialChannels: ChannelDef[]
	clips: ClipInfo[]
	programs: ProgramInfoItem[]
	tunarrConfigured: boolean
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
				// Handle Tunarr CondensedProgramming response:
				// { programs: Record<id, Program> | Program[], lineup: LineupItem[] }
				// Programs dict has the real titles/durations; lineup has references + durations
				let programsById: Record<string, { title?: string; duration?: number }> = {}
				let programList: Array<{
					title?: string
					duration?: number
					id?: string
					programId?: string
					originalProgram?: { title?: string; duration?: number }
				}>

				if (Array.isArray(data)) {
					programList = data
				} else {
					// Build lookup from programs (Record or Array)
					if (data.programs) {
						if (Array.isArray(data.programs)) {
							for (const p of data.programs) {
								if (p.id) programsById[p.id] = p
								if (p.uniqueId) programsById[p.uniqueId] = p
							}
						} else if (typeof data.programs === 'object') {
							programsById = data.programs
						}
					}

					// Use lineup if available (it represents actual channel order), otherwise fall back to programs
					if (data.lineup && Array.isArray(data.lineup) && data.lineup.length > 0) {
						programList = data.lineup
					} else if (Array.isArray(data.programs)) {
						programList = data.programs
					} else if (data.programs && typeof data.programs === 'object') {
						programList = Object.values(data.programs)
					} else {
						programList = []
					}
				}

				const progs: ProgramInfo[] = programList.map(p => {
					// Resolve title from programs lookup if lineup item lacks it
					const refId = p.id || p.programId
					const resolved = refId ? programsById[refId] : undefined
					return {
						title: p.title || resolved?.title || p.originalProgram?.title || 'Unknown',
						duration: p.duration ?? resolved?.duration ?? p.originalProgram?.duration ?? 0,
					}
				})
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
				setPushResult({
					id: ch.id,
					ok: true,
					message: `Pushed "${data.title}" to ${ch.channelName}${data.warning ? `. Note: ${data.warning}` : ''}`,
				})
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
				<p className="text-slate-400">
					Tunarr integration is required to manage channels. Configure your Tunarr URL and media library in Settings to get started.
				</p>
				<Link href="/settings" className="mt-3 inline-block text-sm text-blue-400 hover:text-blue-300">
					Go to Settings
				</Link>
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
					<AddChannelForm
						loadingTunarr={loadingTunarr}
						tunarrChannels={tunarrChannels}
						selectedTunarrId={selectedTunarrId}
						setSelectedTunarrId={setSelectedTunarrId}
						bindType={bindType}
						setBindType={setBindType}
						bindProgramId={bindProgramId}
						setBindProgramId={setBindProgramId}
						bindClipId={bindClipId}
						setBindClipId={setBindClipId}
						addPushMode={addPushMode}
						setAddPushMode={setAddPushMode}
						adding={adding}
						clips={clips}
						programs={programs}
						onRefresh={fetchTunarrChannels}
						onAdd={handleAdd}
					/>
				)}

				{channels.length === 0 && !showAdd ? (
					<div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
						<p className="text-slate-400">
							No channel bindings yet. Add a channel to link a Tunarr channel to a program. Once bound, you can push the latest published
							artifact with a single click.
						</p>
						<button onClick={handleOpenAdd} className="mt-3 text-sm text-blue-400 hover:text-blue-300">
							Add your first channel
						</button>
					</div>
				) : (
					<div className="space-y-3">
						{channels.map(ch => (
							<ChannelCard
								key={ch.id}
								ch={ch}
								clips={clips}
								programs={programs}
								editing={editingId === ch.id}
								editBindType={editBindType}
								setEditBindType={setEditBindType}
								editProgramId={editProgramId}
								setEditProgramId={setEditProgramId}
								editClipId={editClipId}
								setEditClipId={setEditClipId}
								editPushMode={editPushMode}
								setEditPushMode={setEditPushMode}
								onStartEdit={() => handleStartEdit(ch)}
								onCancelEdit={() => setEditingId(null)}
								onSaveEdit={() => handleSaveEdit(ch.id)}
								expanded={expandedId === ch.id}
								programming={programming[ch.id]}
								loadingProgramming={loadingProgramming === ch.id}
								onToggleProgramming={() => handleToggleProgramming(ch)}
								onRefreshProgramming={() => handleRefreshProgramming(ch)}
								pushing={pushingId === ch.id}
								pushResult={pushResult && pushResult.id === ch.id ? { ok: pushResult.ok, message: pushResult.message } : null}
								onPush={() => handlePush(ch)}
								onToggleEnabled={() => handleToggleEnabled(ch)}
								onRemove={() => handleRemove(ch.id)}
							/>
						))}
					</div>
				)}
			</section>
		</div>
	)
}
