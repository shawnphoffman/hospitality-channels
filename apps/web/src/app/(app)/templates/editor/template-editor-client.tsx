'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ComposableScene } from '@/components/composable-scene'
import { sectionTypes, createDefaultSection } from '@/components/composable-scene/section-registry'
import { TemplateField } from '@/components/template-field'
import { ImageField } from '@/components/image-field'
import type { ComposableLayout, ComposableSection } from '@hospitality-channels/content-model'
import { SectionConfigPanel } from './section-config-panel'

const SCENE_W = 1920
const SCENE_H = 1080

const DEFAULT_LAYOUT: ComposableLayout = {
	version: 1,
	style: {
		fontFamily: 'Inter',
		accentColor: '#6366f1',
		background: { type: 'gradient', from: '#0f172a', to: '#020617' },
		overlayOpacity: 0.55,
	},
	sections: [],
	sampleData: {},
}

const FONT_OPTIONS = [
	'Inter',
	'Georgia',
	'Palatino',
	'Garamond',
	'Courier New',
	'Trebuchet MS',
	'Arial',
	'Verdana',
]

const BACKGROUND_PRESETS = [
	{ label: 'Dark Slate', type: 'gradient' as const, from: '#0f172a', to: '#020617' },
	{ label: 'Deep Purple', type: 'gradient' as const, from: '#1e1b4b', to: '#0f0a2e' },
	{ label: 'Dark Emerald', type: 'gradient' as const, from: '#064e3b', to: '#022c22' },
	{ label: 'Dark Rose', type: 'gradient' as const, from: '#4c0519', to: '#1c0008' },
	{ label: 'Charcoal', type: 'color' as const, value: '#1a1a2e' },
	{ label: 'Pure Black', type: 'color' as const, value: '#000000' },
]

interface TemplateEditorClientProps {
	existingTemplate?: {
		id: string
		name: string
		description: string
		layoutJson: Record<string, unknown> | null
	}
}

export function TemplateEditorClient({ existingTemplate }: TemplateEditorClientProps) {
	const router = useRouter()
	const isEditing = Boolean(existingTemplate)

	const [name, setName] = useState(existingTemplate?.name ?? '')
	const [description, setDescription] = useState(existingTemplate?.description ?? '')
	const [layout, setLayout] = useState<ComposableLayout>(
		existingTemplate?.layoutJson
			? (existingTemplate.layoutJson as unknown as ComposableLayout)
			: DEFAULT_LAYOUT
	)
	const existingLayout = existingTemplate?.layoutJson as unknown as ComposableLayout | undefined
	const [previewData, setPreviewData] = useState<Record<string, string>>(existingLayout?.sampleData ?? {})
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [successMsg, setSuccessMsg] = useState<string | null>(null)
	const [expandedSection, setExpandedSection] = useState<string | null>(null)

	// Preview scaling
	const wrapperRef = useRef<HTMLDivElement>(null)
	const [scale, setScale] = useState(0)

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

	// Initialize preview data from section field defaults
	useEffect(() => {
		const defaults: Record<string, string> = {}
		for (const section of layout.sections) {
			if (section.enabled) {
				for (const field of section.fields) {
					if (!(field.key in previewData)) {
						defaults[field.key] = field.default ?? ''
					}
				}
			}
		}
		if (Object.keys(defaults).length > 0) {
			setPreviewData(prev => ({ ...defaults, ...prev }))
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [layout.sections])

	const updateLayout = useCallback((updater: (prev: ComposableLayout) => ComposableLayout) => {
		setLayout(prev => updater(prev))
	}, [])

	const handleToggleSection = useCallback((sectionType: ComposableSection['type']) => {
		updateLayout(prev => {
			const existing = prev.sections.find(s => s.type === sectionType)
			if (existing) {
				return {
					...prev,
					sections: prev.sections.map(s =>
						s.type === sectionType ? { ...s, enabled: !s.enabled } : s
					),
				}
			}
			const newSection = createDefaultSection(sectionType, prev.sections.length)
			return { ...prev, sections: [...prev.sections, newSection] }
		})
	}, [updateLayout])

	const handleUpdateSectionConfig = useCallback((sectionId: string, config: Record<string, unknown>) => {
		updateLayout(prev => ({
			...prev,
			sections: prev.sections.map(s =>
				s.id === sectionId ? { ...s, config: { ...s.config, ...config } } : s
			),
		}))
	}, [updateLayout])

	const handleMoveSection = useCallback((sectionId: string, direction: 'up' | 'down') => {
		updateLayout(prev => {
			const enabled = prev.sections.filter(s => s.enabled).sort((a, b) => a.order - b.order)
			const idx = enabled.findIndex(s => s.id === sectionId)
			if (idx < 0) return prev
			if (direction === 'up' && idx === 0) return prev
			if (direction === 'down' && idx === enabled.length - 1) return prev

			const swapIdx = direction === 'up' ? idx - 1 : idx + 1
			const newOrder = enabled.map(s => s.order)
			const tmp = newOrder[idx]
			newOrder[idx] = newOrder[swapIdx]
			newOrder[swapIdx] = tmp

			const updates = new Map<string, number>()
			enabled.forEach((s, i) => updates.set(s.id, newOrder[i]))

			return {
				...prev,
				sections: prev.sections.map(s =>
					updates.has(s.id) ? { ...s, order: updates.get(s.id)! } : s
				),
			}
		})
	}, [updateLayout])

	const handlePreviewDataChange = useCallback((key: string, value: string) => {
		setPreviewData(prev => ({ ...prev, [key]: value }))
	}, [])

	const handleSave = async () => {
		if (!name.trim()) {
			setError('Template name is required')
			return
		}

		setSaving(true)
		setError(null)
		setSuccessMsg(null)

		try {
			const url = isEditing
				? `/api/composable-templates/${existingTemplate!.id}`
				: '/api/composable-templates'
			const method = isEditing ? 'PUT' : 'POST'

			const layoutWithSampleData = { ...layout, sampleData: previewData }
			const res = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name, description, layoutJson: layoutWithSampleData }),
			})

			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				throw new Error(data.error || `Failed to save (${res.status})`)
			}

			const saved = await res.json()
			setSuccessMsg('Saved')
			setTimeout(() => setSuccessMsg(null), 2000)

			if (!isEditing) {
				router.push(`/templates/editor/${saved.id}`)
				router.refresh()
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Something went wrong')
		} finally {
			setSaving(false)
		}
	}

	const handleDelete = async () => {
		if (!isEditing || !existingTemplate) return
		if (!confirm('Are you sure you want to delete this template?')) return

		setSaving(true)
		try {
			const res = await fetch(`/api/composable-templates/${existingTemplate.id}`, { method: 'DELETE' })
			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				throw new Error(data.error || 'Failed to delete')
			}
			router.push('/templates')
			router.refresh()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Something went wrong')
			setSaving(false)
		}
	}

	const enabledSections = layout.sections
		.filter(s => s.enabled)
		.sort((a, b) => a.order - b.order)

	const scaledW = Math.round(SCENE_W * scale)
	const scaledH = Math.round(SCENE_H * scale)

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h2 className="text-2xl font-bold text-white">
						{isEditing ? 'Edit Template' : 'Create Template'}
					</h2>
					<p className="mt-0.5 text-sm text-slate-400">
						Composable template editor
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
					<Link href="/templates" className="text-sm text-slate-400 hover:text-slate-300">
						Back
					</Link>
				</div>
			</div>

			{/* Status messages */}
			{error && <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">{error}</div>}
			{successMsg && <div className="rounded-lg border border-green-800 bg-green-950 px-4 py-3 text-sm text-green-300">{successMsg}</div>}

			<div className="grid gap-6 lg:grid-cols-[380px_1fr]">
				{/* Sidebar */}
				<div className="space-y-4">
					{/* Template Info */}
					<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
						<div className="space-y-3">
							<div>
								<label htmlFor="template-name" className="block text-sm font-medium text-slate-300">
									Template Name
								</label>
								<input
									id="template-name"
									type="text"
									value={name}
									onChange={e => setName(e.target.value)}
									placeholder="e.g. Welcome Screen"
									className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
								/>
							</div>
							<div>
								<label htmlFor="template-description" className="block text-sm font-medium text-slate-300">
									Description
								</label>
								<textarea
									id="template-description"
									rows={2}
									value={description}
									onChange={e => setDescription(e.target.value)}
									placeholder="Brief description of this template"
									className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
								/>
							</div>
						</div>
					</section>

					{/* Page Settings */}
					<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
						<h3 className="mb-3 text-sm font-semibold text-white">Page Settings</h3>
						<div className="space-y-3">
							{/* Font */}
							<div>
								<label htmlFor="font-select" className="block text-xs text-slate-400">Font</label>
								<select
									id="font-select"
									value={layout.style.fontFamily}
									onChange={e => updateLayout(prev => ({
										...prev,
										style: { ...prev.style, fontFamily: e.target.value },
									}))}
									className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
								>
									{FONT_OPTIONS.map(f => (
										<option key={f} value={f} style={{ fontFamily: f }}>{f}</option>
									))}
								</select>
							</div>

							{/* Accent Color */}
							<div>
								<label htmlFor="accent-color" className="block text-xs text-slate-400">Accent Color</label>
								<div className="mt-1 flex items-center gap-2">
									<input
										id="accent-color"
										type="color"
										value={layout.style.accentColor}
										onChange={e => updateLayout(prev => ({
											...prev,
											style: { ...prev.style, accentColor: e.target.value },
										}))}
										className="h-8 w-8 cursor-pointer rounded border border-slate-700 bg-transparent"
									/>
									<span className="text-xs text-slate-500">{layout.style.accentColor}</span>
								</div>
							</div>

							{/* Background */}
							<div>
								<label className="block text-xs text-slate-400">Background</label>
								<div className="mt-1 grid grid-cols-3 gap-1.5">
									{BACKGROUND_PRESETS.map((preset, i) => {
										const isActive =
											layout.style.background.type === preset.type &&
											(preset.type === 'color'
												? layout.style.background.value === preset.value
												: layout.style.background.from === preset.from)
										return (
											<button
												key={i}
												type="button"
												onClick={() => updateLayout(prev => ({
													...prev,
													style: {
														...prev.style,
														background: preset.type === 'color'
															? { type: 'color', value: preset.value }
															: { type: 'gradient', from: preset.from, to: preset.to },
													},
												}))}
												className={`rounded-lg border px-2 py-1.5 text-xs transition-colors ${
													isActive
														? 'border-blue-500 bg-blue-500/10 text-blue-400'
														: 'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-300'
												}`}
											>
												{preset.label}
											</button>
										)
									})}
								</div>
								{/* Background image */}
								<div className="mt-2">
									<ImageField
										id="bg-image"
										label="Background Image"
										value={layout.style.background.type === 'image' ? (layout.style.background.value ?? '') : ''}
										onChange={val => {
											if (val) {
												updateLayout(prev => ({
													...prev,
													style: { ...prev.style, background: { type: 'image', value: val } },
												}))
											} else {
												updateLayout(prev => ({
													...prev,
													style: { ...prev.style, background: { type: 'gradient', from: '#0f172a', to: '#020617' } },
												}))
											}
										}}
									/>
								</div>
							</div>

							{/* Overlay Opacity (only for image backgrounds) */}
							{layout.style.background.type === 'image' && (
								<div>
									<label htmlFor="overlay-opacity" className="block text-xs text-slate-400">
										Overlay Opacity: {Math.round((layout.style.overlayOpacity ?? 0.55) * 100)}%
									</label>
									<input
										id="overlay-opacity"
										type="range"
										min={0}
										max={100}
										value={Math.round((layout.style.overlayOpacity ?? 0.55) * 100)}
										onChange={e => updateLayout(prev => ({
											...prev,
											style: { ...prev.style, overlayOpacity: parseInt(e.target.value) / 100 },
										}))}
										className="mt-1 w-full"
									/>
								</div>
							)}
						</div>
					</section>

					{/* Sections */}
					<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
						<h3 className="mb-3 text-sm font-semibold text-white">Sections</h3>
						<div className="space-y-2">
							{sectionTypes.map(sectionDef => {
								const existing = layout.sections.find(s => s.type === sectionDef.type)
								const isEnabled = existing?.enabled ?? false

								return (
									<div key={sectionDef.type} className="rounded-lg border border-slate-700 bg-slate-800/50">
										{/* Toggle row */}
										<div className="flex items-center justify-between px-3 py-2">
											<div className="flex items-center gap-3">
												<button
													type="button"
													onClick={() => handleToggleSection(sectionDef.type)}
													className={`relative h-5 w-9 rounded-full transition-colors ${
														isEnabled ? 'bg-blue-600' : 'bg-slate-600'
													}`}
												>
													<span
														className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
															isEnabled ? 'left-[18px]' : 'left-0.5'
														}`}
													/>
												</button>
												<span className="text-sm text-slate-300">{sectionDef.label}</span>
											</div>
											<div className="flex items-center gap-1">
												{isEnabled && existing && (
													<>
														<button
															type="button"
															onClick={() => handleMoveSection(existing.id, 'up')}
															className="rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
															title="Move up"
														>
															<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
																<path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
															</svg>
														</button>
														<button
															type="button"
															onClick={() => handleMoveSection(existing.id, 'down')}
															className="rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
															title="Move down"
														>
															<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
																<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
															</svg>
														</button>
														<button
															type="button"
															onClick={() => setExpandedSection(expandedSection === existing.id ? null : existing.id)}
															className="rounded p-1 text-slate-500 hover:bg-slate-700 hover:text-slate-300"
															title="Configure"
														>
															<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
																<path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
																<path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
															</svg>
														</button>
													</>
												)}
											</div>
										</div>

										{/* Config panel */}
										{isEnabled && existing && expandedSection === existing.id && (
											<SectionConfigPanel
												section={existing}
												onUpdateConfig={(config) => handleUpdateSectionConfig(existing.id, config)}
												previewData={previewData}
												onPreviewDataChange={handlePreviewDataChange}
											/>
										)}
									</div>
								)
							})}
						</div>
					</section>
				</div>

				{/* Preview */}
				<div className="space-y-4">
					<div ref={wrapperRef} className="overflow-hidden rounded-xl border border-slate-800 bg-black">
						{scale > 0 && (
							<div style={{ width: scaledW, height: scaledH }} className="relative overflow-hidden">
								<div
									style={{ width: SCENE_W, height: SCENE_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}
									className="absolute left-0 top-0"
								>
									<div className="absolute inset-0 overflow-hidden">
										<ComposableScene layout={layout} data={previewData} />
									</div>
								</div>
							</div>
						)}
					</div>

					{/* Preview data fields for enabled sections */}
					{enabledSections.length > 0 && (
						<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
							<h3 className="mb-3 text-sm font-semibold text-white">Preview Content</h3>
							<p className="mb-3 text-xs text-slate-500">
								Enter sample content to preview. These values will be used as defaults when creating clips from this template.
							</p>
							<div className="space-y-3">
								{enabledSections.flatMap(section =>
									section.fields.map(field => (
										<TemplateField
											key={field.key}
											field={field}
											value={previewData[field.key] ?? field.default ?? ''}
											onChange={val => handlePreviewDataChange(field.key, val)}
											idPrefix="preview-"
										/>
									))
								)}
							</div>
						</section>
					)}
				</div>
			</div>

			{/* Footer actions */}
			{isEditing && (
				<div className="flex justify-end">
					<button
						onClick={handleDelete}
						disabled={saving}
						className="rounded-lg border border-red-800 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-950 hover:text-red-300 disabled:opacity-50"
					>
						Delete Template
					</button>
				</div>
			)}
		</div>
	)
}
