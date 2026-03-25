'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getTemplateScenes } from '@/templates/registry'
import { WifiQrCode } from '@/templates/wifi-qr-code'
import { TemplateField } from '@/components/template-field'
import { AudioField } from '@/components/audio-field'

interface TemplateFieldDef {
	key: string
	label: string
	type: string
	default: unknown
	required?: boolean
}

interface ClipData {
	id: string
	title: string
	slug: string
	templateId: string
	dataJson: Record<string, string>
	defaultDurationSec: number
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

interface ClipEditorProps {
	clip: ClipData
	templateName: string
	templateSlug: string
	fields: TemplateFieldDef[]
	profiles: { id: string; name: string }[]
	tunarrConfigured?: boolean
}

const SCENE_W = 1920
const SCENE_H = 1080

export function ClipEditor({ clip, templateName, templateSlug, fields, profiles, tunarrConfigured }: ClipEditorProps) {
	const router = useRouter()

	// Form state
	const [title, setTitle] = useState(clip.title)
	const [slug, setSlug] = useState(clip.slug)
	const [durationSec, setDurationSec] = useState(clip.defaultDurationSec)
	const [fieldValues, setFieldValues] = useState<Record<string, string>>(clip.dataJson)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [successMsg, setSuccessMsg] = useState<string | null>(null)

	// Preview state
	const [showSafeArea, setShowSafeArea] = useState(false)
	const [renderMode, setRenderMode] = useState(false)
	const wrapperRef = useRef<HTMLDivElement>(null)
	const [scale, setScale] = useState(0)

	// Render state
	const [renderJob, setRenderJob] = useState<JobData | null>(null)
	const [rendering, setRendering] = useState(false)
	const [selectedProfileId, setSelectedProfileId] = useState(profiles[0]?.id ?? '')

	// Tunarr push state
	const [showPush, setShowPush] = useState(false)
	const [tunarrChannels, setTunarrChannels] = useState<TunarrChannel[]>([])
	const [selectedChannelId, setSelectedChannelId] = useState('')
	const [pushMode, setPushMode] = useState<'append' | 'replace'>('append')
	const [pushing, setPushing] = useState(false)
	const [pushResult, setPushResult] = useState<{ ok: boolean; message: string } | null>(null)

	const handleTitleChange = useCallback((val: string) => {
		setTitle(val)
		setSlug(
			val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
		)
	}, [])

	const handleFieldChange = useCallback((key: string, value: string) => {
		setFieldValues(prev => ({ ...prev, [key]: value }))
	}, [])

	// Preview scaling
	const recalc = useCallback(() => {
		const el = wrapperRef.current
		if (!el) return
		const pad = 48
		const s = Math.min((el.clientWidth - pad) / SCENE_W, (el.clientHeight - pad) / SCENE_H, 1)
		setScale(Math.max(s, 0.1))
	}, [])

	useEffect(() => {
		recalc()
		const ro = new ResizeObserver(recalc)
		if (wrapperRef.current) ro.observe(wrapperRef.current)
		return () => ro.disconnect()
	}, [recalc])

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
			} catch { /* poll will retry */ }
		}, 2000)
		return () => clearInterval(interval)
	}, [renderJob])

	const handleSave = async () => {
		if (!title.trim()) {
			setError('Title is required')
			return
		}
		setSaving(true)
		setError(null)
		setSuccessMsg(null)
		try {
			const res = await fetch(`/api/clips/${clip.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
					dataJson: fieldValues,
					defaultDurationSec: durationSec,
				}),
			})
			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				throw new Error(data.error || `Failed to save (${res.status})`)
			}
			setSuccessMsg('Saved')
			setTimeout(() => setSuccessMsg(null), 2000)
			router.refresh()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Something went wrong')
		} finally {
			setSaving(false)
		}
	}

	const handleSaveAndPublish = async () => {
		if (!title.trim() || !selectedProfileId) return
		setSaving(true)
		setError(null)
		setSuccessMsg(null)
		setRenderJob(null)
		setShowPush(false)
		setPushResult(null)
		try {
			// Save first
			const saveRes = await fetch(`/api/clips/${clip.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
					dataJson: fieldValues,
					defaultDurationSec: durationSec,
				}),
			})
			if (!saveRes.ok) {
				const data = await saveRes.json().catch(() => ({}))
				throw new Error(data.error || 'Failed to save')
			}
			// Then render & publish
			setRendering(true)
			const res = await fetch('/api/render-and-publish', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					clipId: clip.id,
					profileId: selectedProfileId,
					durationSec,
				}),
			})
			if (res.ok) {
				const job: JobData = await res.json()
				setRenderJob(job)
			} else {
				const err = await res.json().catch(() => ({}))
				setRenderJob({
					id: '', type: 'render-publish', status: 'failed',
					outputPath: null, error: err.error || 'Failed to start render & publish',
					createdAt: new Date().toISOString(), completedAt: null,
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
		if (!confirm('Are you sure you want to delete this clip?')) return
		setSaving(true)
		setError(null)
		try {
			const res = await fetch(`/api/clips/${clip.id}`, { method: 'DELETE' })
			if (!res.ok) throw new Error('Failed to delete clip')
			router.push('/clips')
			router.refresh()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Something went wrong')
			setSaving(false)
		}
	}

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
		} catch { /* will show empty */ }
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

	const scaledW = SCENE_W * scale
	const scaledH = SCENE_H * scale
	const isRenderPublish = renderJob?.type === 'render-publish'

	// Build wifi preview data
	const wifiSsidField = fields.find(f => f.key === 'wifiSsid')
	const wifiPasswordField = fields.find(f => f.key === 'wifiPassword')
	const hasWifiFields = Boolean(wifiSsidField && wifiPasswordField)
	const wifiSsid = (fieldValues.wifiSsid ?? '').trim()
	const wifiPassword = (fieldValues.wifiPassword ?? '').trim()
	const showWifiQr = hasWifiFields && wifiSsid.length > 0 && wifiPassword.length > 0

	return (
		<div className="flex min-h-[calc(100vh-4rem)] flex-col lg:h-[calc(100vh-4rem)]">
			{/* Toolbar */}
			<div className="mb-3 flex shrink-0 flex-wrap items-center gap-3">
				<div className="mr-auto">
					<h2 className="text-xl font-bold text-white">{title || 'Untitled'}</h2>
					<p className="text-xs text-slate-400">{templateName} &middot; {slug}</p>
				</div>
				<label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
					<input type="checkbox" checked={showSafeArea} onChange={e => setShowSafeArea(e.target.checked)} className="rounded border-slate-600 bg-slate-800" />
					Safe area
				</label>
				<label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
					<input type="checkbox" checked={renderMode} onChange={e => setRenderMode(e.target.checked)} className="rounded border-slate-600 bg-slate-800" />
					Render mode
				</label>
				{profiles.length > 0 && (
					<select
						value={selectedProfileId}
						onChange={e => setSelectedProfileId(e.target.value)}
						className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
					>
						{profiles.map(p => (
							<option key={p.id} value={p.id}>{p.name}</option>
						))}
					</select>
				)}
				<button
					onClick={handleSave}
					disabled={saving}
					className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
				>
					{saving ? 'Saving...' : 'Save'}
				</button>
				{profiles.length > 0 && (
					<button
						onClick={handleSaveAndPublish}
						disabled={saving || rendering || !selectedProfileId}
						className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
					>
						{rendering ? 'Working...' : 'Save & Publish'}
					</button>
				)}
				<a href="/clips" className="text-sm text-slate-400 hover:text-slate-300">Back</a>
			</div>

			{/* Status messages */}
			{error && <div className="mb-3 shrink-0 rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">{error}</div>}
			{successMsg && <div className="mb-3 shrink-0 rounded-lg border border-green-800 bg-green-950 px-4 py-3 text-sm text-green-300">{successMsg}</div>}

			{/* Job status */}
			{renderJob && (
				<div className={`mb-3 shrink-0 rounded-lg border px-4 py-3 text-sm ${
					renderJob.status === 'completed' ? 'border-green-800 bg-green-950 text-green-300'
					: renderJob.status === 'failed' ? 'border-red-800 bg-red-950 text-red-300'
					: 'border-blue-800 bg-blue-950 text-blue-300'
				}`}>
					{renderJob.status === 'queued' && 'Render & publish job queued...'}
					{renderJob.status === 'processing' && 'Rendering and publishing... This may take a minute.'}
					{renderJob.status === 'completed' && (
						<div className="flex items-center gap-3">
							<span>
								Rendered and published!
								{renderJob.outputPath && <span className="ml-2 text-xs text-green-400">{renderJob.outputPath}</span>}
							</span>
							{tunarrConfigured && !showPush && (
								<button onClick={handleOpenPush} className="rounded border border-purple-700 px-3 py-1 text-xs font-medium text-purple-400 hover:bg-purple-950">
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
				<div className="mb-3 shrink-0 rounded-lg border border-purple-800 bg-purple-950/30 p-4">
					{tunarrChannels.length === 0 ? (
						<p className="text-sm text-slate-400">No Tunarr channels found.</p>
					) : (
						<div className="flex flex-wrap items-center gap-3">
							<select value={selectedChannelId} onChange={e => setSelectedChannelId(e.target.value)} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none">
								{tunarrChannels.map(ch => (
									<option key={ch.id} value={ch.id}>{ch.number}. {ch.name}</option>
								))}
							</select>
							<label className="flex items-center gap-2 text-sm text-slate-300">
								<input type="radio" name="push-mode" checked={pushMode === 'append'} onChange={() => setPushMode('append')} className="accent-purple-500" />
								Add
							</label>
							<label className="flex items-center gap-2 text-sm text-slate-300">
								<input type="radio" name="push-mode" checked={pushMode === 'replace'} onChange={() => setPushMode('replace')} className="accent-purple-500" />
								Replace
							</label>
							<button onClick={handlePush} disabled={pushing} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50">
								{pushing ? 'Pushing...' : 'Push'}
							</button>
							{pushResult && <span className={`text-sm ${pushResult.ok ? 'text-green-400' : 'text-red-400'}`}>{pushResult.message}</span>}
						</div>
					)}
				</div>
			)}

			{/* Main content: stacked on mobile, side-by-side on desktop */}
			<div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto lg:flex-row lg:overflow-y-hidden">
				{/* Left panel: Edit form */}
				<div className="w-full shrink-0 space-y-4 lg:w-[26rem] lg:overflow-y-auto">
					{/* Clip Info */}
					<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
						<h3 className="mb-3 text-sm font-semibold text-slate-300">Clip Info</h3>
						<div className="space-y-3">
							<div>
								<label htmlFor="title" className="block text-xs text-slate-400">Title</label>
								<input id="title" type="text" value={title} onChange={e => handleTitleChange(e.target.value)}
									className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none" />
							</div>
							<div>
								<label htmlFor="slug" className="block text-xs text-slate-400">Slug</label>
								<input id="slug" type="text" value={slug} onChange={e => setSlug(e.target.value)}
									className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none" />
							</div>

							{/* Background Audio */}
							<AudioField
								id="clip-backgroundAudio"
								label="Background Audio"
								value={fieldValues.backgroundAudioUrl ?? ''}
								onChange={val => handleFieldChange('backgroundAudioUrl', val)}
							/>

							{/* Duration mode */}
							<div>
								<label className="block text-xs text-slate-400 mb-1">Duration</label>
								<div className="flex gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5">
									<button
										type="button"
										onClick={() => handleFieldChange('matchAudioDuration', 'true')}
										className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
											fieldValues.matchAudioDuration === 'true'
												? 'bg-blue-600 text-white'
												: 'text-slate-400 hover:text-slate-300'
										}`}
									>
										Match audio length
									</button>
									<button
										type="button"
										onClick={() => handleFieldChange('matchAudioDuration', 'false')}
										className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
											fieldValues.matchAudioDuration !== 'true'
												? 'bg-blue-600 text-white'
												: 'text-slate-400 hover:text-slate-300'
										}`}
									>
										Fixed duration
									</button>
								</div>
								{fieldValues.matchAudioDuration !== 'true' && (
									<input id="duration" type="number" min={1} max={3600} value={durationSec} onChange={e => setDurationSec(parseInt(e.target.value, 10) || 30)}
										placeholder="Duration (seconds)"
										className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none" />
								)}
								{fieldValues.matchAudioDuration === 'true' && !fieldValues.backgroundAudioUrl && (
									<p className="mt-1 text-xs text-amber-400">Add audio above to use this mode</p>
								)}
							</div>
						</div>
					</section>

					{/* Template (read-only) */}
					<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
						<h3 className="mb-2 text-sm font-semibold text-slate-300">Template</h3>
						<span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-white">{templateName}</span>
					</section>

					{/* Template Fields */}
					{fields.length > 0 && (
						<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
							<h3 className="mb-3 text-sm font-semibold text-slate-300">Content</h3>
							<div className="space-y-3">
								{fields.map(field => {
									if (field.type === 'asset') return null
									if (field.key === 'backgroundAudioUrl') return null
									if (field.key === 'matchAudioDuration') return null
									if (field.key === 'wifiPassword') return null
									if (field.key === 'wifiSsid' && hasWifiFields && wifiSsidField && wifiPasswordField) {
										return (
											<div key="wifi-block" className="space-y-3">
												<TemplateField field={wifiSsidField} value={fieldValues.wifiSsid ?? ''} onChange={val => handleFieldChange('wifiSsid', val)} idPrefix="field-" />
												<TemplateField field={wifiPasswordField} value={fieldValues.wifiPassword ?? ''} onChange={val => handleFieldChange('wifiPassword', val)} idPrefix="field-" />
												{showWifiQr && (
													<div className="flex justify-center">
														<WifiQrCode ssid={wifiSsid} password={wifiPassword} size={100} />
													</div>
												)}
											</div>
										)
									}
									return (
										<TemplateField key={field.key} field={field} value={fieldValues[field.key] ?? ''} onChange={val => handleFieldChange(field.key, val)} idPrefix="field-" />
									)
								})}
							</div>
						</section>
					)}

					{/* Delete */}
					<button onClick={handleDelete} disabled={saving}
						className="w-full rounded-lg border border-red-800 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-950 hover:text-red-300 disabled:opacity-50">
						Delete Clip
					</button>
				</div>

				{/* Right panel: Live preview */}
				<div ref={wrapperRef} className="flex aspect-video min-h-[240px] items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-black lg:aspect-auto lg:min-h-0 lg:flex-1">
					{scale > 0 && (
						<div style={{ width: scaledW, height: scaledH }} className="relative shrink-0 overflow-hidden rounded shadow-2xl shadow-black/60">
							<div style={{ width: SCENE_W, height: SCENE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }} className="absolute left-0 top-0">
								<div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: '#0f172a' }}>
									{(() => {
										const entry = getTemplateScenes(templateSlug)
										if (!entry) {
											return (
												<div className="flex h-full items-center justify-center text-slate-500">
													<p style={{ fontSize: 32 }}>Unknown template: {templateSlug}</p>
												</div>
											)
										}
										const Scene = entry.scene
										return <Scene data={fieldValues} renderMode={renderMode} />
									})()}
								</div>
								{showSafeArea && (
									<div className="pointer-events-none absolute" style={{ inset: '5%', border: '2px dashed rgba(255, 255, 255, 0.25)' }} />
								)}
								{renderMode && (
									<div className="pointer-events-none absolute right-6 top-6 rounded bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white opacity-80">
										Render Mode
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
