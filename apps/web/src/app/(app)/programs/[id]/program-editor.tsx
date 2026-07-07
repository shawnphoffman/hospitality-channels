'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
	formatDuration,
	type ArtifactData,
	type JobData,
	type ProgramData,
	type TunarrChannel,
	type ProgramClip,
	type AudioTrack,
} from './program-editor-shared'
import { ProgramInfoForm } from './program-info-form'
import { DurationSettings } from './duration-settings'
import { ClipSequenceEditor } from './clip-sequence-editor'
import { AudioTrackManager } from './audio-track-manager'
import { ProgramPublishSection } from './program-publish-section'
import { ProgramArtifactsSection } from './program-artifacts-section'

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
	const [loopTransition, setLoopTransition] = useState(program.loopTransition ?? false)

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
					loopTransition,
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
					loopTransition,
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
				setPushResult({ ok: true, message: `Pushed "${data.title}" to ${chName}${data.warning ? `. Note: ${data.warning}` : ''}` })
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
					<Link
						href="/programs"
						className="w-full rounded-lg border border-slate-700 px-4 py-2 text-center text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-white md:w-auto"
					>
						Cancel
					</Link>
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
					<ProgramInfoForm
						title={title}
						onTitleChange={handleTitleChange}
						slug={slug}
						onSlugChange={setSlug}
						description={description}
						onDescriptionChange={setDescription}
						summary={summary}
						onSummaryChange={setSummary}
						iconUrl={iconUrl}
						onIconUrlChange={setIconUrl}
					/>
					<DurationSettings
						durationMode={durationMode}
						setDurationMode={setDurationMode}
						manualDurationSec={manualDurationSec}
						setManualDurationSec={setManualDurationSec}
						minClipDurationSec={minClipDurationSec}
						setMinClipDurationSec={setMinClipDurationSec}
						transitionType={transitionType}
						setTransitionType={setTransitionType}
						transitionSec={transitionSec}
						setTransitionSec={setTransitionSec}
						loopTransition={loopTransition}
						setLoopTransition={setLoopTransition}
						computedDuration={computedDuration}
						perClipDuration={perClipDuration}
						clipCount={clips.length}
						trackCount={tracks.length}
					/>
				</div>

				{/* Right column */}
				<div className="space-y-6">
					<ClipSequenceEditor
						programId={program.id}
						clips={clips}
						setClips={setClips}
						availableClips={availableClips}
						perClipDuration={perClipDuration}
					/>
					<AudioTrackManager programId={program.id} tracks={tracks} setTracks={setTracks} audioAssets={audioAssets} />
				</div>
			</div>

			{/* Publish section */}
			{profiles.length > 0 && (
				<ProgramPublishSection
					profiles={profiles}
					renderJob={renderJob}
					rendering={rendering}
					renderingProfileId={renderingProfileId}
					saving={saving}
					clipCount={clips.length}
					onSaveAndPublish={handleSaveAndPublish}
				/>
			)}

			{/* Artifacts section */}
			{artifacts.length > 0 && (
				<ProgramArtifactsSection
					artifacts={artifacts}
					tunarrConfigured={tunarrConfigured}
					isInTunarrPath={isInTunarrPath}
					pushingArtifactId={pushingArtifactId}
					onOpenPush={handleOpenPush}
					loadingChannels={loadingChannels}
					tunarrChannels={tunarrChannels}
					selectedChannelId={selectedChannelId}
					onSelectedChannelIdChange={setSelectedChannelId}
					pushMode={pushMode}
					onPushModeChange={setPushMode}
					pushing={pushing}
					onPush={handlePush}
					pushResult={pushResult}
				/>
			)}
		</div>
	)
}
