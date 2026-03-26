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

interface ProgramEditorProps {
	program: ProgramData
	clips: ProgramClip[]
	audioTracks: AudioTrack[]
	availableClips: { id: string; title: string }[]
	audioAssets: { id: string; filename: string }[]
	imageAssets: { id: string; originalPath: string }[]
	profiles: { id: string; name: string }[]
	tunarrConfigured?: boolean
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
	const [durationMode, setDurationMode] = useState(program.durationMode)
	const [manualDurationSec, setManualDurationSec] = useState(program.manualDurationSec ?? 60)

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

	// Tunarr push state
	const [showPush, setShowPush] = useState(false)
	const [tunarrChannels, setTunarrChannels] = useState<TunarrChannel[]>([])
	const [selectedChannelId, setSelectedChannelId] = useState('')
	const [pushMode, setPushMode] = useState<'append' | 'replace'>('append')
	const [pushing, setPushing] = useState(false)
	const [pushResult, setPushResult] = useState<{ ok: boolean; message: string } | null>(null)

	// Computed duration
	const audioDuration = tracks.reduce((sum, t) => sum + (t.durationSec ?? 0), 0)
	const computedDuration = durationMode === 'manual' ? manualDurationSec : audioDuration
	const perClipDuration = clips.length > 0 ? computedDuration / clips.length : 0

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
					}
				}
			} catch {
				/* poll retry */
			}
		}, 2000)
		return () => clearInterval(interval)
	}, [renderJob])

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
		setShowPush(false)
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
				// Refetch clips
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
		// Update positions
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
			// Resolve the URL for the asset
			body.audioUrl = `/api/assets/serve?path=${encodeURIComponent(audioAssets.find(a => a.id === addAudioAssetId)?.filename ?? '')}`
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

	// Probe assets for missing metadata (duration/dimensions)
	const [probing, setProbing] = useState(false)
	const handleProbeAssets = async () => {
		setProbing(true)
		try {
			const res = await fetch('/api/assets/probe', { method: 'POST' })
			if (res.ok) {
				// Reload tracks from server to get updated durations
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
								asset?: { originalPath?: string }
							}) => ({
								id: t.id,
								position: t.position,
								assetId: t.assetId,
								audioUrl: t.audioUrl,
								durationSec: t.durationSec,
								filename: t.asset?.originalPath?.split('/').pop() ?? t.audioUrl ?? 'audio',
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

	// Tunarr push
	const handleOpenPush = async () => {
		setShowPush(true)
		setPushResult(null)
		try {
			const res = await fetch('/api/tunarr/channels')
			if (res.ok) {
				const channels: TunarrChannel[] = await res.json()
				setTunarrChannels(channels)
				if (channels.length > 0) setSelectedChannelId(channels[0].id)
			}
		} catch {
			/* empty */
		}
	}

	const handlePush = async () => {
		if (!selectedChannelId || !renderJob?.outputPath) return
		setPushing(true)
		setPushResult(null)
		try {
			const res = await fetch('/api/tunarr/push', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					artifactOutputPath: renderJob.outputPath,
					channelId: selectedChannelId,
					mode: pushMode,
				}),
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
				<div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3">
					<button
						onClick={handleSave}
						disabled={saving}
						className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50 md:w-auto"
					>
						{saving ? 'Saving...' : 'Save'}
					</button>
					{profiles.map(p => (
						<button
							key={p.id}
							onClick={() => handleSaveAndPublish(p.id)}
							disabled={saving || rendering || clips.length === 0}
							className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 md:w-auto"
						>
							{rendering && renderingProfileId === p.id ? 'Working...' : `Save & Publish to ${p.name}`}
						</button>
					))}
					<a href="/programs" className="text-center text-sm text-slate-400 hover:text-slate-300 md:text-left">
						Back
					</a>
				</div>
			</div>

			{/* Status messages */}
			{error && <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">{error}</div>}
			{successMsg && <div className="rounded-lg border border-green-800 bg-green-950 px-4 py-3 text-sm text-green-300">{successMsg}</div>}

			{/* Job status */}
			{renderJob && (
				<div
					className={`rounded-lg border px-4 py-3 text-sm ${
						renderJob.status === 'completed'
							? 'border-green-800 bg-green-950 text-green-300'
							: renderJob.status === 'failed'
								? 'border-red-800 bg-red-950 text-red-300'
								: 'border-blue-800 bg-blue-950 text-blue-300'
					}`}
				>
					{renderJob.status === 'queued' && 'Render & publish job queued...'}
					{renderJob.status === 'processing' && 'Rendering and publishing... This may take a few minutes for multi-clip programs.'}
					{renderJob.status === 'completed' && (
						<div className="flex items-center gap-3">
							<span>
								Rendered and published!
								{renderJob.outputPath && <span className="ml-2 text-xs text-green-400">{renderJob.outputPath}</span>}
							</span>
							{tunarrConfigured && !showPush && (
								<button
									onClick={handleOpenPush}
									className="rounded border border-purple-700 px-3 py-1 text-xs font-medium text-purple-400 hover:bg-purple-950"
								>
									Push to Tunarr
								</button>
							)}
						</div>
					)}
					{renderJob.status === 'failed' && <>Failed{renderJob.error ? `: ${renderJob.error}` : ''}</>}
				</div>
			)}

			{/* Tunarr push panel */}
			{showPush && (
				<div className="rounded-lg border border-purple-800 bg-purple-950/30 p-4">
					{tunarrChannels.length === 0 ? (
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
										name="push-mode"
										checked={pushMode === 'append'}
										onChange={() => setPushMode('append')}
										className="accent-purple-500"
									/>
									Add
								</label>
								<label className="flex items-center gap-2 text-sm text-slate-300">
									<input
										type="radio"
										name="push-mode"
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
							{pushResult && <span className={`text-sm ${pushResult.ok ? 'text-green-400' : 'text-red-400'}`}>{pushResult.message}</span>}
						</div>
					)}
				</div>
			)}

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
					</section>

					{/* Delete */}
					<button
						onClick={handleDelete}
						disabled={saving}
						className="w-full rounded-lg border border-red-800 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-950 hover:text-red-300 disabled:opacity-50"
					>
						Delete Program
					</button>
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
										{/* Preview thumbnail */}
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

						{/* Add clip */}
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
														{probing ? 'Detecting duration…' : 'Duration unknown — click to detect'}
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

						{/* Add audio */}
						<div className="mt-3 space-y-2">
							{audioAssets.length > 0 && (
								<div className="flex gap-2">
									<select
										value={addAudioAssetId}
										onChange={e => {
											setAddAudioAssetId(e.target.value)
											if (e.target.value) setAddAudioUrl('')
										}}
										className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
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
		</div>
	)
}
