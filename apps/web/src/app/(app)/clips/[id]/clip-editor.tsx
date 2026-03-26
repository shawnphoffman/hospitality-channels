'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getTemplateScenes } from '@/templates/registry'
import { WifiQrCode } from '@/templates/wifi-qr-code'
import { TemplateField } from '@/components/template-field'

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

interface ProgramRef {
	id: string
	title: string
}

interface ClipEditorProps {
	clip: ClipData
	templateName: string
	templateSlug: string
	fields: TemplateFieldDef[]
	programs?: ProgramRef[]
}

const SCENE_W = 1920
const SCENE_H = 1080

export function ClipEditor({ clip, templateName, templateSlug, fields, programs }: ClipEditorProps) {
	const router = useRouter()

	// Form state
	const [title, setTitle] = useState(clip.title)
	const [slug, setSlug] = useState(clip.slug)
	const [fieldValues, setFieldValues] = useState<Record<string, string>>(clip.dataJson)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [successMsg, setSuccessMsg] = useState<string | null>(null)

	// Preview state
	const wrapperRef = useRef<HTMLDivElement>(null)
	const [scale, setScale] = useState(0)

	const handleTitleChange = useCallback((val: string) => {
		setTitle(val)
		setSlug(
			val
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/(^-|-$)/g, '')
		)
	}, [])

	const handleFieldChange = useCallback((key: string, value: string) => {
		setFieldValues(prev => ({ ...prev, [key]: value }))
	}, [])

	// Preview scaling — fill container width
	const recalc = useCallback(() => {
		const el = wrapperRef.current
		if (!el) return
		const s = el.clientWidth / SCENE_W
		setScale(Math.max(s, 0.05))
	}, [])

	useEffect(() => {
		recalc()
		const ro = new ResizeObserver(recalc)
		if (wrapperRef.current) ro.observe(wrapperRef.current)
		return () => ro.disconnect()
	}, [recalc])

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

	const scaledW = Math.round(SCENE_W * scale)
	const scaledH = Math.round(SCENE_H * scale)

	// Build wifi preview data
	const wifiSsidField = fields.find(f => f.key === 'wifiSsid')
	const wifiPasswordField = fields.find(f => f.key === 'wifiPassword')
	const hasWifiFields = Boolean(wifiSsidField && wifiPasswordField)
	const wifiSsid = (fieldValues.wifiSsid ?? '').trim()
	const wifiPassword = (fieldValues.wifiPassword ?? '').trim()
	const showWifiQr = hasWifiFields && wifiSsid.length > 0 && wifiPassword.length > 0

	return (
		<div className="space-y-6">
			{/* Header bar */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold text-white">{title || 'Untitled'}</h2>
					<p className="mt-0.5 text-sm text-slate-400">
						{templateName} &middot; {slug}
					</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={handleSave}
						disabled={saving}
						className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
					>
						{saving ? 'Saving...' : 'Save'}
					</button>
					<a href="/clips" className="text-sm text-slate-400 hover:text-slate-300">
						Back
					</a>
				</div>
			</div>

			{/* Status messages */}
			{error && <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">{error}</div>}
			{successMsg && <div className="rounded-lg border border-green-800 bg-green-950 px-4 py-3 text-sm text-green-300">{successMsg}</div>}

			{/* Full-width Preview */}
			<div ref={wrapperRef} className="overflow-hidden rounded-xl border border-slate-800 bg-black">
				{scale > 0 && (
					<div style={{ width: scaledW, height: scaledH }} className="relative overflow-hidden">
						<div
							style={{ width: SCENE_W, height: SCENE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
							className="absolute left-0 top-0"
						>
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
									return <Scene data={fieldValues} />
								})()}
							</div>
						</div>
					</div>
				)}
			</div>

			{/* Two-column: Clip Info + Content Fields */}
			<div className="grid gap-6 lg:grid-cols-2">
				{/* Clip Info */}
				<section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
					<h3 className="mb-4 text-lg font-semibold text-white">Clip Info</h3>
					<div className="space-y-4">
						<div>
							<label htmlFor="title" className="block text-sm text-slate-400">
								Title
							</label>
							<input
								id="title"
								type="text"
								value={title}
								onChange={e => handleTitleChange(e.target.value)}
								className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div>
							<label htmlFor="slug" className="block text-sm text-slate-400">
								Slug
							</label>
							<input
								id="slug"
								type="text"
								value={slug}
								onChange={e => setSlug(e.target.value)}
								className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<div>
							<label className="block text-sm text-slate-400">Template</label>
							<span className="mt-1 inline-block rounded-md bg-slate-800 px-2.5 py-1.5 text-sm font-medium text-white">{templateName}</span>
						</div>
					</div>

					{/* Programs this clip belongs to */}
					{programs && programs.length > 0 && (
						<div className="mt-6 border-t border-slate-800 pt-4">
							<h4 className="mb-2 text-sm font-semibold text-slate-300">Used in Programs</h4>
							<div className="space-y-1">
								{programs.map(p => (
									<a
										key={p.id}
										href={`/programs/${p.id}`}
										className="block rounded-md px-2 py-1.5 text-sm text-blue-400 transition-colors hover:bg-slate-800 hover:text-blue-300"
									>
										{p.title}
									</a>
								))}
							</div>
						</div>
					)}
				</section>

				{/* Template Content Fields */}
				{fields.length > 0 && (
					<section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
						<h3 className="mb-4 text-lg font-semibold text-white">{templateName} Content</h3>
						<div className="space-y-4">
							{fields.map(field => {
								if (field.type === 'asset') return null
								if (field.key === 'backgroundAudioUrl') return null
								if (field.key === 'matchAudioDuration') return null
								if (field.key === 'wifiPassword') return null
								if (field.key === 'wifiSsid' && hasWifiFields && wifiSsidField && wifiPasswordField) {
									return (
										<div key="wifi-block" className="space-y-4">
											<TemplateField
												field={wifiSsidField}
												value={fieldValues.wifiSsid ?? ''}
												onChange={val => handleFieldChange('wifiSsid', val)}
												idPrefix="field-"
											/>
											<TemplateField
												field={wifiPasswordField}
												value={fieldValues.wifiPassword ?? ''}
												onChange={val => handleFieldChange('wifiPassword', val)}
												idPrefix="field-"
											/>
											{showWifiQr && (
												<div className="flex justify-center">
													<WifiQrCode ssid={wifiSsid} password={wifiPassword} size={100} />
												</div>
											)}
										</div>
									)
								}
								return (
									<TemplateField
										key={field.key}
										field={field}
										value={fieldValues[field.key] ?? ''}
										onChange={val => handleFieldChange(field.key, val)}
										idPrefix="field-"
									/>
								)
							})}
						</div>
					</section>
				)}
			</div>

			{/* Actions */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<button
						onClick={handleSave}
						disabled={saving}
						className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
					>
						{saving ? 'Saving...' : 'Save'}
					</button>
					<a href="/clips" className="text-sm text-slate-400 hover:text-slate-300">
						Back
					</a>
				</div>
				<button
					onClick={handleDelete}
					disabled={saving}
					className="rounded-lg border border-red-800 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-950 hover:text-red-300 disabled:opacity-50"
				>
					Delete Clip
				</button>
			</div>
		</div>
	)
}
