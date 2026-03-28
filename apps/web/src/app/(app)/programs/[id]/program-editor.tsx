'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ImageField } from '@/components/image-field'

interface ProgramData {
	id: string
	title: string
	slug: string
	description: string
	summary: string
	iconAssetId: string | null
	durationMode: 'auto' | 'manual'
	manualDurationSec: number | null
	minClipDurationSec: number | null
	transitionType: string
	transitionSec: number
}

interface ProgramClip {
	programClipId: string
	clipId: string
	position: number
	title: string
	templateName: string
}

interface AudioTrack {
	id: string
	position: number
	assetId: string | null
	audioUrl: string | null
	durationSec: number | null
	filename: string
	coverArtPath?: string | null
}

interface JobData {
	id: string
	type: string
	status: string
	outputPath: string | null
	error: string | null
	createdAt: string
	completedAt: string | null
}

interface TunarrChannel {
	id: string
	number: number
	name: string
}

interface ArtifactData {
	id: string
	outputPath: string
	durationSec: number
	status: string
	publishedAt: string | null
	profileName: string
	superseded?: boolean
}

interface ProgramEditorProps {
	program: ProgramData
	clips: ProgramClip[]
	audioTracks: AudioTrack[]
	availableClips: { id: string; title: string }[]
	audioAssets: { id: string; filename: string; originalPath: string }[]
	imageAssets: { id: string; name: string | null; originalPath: string }[]
	profiles: { id: string; name: string; exportPath: string; fileNamingPattern: string | null }[]
	tunarrConfigured?: boolean
	tunarrMediaPath?: string
	artifacts?: ArtifactData[]
	boundTunarrChannelId?: string
	boundPushMode?: 'append' | 'replace'
}

function formatDuration(sec: number): string {
	if (sec <= 0) return '0:00'
	const m = Math.floor(sec / 60)
	const s = Math.round(sec % 60)
	return `${m}:${s.toString().padStart(2, '0')}`
}

export function ProgramEditor({
	program,
	clips: initialClips,
	audioTracks: initialTracks,
	availableClips,
	audioAssets,
	imageAssets,
	profiles,
	tunarrConfigured,
	tunarrMediaPath = '',
	artifacts: initialArtifacts = [],
	boundTunarrChannelId,
	boundPushMode,
}: ProgramEditorProps) {
	const router = useRouter()

	// Form state
	const [title, setTitle] = useState(program.title)
	const [slug, setSlug] = useState(program.slug)
	const [description, setDescription] = useState(program.description)
	const [summary, setSummary] = useState(program.summary)
	const [iconUrl, setIconUrl] = useState(() => {
		if (!program.iconAssetId) return ''
		const asset = imageAssets.find(a => a.id === program.iconAssetId)
		return asset ? `/api/assets/serve?path=${encodeURIComponent(asset.originalPath)}` : ''
	})
	// Default duration mode: use saved value, but for new programs default to manual if no audio tracks
	const [durationMode, setDurationMode] = useState<'auto' | 'manual'>(() => {
		if (program.durationMode === 'auto' && initialTracks.length === 0) return 'manual'
		return program.durationMode
	})
	const [manualDurationSec, setManualDurationSec] = useState(program.manualDurationSec ?? 60)
	const [minClipDurationSec, setMinClipDurationSec] = useState(program.minClipDurationSec ?? null)
	const [transitionType, setTransitionType] = useState(program.transitionType ?? 'none')
	const [transitionSec, setTransitionSec] = useState(program.transitionSec ?? 0.5)

	// Resolve iconUrl → asset ID for saving
	const resolveIconAssetId = (url: string): string | null => {
		if (!url) return null
		const match = url.match(/[?&]path=([^&]+)/)
		if (!match) return null
		const path = decodeURIComponent(match[1])
		const asset = imageAssets.find(a => a.originalPath === path || a.originalPath.endsWith(`/${path}`))
		return asset?.id ?? null
	}

	const [clips, setClips] = useState(initialClips)
	const [tracks, setTracks] = useState(initialTracks)
	const [artifacts, setArtifacts] = useState(initialArtifacts)

	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [successMsg, setSuccessMsg] = useState<string | null>(null)

	// Add clip state
	const [addClipId, setAddClipId] = useState('')

	// Add audio state
	const [addAudioAssetId, setAddAudioAssetId] = useState('')
	const [addAudioUrl, setAddAudioUrl] = useState('')

	// Render state
	const [renderJob, setRenderJob] = useState<JobData | null>(null)
	const [rendering, setRendering] = useState(false)
	const [renderingProfileId, setRenderingProfileId] = useState<string | null>(null)

	// Tunarr push state (for artifacts)
	const [pushingArtifactId, setPushingArtifactId] = useState<string | null>(null)
	const [tunarrChannels, setTunarrChannels] = useState<TunarrChannel[]>([])
	const [loadingChannels, setLoadingChannels] = useState(false)
	const [selectedChannelId, setSelectedChannelId] = useState('')
	const [pushMode, setPushMode] = useState<'append' | 'replace'>(boundPushMode ?? 'append')
	const [pushing, setPushing] = useState(false)
	const [pushResult, setPushResult] = useState<{ ok: boolean; message: string } | null>(null)

	// Auto-switch to auto duration when tracks are added
	useEffect(() => {
		if (tracks.length > 0 && durationMode === 'manual' && program.durationMode !== 'manual') {
			setDurationMode('auto')
		}
	}, [tracks.length]) // eslint-disable-line react-hooks/exhaustive-deps

	// Computed duration
	const audioDuration = tracks.reduce((sum, t) => sum + (t.durationSec ?? 0), 0)
	const baseDuration = durationMode === 'manual' ? manualDurationSec : audioDuration
	const perClipDuration =
		clips.length > 0 ? (minClipDurationSec ? Math.max(baseDuration / clips.length, minClipDurationSec) : baseDuration / clips.length) : 0
	const computedDuration =
		clips.length > 0 && minClipDurationSec && baseDuration / clips.length < minClipDurationSec
			? minClipDurationSec * clips.length
			: baseDuration

	// Job polling
	useEffect(() => {
		if (!renderJob || renderJob.status === 'completed' || renderJob.status === 'failed') return
		const interval = setInterval(async () => {
			try {
				const res = await fetch(`/api/jobs/${renderJob.id}`)
				if (res.ok) {
					const updated: JobData = await res.json()
					setRenderJob(updated)
					if (updated.status === 'completed' || updated.status === 'failed') {
						setRendering(false)
						if (updated.status === 'completed') {
							// Refresh server-side data
							router.refresh()
							// Fetch fresh artifacts list
							fetch(`/api/programs/${program.id}/artifacts`)
								.then(r => (r.ok ? r.json() : null))
								.then(data => {
									if (data) setArtifacts(data)
								})
								.catch(() => {})
							// Trigger Tunarr library scan if configured and artifact is in media path
							if (tunarrConfigured && updated.outputPath && isInTunarrPath(updated.outputPath)) {
								fetch('/api/tunarr/scan', { method: 'POST' }).catch(() => {})
							}
						}
					}
				}
			} catch {
				/* poll retry */
			}
		}, 2000)
		return () => clearInterval(interval)
	}, [renderJob]) // eslint-disable-line react-hooks/exhaustive-deps

	const handleTitleChange = (val: string) => {
		setTitle(val)
		setSlug(
			val
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/(^-|-$)/g, '')
		)
	}

	const handleSave = async () => {
		if (!title.trim()) {
			setError('Title is required')
			return
		}
		setSaving(true)
		setError(null)
		setSuccessMsg(null)
		try {
			const res = await fetch(`/api/programs/${program.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
					description: description || null,
					summary: summary || null,
					iconAssetId: resolveIconAssetId(iconUrl),
					durationMode,
					manualDurationSec: durationMode === 'manual' ? manualDurationSec : null,
					minClipDurationSec: minClipDurationSec ?? null,
					transitionType,
					transitionSec,
				}),
			})
			if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to save')
			setSuccessMsg('Saved')
			setTimeout(() => setSuccessMsg(null), 2000)
			router.refresh()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Something went wrong')
		} finally {
			setSaving(false)
		}
	}

	const handleSaveAndPublish = async (profileId: string) => {
		if (!title.trim() || !profileId) return
		setSaving(true)
		setError(null)
		setSuccessMsg(null)
		setRenderJob(null)
		setPushingArtifactId(null)
		setPushResult(null)
		setRenderingProfileId(profileId)
		try {
			// Save first
			await fetch(`/api/programs/${program.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
					description: description || null,
					summary: summary || null,
					iconAssetId: resolveIconAssetId(iconUrl),
					durationMode,
					manualDurationSec: durationMode === 'manual' ? manualDurationSec : null,
					minClipDurationSec: minClipDurationSec ?? null,
					transitionType,
					transitionSec,
				}),
			})
			// Then render & publish
			setRendering(true)
			const res = await fetch('/api/render-and-publish', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					programId: program.id,
					profileId,
					durationSec: computedDuration,
				}),
			})
			if (res.ok) {
				setRenderJob(await res.json())
			} else {
				const err = await res.json().catch(() => ({}))
				setRenderJob({
					id: '',
					type: 'render-program-publish',
					status: 'failed',
					outputPath: null,
					error: err.error || 'Failed to start render & publish',
					createdAt: new Date().toISOString(),
					completedAt: null,
				})
				setRendering(false)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Something went wrong')
			setRendering(false)
		} finally {
			setSaving(false)
		}
	}

	const handleDelete = async () => {
		if (!confirm('Delete this program and all its clip/audio associations?')) return
		setSaving(true)
		try {
			await fetch(`/api/programs/${program.id}`, { method: 'DELETE' })
			router.push('/programs')
			router.refresh()
		} catch {
			setError('Failed to delete')
			setSaving(false)
		}
	}

	// Clip management
	const handleAddClip = async () => {
		if (!addClipId) return
		try {
			const res = await fetch(`/api/programs/${program.id}/clips`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clipId: addClipId }),
			})
			if (res.ok) {
				setAddClipId('')
				router.refresh()
				const listRes = await fetch(`/api/programs/${program.id}`)
				if (listRes.ok) {
					const data = await listRes.json()
					setClips(
						data.clips?.map((c: { id: string; clipId: string; position: number; clip: { title: string; templateId: string } | null }) => ({
							programClipId: c.id,
							clipId: c.clipId,
							position: c.position,
							title: c.clip?.title ?? 'Unknown',
							templateName: '',
						})) ?? []
					)
				}
			}
		} catch {
			/* empty */
		}
	}

	const handleRemoveClip = async (clipId: string) => {
		await fetch(`/api/programs/${program.id}/clips/${clipId}`, { method: 'DELETE' })
		setClips(prev => prev.filter(c => c.clipId !== clipId))
	}

	const handleMoveClip = async (index: number, direction: -1 | 1) => {
		const newIndex = index + direction
		if (newIndex < 0 || newIndex >= clips.length) return
		const updated = [...clips]
		const temp = updated[index]
		updated[index] = updated[newIndex]
		updated[newIndex] = temp
		const reordered = updated.map((c, i) => ({ ...c, position: i }))
		setClips(reordered)
		await fetch(`/api/programs/${program.id}/clips`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(reordered.map(c => ({ clipId: c.clipId, position: c.position }))),
		})
	}

	// Audio track management
	const handleAddAudioTrack = async () => {
		if (!addAudioAssetId && !addAudioUrl) return
		const body: Record<string, unknown> = {}
		if (addAudioAssetId) {
			body.assetId = addAudioAssetId
			body.audioUrl = `/api/assets/serve?path=${encodeURIComponent(audioAssets.find(a => a.id === addAudioAssetId)?.originalPath ?? '')}`
		} else {
			body.audioUrl = addAudioUrl
		}
		try {
			const res = await fetch(`/api/programs/${program.id}/audio-tracks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})
			if (res.ok) {
				const track = await res.json()
				setTracks(prev => [
					...prev,
					{
						id: track.id,
						position: track.position,
						assetId: track.assetId,
						audioUrl: track.audioUrl,
						durationSec: track.durationSec,
						filename: addAudioAssetId ? (audioAssets.find(a => a.id === addAudioAssetId)?.filename ?? 'audio') : addAudioUrl,
					},
				])
				setAddAudioAssetId('')
				setAddAudioUrl('')
			}
		} catch {
			/* empty */
		}
	}

	const handleRemoveTrack = async (trackId: string) => {
		await fetch(`/api/programs/${program.id}/audio-tracks/${trackId}`, { method: 'DELETE' })
		setTracks(prev => prev.filter(t => t.id !== trackId))
	}

	const handleMoveTrack = async (index: number, direction: -1 | 1) => {
		const newIndex = index + direction
		if (newIndex < 0 || newIndex >= tracks.length) return
		const updated = [...tracks]
		const temp = updated[index]
		updated[index] = updated[newIndex]
		updated[newIndex] = temp
		const reordered = updated.map((t, i) => ({ ...t, position: i }))
		setTracks(reordered)
		await fetch(`/api/programs/${program.id}/audio-tracks`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(reordered.map(t => ({ trackId: t.id, position: t.position }))),
		})
	}

	// Probe assets for missing metadata
	const [probing, setProbing] = useState(false)
	const handleProbeAssets = async () => {
		setProbing(true)
		try {
			const res = await fetch('/api/assets/probe', { method: 'POST' })
			if (res.ok) {
				const tracksRes = await fetch(`/api/programs/${program.id}/audio-tracks`)
				if (tracksRes.ok) {
					const enrichedTracks = await tracksRes.json()
					setTracks(
						enrichedTracks.map(
							(t: {
								id: string
								position: number
								assetId: string | null
								audioUrl: string | null
								durationSec: number | null
								asset?: { name?: string; originalPath?: string; derivedPath?: string | null }
							}) => ({
								id: t.id,
								position: t.position,
								assetId: t.assetId,
								audioUrl: t.audioUrl,
								durationSec: t.durationSec,
								filename: t.asset?.name ?? t.asset?.originalPath?.split('/').pop() ?? t.audioUrl ?? 'audio',
								coverArtPath: t.asset?.derivedPath ?? null,
							})
						)
					)
				}
			}
		} catch {
			/* empty */
		} finally {
			setProbing(false)
		}
	}

	// Tunarr push for artifacts
	const handleOpenPush = async (artifactId: string) => {
		if (pushingArtifactId === artifactId) {
			setPushingArtifactId(null)
			return
		}
		setPushingArtifactId(artifactId)
		setPushResult(null)
		setSelectedChannelId('')

		if (tunarrChannels.length === 0) {
			setLoadingChannels(true)
			try {
				const res = await fetch('/api/tunarr/channels')
				if (res.ok) {
					const channels: TunarrChannel[] = await res.json()
					setTunarrChannels(channels)
					const defaultId =
						boundTunarrChannelId && channels.some(c => c.id === boundTunarrChannelId) ? boundTunarrChannelId : (channels[0]?.id ?? '')
					setSelectedChannelId(defaultId)
				}
			} catch {
				/* empty */
			} finally {
				setLoadingChannels(false)
			}
		} else {
			const defaultId =
				boundTunarrChannelId && tunarrChannels.some(c => c.id === boundTunarrChannelId)
					? boundTunarrChannelId
					: (tunarrChannels[0]?.id ?? '')
			setSelectedChannelId(defaultId)
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
				const chName = tunarrChannels.find(c => c.id === selectedChannelId)?.name ?? 'channel'
				setPushResult({ ok: true, message: `Pushed "${data.title}" to ${chName}` })
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
		<div className="space-y-6">
			{/* Toolbar */}
			<div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
				<div className="md:mr-auto">
					<h2 className="text-xl font-bold text-white">{title || 'Untitled Program'}</h2>
					<p className="text-xs text-slate-400">
						{slug} &middot; {formatDuration(computedDuration)} total &middot; {clips.length} clip{clips.length !== 1 ? 's' : ''}
					</p>
				</div>
				<div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
					<button
						onClick={handleSave}
						disabled={saving}
						className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 md:w-auto"
					>
						{saving ? 'Saving...' : 'Save'}
					</button>
					<a
						href="/programs"
						className="w-full rounded-lg border border-slate-700 px-4 py-2 text-center text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white md:w-auto"
					>
						Cancel
					</a>
					<button
						onClick={handleDelete}
						disabled={saving}
						className="w-full rounded-lg border border-red-800 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-950 hover:text-red-300 disabled:opacity-50 md:w-auto"
					>
						Delete
					</button>
				</div>
			</div>

			{/* Status messages */}
			{error && <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">{error}</div>}
			{successMsg && <div className="rounded-lg border border-green-800 bg-green-950 px-4 py-3 text-sm text-green-300">{successMsg}</div>}

			<div className="grid gap-6 lg:grid-cols-2">
				{/* Left column */}
				<div className="space-y-6">
					{/* Program Info */}
					<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
						<h3 className="mb-3 text-sm font-semibold text-slate-300">Program Info</h3>
						<div className="space-y-3">
							<div>
								<label htmlFor="title" className="block text-xs text-slate-400">
									Title
								</label>
								<input
									id="title"
									type="text"
									value={title}
									onChange={e => handleTitleChange(e.target.value)}
									className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div>
								<label htmlFor="slug" className="block text-xs text-slate-400">
									Slug
								</label>
								<input
									id="slug"
									type="text"
									value={slug}
									onChange={e => setSlug(e.target.value)}
									className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div>
								<label htmlFor="description" className="block text-xs text-slate-400">
									Description
								</label>
								<textarea
									id="description"
									value={description}
									onChange={e => setDescription(e.target.value)}
									rows={2}
									className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div>
								<label htmlFor="summary" className="block text-xs text-slate-400">
									Summary
								</label>
								<textarea
									id="summary"
									value={summary}
									onChange={e => setSummary(e.target.value)}
									rows={2}
									className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<ImageField id="icon" label="Icon / Artwork" value={iconUrl} onChange={setIconUrl} placeholder="Select program artwork..." />
						</div>
					</section>

					{/* Duration */}
					<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
						<h3 className="mb-3 text-sm font-semibold text-slate-300">Duration</h3>
						<div className="flex gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
							<button
								type="button"
								onClick={() => setDurationMode('auto')}
								className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
									durationMode === 'auto' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-300'
								}`}
							>
								Match audio length
							</button>
							<button
								type="button"
								onClick={() => setDurationMode('manual')}
								className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
									durationMode === 'manual' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-300'
								}`}
							>
								Manual
							</button>
						</div>
						{durationMode === 'manual' && (
							<input
								type="number"
								min={1}
								value={manualDurationSec}
								onChange={e => setManualDurationSec(parseInt(e.target.value, 10) || 60)}
								className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
								placeholder="Duration in seconds"
							/>
						)}
						<div className="mt-2 text-xs text-slate-500">
							Total: {formatDuration(computedDuration)}
							{clips.length > 0 && <> &middot; {formatDuration(perClipDuration)} per clip</>}
						</div>
						{durationMode === 'auto' && tracks.length === 0 && (
							<p className="mt-1 text-xs text-amber-400">Add audio tracks below to compute duration</p>
						)}
						<div className="mt-3">
							<label htmlFor="minClipDuration" className="block text-xs text-slate-400">
								Minimum clip duration (seconds)
							</label>
							<input
								id="minClipDuration"
								type="number"
								min={1}
								value={minClipDurationSec ?? ''}
								onChange={e => {
									const v = e.target.value
									setMinClipDurationSec(v === '' ? null : parseInt(v, 10) || null)
								}}
								className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
								placeholder="Optional"
							/>
							<p className="mt-1 text-xs text-slate-500">
								If set, each clip will be shown for at least this many seconds, extending total duration if needed.
							</p>
						</div>

						{/* Clip Transitions */}
						<div className="mt-3">
							<label htmlFor="transitionType" className="block text-xs text-slate-400">
								Clip transition
							</label>
							<select
								id="transitionType"
								value={transitionType}
								onChange={e => setTransitionType(e.target.value)}
								className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
							>
								<option value="none">None (hard cut)</option>
								<option value="fade">Fade</option>
								<option value="wipeup">Wipe Up</option>
								<option value="wipedown">Wipe Down</option>
								<option value="wipeleft">Wipe Left</option>
								<option value="wiperight">Wipe Right</option>
								<option value="slideup">Slide Up</option>
								<option value="slidedown">Slide Down</option>
								<option value="slideleft">Slide Left</option>
								<option value="slideright">Slide Right</option>
							</select>
							{transitionType !== 'none' && (
								<div className="mt-2">
									<label htmlFor="transitionSec" className="block text-xs text-slate-400">
										Transition duration (seconds)
									</label>
									<input
										id="transitionSec"
										type="number"
										min={0.25}
										max={2}
										step={0.25}
										value={transitionSec}
										onChange={e => setTransitionSec(parseFloat(e.target.value) || 0.5)}
										className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
									/>
								</div>
							)}
						</div>
					</section>
				</div>

				{/* Right column */}
				<div className="space-y-6">
					{/* Clips */}
					<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
						<h3 className="mb-3 text-sm font-semibold text-slate-300">Clips ({clips.length})</h3>

						{clips.length === 0 ? (
							<p className="text-sm text-slate-500">No clips added yet.</p>
						) : (
							<div className="space-y-2">
								{clips.map((clip, i) => (
									<div key={clip.programClipId} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2">
										<div className="h-12 w-20 shrink-0 overflow-hidden rounded bg-slate-900">
											<iframe
												src={`/clips/${clip.clipId}/render`}
												className="pointer-events-none"
												style={{ width: 1920, height: 1080, transform: 'scale(0.0417)', transformOrigin: 'top left' }}
												tabIndex={-1}
											/>
										</div>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium text-white">{clip.title}</p>
											<p className="text-xs text-slate-500">
												{clip.templateName}
												{perClipDuration > 0 ? (
													<> &middot; {formatDuration(perClipDuration)}</>
												) : (
													<span className="ml-1 text-amber-400"> &middot; duration not set</span>
												)}
											</p>
										</div>
										<div className="flex shrink-0 items-center gap-1">
											<button
												onClick={() => handleMoveClip(i, -1)}
												disabled={i === 0}
												className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30"
												title="Move up"
											>
												<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
													<polyline points="18 15 12 9 6 15" />
												</svg>
											</button>
											<button
												onClick={() => handleMoveClip(i, 1)}
												disabled={i === clips.length - 1}
												className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30"
												title="Move down"
											>
												<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
													<polyline points="6 9 12 15 18 9" />
												</svg>
											</button>
											<button
												onClick={() => handleRemoveClip(clip.clipId)}
												className="rounded p-1 text-red-400 hover:bg-red-950 hover:text-red-300"
												title="Remove"
											>
												<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
													<line x1="18" y1="6" x2="6" y2="18" />
													<line x1="6" y1="6" x2="18" y2="18" />
												</svg>
											</button>
										</div>
									</div>
								))}
							</div>
						)}

						<div className="mt-3 flex gap-2">
							<select
								value={addClipId}
								onChange={e => setAddClipId(e.target.value)}
								className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
							>
								<option value="">Add a clip...</option>
								{availableClips.map(c => (
									<option key={c.id} value={c.id}>
										{c.title}
									</option>
								))}
							</select>
							<button
								onClick={handleAddClip}
								disabled={!addClipId}
								className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
							>
								Add
							</button>
						</div>
					</section>

					{/* Audio Tracks */}
					<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
						<h3 className="mb-3 text-sm font-semibold text-slate-300">Audio Tracks ({tracks.length})</h3>

						{tracks.length === 0 ? (
							<p className="text-sm text-slate-500">No audio tracks added yet.</p>
						) : (
							<div className="space-y-2">
								{tracks.map((track, i) => (
									<div key={track.id} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2">
										{track.coverArtPath ? (
											/* eslint-disable-next-line @next/next/no-img-element */
											<img
												src={`/api/assets/serve?path=${encodeURIComponent(track.coverArtPath)}`}
												alt=""
												className="h-8 w-8 shrink-0 rounded object-cover"
											/>
										) : (
											<svg
												className="h-5 w-5 shrink-0 text-slate-500"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
												strokeWidth={1.5}
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
												/>
											</svg>
										)}
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm text-white">{track.filename}</p>
											<p className="text-xs">
												{track.durationSec ? (
													<span className="text-slate-500">{formatDuration(track.durationSec)}</span>
												) : (
													<button
														type="button"
														onClick={handleProbeAssets}
														disabled={probing}
														className="text-amber-400 underline decoration-amber-400/40 hover:text-amber-300 disabled:opacity-50"
													>
														{probing ? 'Detecting duration...' : 'Duration unknown — click to detect'}
													</button>
												)}
											</p>
										</div>
										<div className="flex shrink-0 items-center gap-1">
											<button
												onClick={() => handleMoveTrack(i, -1)}
												disabled={i === 0}
												className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30"
												title="Move up"
											>
												<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
													<polyline points="18 15 12 9 6 15" />
												</svg>
											</button>
											<button
												onClick={() => handleMoveTrack(i, 1)}
												disabled={i === tracks.length - 1}
												className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30"
												title="Move down"
											>
												<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
													<polyline points="6 9 12 15 18 9" />
												</svg>
											</button>
											<button
												onClick={() => handleRemoveTrack(track.id)}
												className="rounded p-1 text-red-400 hover:bg-red-950 hover:text-red-300"
												title="Remove"
											>
												<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
													<line x1="18" y1="6" x2="6" y2="18" />
													<line x1="6" y1="6" x2="18" y2="18" />
												</svg>
											</button>
										</div>
									</div>
								))}
							</div>
						)}

						<div className="mt-3 space-y-2">
							{audioAssets.length > 0 && (
								<div className="flex gap-2">
									<select
										value={addAudioAssetId}
										onChange={e => {
											setAddAudioAssetId(e.target.value)
											if (e.target.value) setAddAudioUrl('')
										}}
										className="min-w-0 flex-1 truncate rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
									>
										<option value="">Select audio asset...</option>
										{audioAssets.map(a => (
											<option key={a.id} value={a.id}>
												{a.filename}
											</option>
										))}
									</select>
									<button
										onClick={handleAddAudioTrack}
										disabled={!addAudioAssetId}
										className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
									>
										Add
									</button>
								</div>
							)}
							<div className="flex gap-2">
								<input
									type="text"
									value={addAudioUrl}
									onChange={e => {
										setAddAudioUrl(e.target.value)
										if (e.target.value) setAddAudioAssetId('')
									}}
									placeholder="Or paste audio URL..."
									className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
								/>
								<button
									onClick={handleAddAudioTrack}
									disabled={!addAudioUrl}
									className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
								>
									Add
								</button>
							</div>
						</div>
					</section>
				</div>
			</div>

			{/* Publish section */}
			{profiles.length > 0 && (
				<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
					<h3 className="mb-3 text-sm font-semibold text-slate-300">Publish</h3>

					{/* Job status */}
					{renderJob && (
						<div
							className={`mb-3 rounded-lg border px-4 py-3 text-sm ${
								renderJob.status === 'completed'
									? 'border-green-800 bg-green-950 text-green-300'
									: renderJob.status === 'failed'
										? 'border-red-800 bg-red-950 text-red-300'
										: 'border-blue-800 bg-blue-950 text-blue-300'
							}`}
						>
							{renderJob.status === 'queued' && 'Render & publish job queued...'}
							{renderJob.status === 'processing' && 'Rendering and publishing... This may take a few minutes.'}
							{renderJob.status === 'completed' && (
								<span>
									Rendered and published!
									{renderJob.outputPath && <span className="ml-2 text-xs text-green-400">{renderJob.outputPath}</span>}
								</span>
							)}
							{renderJob.status === 'failed' && <>Failed{renderJob.error ? `: ${renderJob.error}` : ''}</>}
						</div>
					)}

					<div className="space-y-2">
						{profiles.map(p => (
							<div
								key={p.id}
								className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-800 p-3 md:flex-row md:items-center"
							>
								<div className="min-w-0 flex-1">
									<p className="text-sm font-medium text-white">{p.name}</p>
									<p className="mt-0.5 text-xs text-slate-400">
										{p.exportPath}
										{p.fileNamingPattern && <span className="text-slate-500"> &middot; {p.fileNamingPattern}</span>}
									</p>
								</div>
								<button
									onClick={() => handleSaveAndPublish(p.id)}
									disabled={saving || rendering || clips.length === 0}
									className="w-full shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 md:w-auto"
								>
									{rendering && renderingProfileId === p.id ? 'Working...' : 'Save & Publish'}
								</button>
							</div>
						))}
					</div>
				</section>
			)}

			{/* Artifacts section */}
			{artifacts.length > 0 && (
				<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
					<h3 className="mb-3 text-sm font-semibold text-slate-300">Published Artifacts</h3>
					<div className="space-y-2">
						{artifacts.map(a => {
							const showTunarrPush = tunarrConfigured && a.status === 'published' && isInTunarrPath(a.outputPath) && !a.superseded
							return (
								<div
									key={a.id}
									className={`rounded-lg border p-3 ${a.superseded ? 'border-slate-800 bg-slate-800/50 opacity-60' : 'border-slate-700 bg-slate-800'}`}
								>
									<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												{a.superseded ? (
													<span className="inline-block rounded-full bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-500">
														superseded
													</span>
												) : (
													<span
														className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
															a.status === 'published' ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-400'
														}`}
													>
														{a.status}
													</span>
												)}
												<span className="text-xs text-slate-400">
													{a.profileName} &middot; {a.durationSec}s
													{a.publishedAt && <> &middot; {new Date(a.publishedAt).toLocaleString()}</>}
												</span>
											</div>
											<p className="mt-0.5 truncate text-xs text-slate-500">{a.outputPath}</p>
										</div>
										{showTunarrPush && (
											<button
												onClick={() => handleOpenPush(a.id)}
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
										<div className="mt-3 rounded-lg border border-purple-800 bg-purple-950/30 p-3">
											{loadingChannels ? (
												<p className="text-sm text-slate-400">Loading channels...</p>
											) : tunarrChannels.length === 0 ? (
												<p className="text-sm text-slate-400">No Tunarr channels found.</p>
											) : (
												<div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
													<select
														value={selectedChannelId}
														onChange={e => setSelectedChannelId(e.target.value)}
														className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none md:w-auto"
													>
														{tunarrChannels.map(ch => (
															<option key={ch.id} value={ch.id}>
																{ch.number}. {ch.name}
															</option>
														))}
													</select>
													<div className="flex gap-4">
														<label className="flex items-center gap-2 text-sm text-slate-300">
															<input
																type="radio"
																name={`push-mode-${a.id}`}
																checked={pushMode === 'append'}
																onChange={() => setPushMode('append')}
																className="accent-purple-500"
															/>
															Add
														</label>
														<label className="flex items-center gap-2 text-sm text-slate-300">
															<input
																type="radio"
																name={`push-mode-${a.id}`}
																checked={pushMode === 'replace'}
																onChange={() => setPushMode('replace')}
																className="accent-purple-500"
															/>
															Replace
														</label>
													</div>
													<button
														onClick={handlePush}
														disabled={pushing}
														className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50 md:w-auto"
													>
														{pushing ? 'Pushing...' : 'Push'}
													</button>
													{pushResult && (
														<span className={`text-sm ${pushResult.ok ? 'text-green-400' : 'text-red-400'}`}>{pushResult.message}</span>
													)}
												</div>
											)}
										</div>
									)}
								</div>
							)
						})}
					</div>
				</section>
			)}
		</div>
	)
}
