'use client'

import { Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { getTemplateRegistry } from '@hospitality-channels/templates'
import { getTemplateScenes } from '@/templates/registry'
import { TemplateField } from '@/components/template-field'

interface SchemaField {
	key: string
	label: string
	type: string
	default?: string | boolean
	required?: boolean
}

const SCENE_W = 1920
const SCENE_H = 1080

export default function TemplateDevPage() {
	return (
		<Suspense>
			<TemplateDevContent />
		</Suspense>
	)
}

function TemplateDevContent() {
	const searchParams = useSearchParams()
	const templates = useMemo(() => getTemplateRegistry(), [])
	const initialSlug = searchParams.get('template') || templates[0]?.slug || ''

	const [selectedSlug, setSelectedSlug] = useState(initialSlug)
	const [data, setData] = useState<Record<string, string>>({})
	const [showSafeArea, setShowSafeArea] = useState(false)
	const wrapperRef = useRef<HTMLDivElement>(null)
	const [scale, setScale] = useState(0)

	const selectedTemplate = useMemo(() => templates.find(t => t.slug === selectedSlug), [templates, selectedSlug])
	const fields: SchemaField[] = useMemo(() => (selectedTemplate?.schema as { fields?: SchemaField[] })?.fields ?? [], [selectedTemplate])
	const scenes = useMemo(() => (selectedSlug ? getTemplateScenes(selectedSlug) : undefined), [selectedSlug])

	// Initialize data from template defaults when template changes
	useEffect(() => {
		const defaults: Record<string, string> = {}
		for (const field of fields) {
			if (field.type === 'boolean') {
				defaults[field.key] = String(field.default ?? false)
			} else {
				defaults[field.key] = String(field.default ?? '')
			}
		}
		setData(defaults)
	}, [fields])

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

	const PreviewScene = scenes?.scene

	return (
		<div className="flex flex-col gap-4">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-4">
				<div className="flex items-center gap-2">
					<label className="text-sm font-medium text-slate-400">Template</label>
					<select
						value={selectedSlug}
						onChange={e => setSelectedSlug(e.target.value)}
						className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white"
					>
						{templates.map(t => (
							<option key={t.slug} value={t.slug}>
								{t.name}
							</option>
						))}
					</select>
				</div>

				<label className="flex items-center gap-2 text-sm text-slate-400">
					<input
						type="checkbox"
						checked={showSafeArea}
						onChange={e => setShowSafeArea(e.target.checked)}
						className="rounded border-slate-600"
					/>
					Safe area
				</label>

				<span className="text-xs text-slate-600">
					{SCENE_W}&times;{SCENE_H} &middot; {Math.round(scale * 100)}%
				</span>
			</div>

			{/* Preview */}
			<div
				ref={wrapperRef}
				className="relative flex aspect-video max-h-[50vh] w-full items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
			>
				{PreviewScene && scale > 0 && (
					<div
						style={{
							width: SCENE_W,
							height: SCENE_H,
							transform: `scale(${scale})`,
							transformOrigin: 'center center',
						}}
						className="relative shrink-0"
					>
						<PreviewScene data={data} />

						{showSafeArea && (
							<div
								className="pointer-events-none absolute inset-0 border-red-500/40"
								style={{ borderWidth: `${SCENE_H * 0.05}px ${SCENE_W * 0.05}px` }}
							/>
						)}
					</div>
				)}

				{!PreviewScene && <p className="text-slate-500">No scene registered for &ldquo;{selectedSlug}&rdquo;</p>}
			</div>

			{/* Fields */}
			<div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
				<h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">Fields</h3>
				<div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
					{fields.map(field => (
						<TemplateField
							key={field.key}
							field={field}
							value={data[field.key] ?? ''}
							onChange={v => setData(prev => ({ ...prev, [field.key]: v }))}
						/>
					))}
					{fields.length === 0 && <p className="text-sm text-slate-500">No fields defined</p>}
				</div>
			</div>
		</div>
	)
}
