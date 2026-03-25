'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateField } from '@/components/template-field'

interface TemplateFieldDef {
	key: string
	label: string
	type: string
	default: unknown
	required?: boolean
}

interface TemplateOption {
	slug: string
	name: string
	description: string
	category: string
	id: string
	fields: TemplateFieldDef[]
}

interface CreateClipFormProps {
	templates: TemplateOption[]
	preselectedTemplate: string | null
}

export function CreateClipForm({ templates, preselectedTemplate }: CreateClipFormProps) {
	const router = useRouter()

	const [selectedSlug, setSelectedSlug] = useState(preselectedTemplate ?? templates[0]?.slug ?? '')
	const [title, setTitle] = useState('')
	const [slug, setSlug] = useState('')
	const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const selectedTemplate = templates.find(t => t.slug === selectedSlug)

	const handleTemplateChange = useCallback(
		(slug: string) => {
			setSelectedSlug(slug)
			const tmpl = templates.find(t => t.slug === slug)
			if (tmpl) {
				const defaults: Record<string, string> = {}
				for (const f of tmpl.fields) {
					defaults[f.key] = f.default != null ? String(f.default) : ''
				}
				setFieldValues(defaults)
			}
		},
		[templates]
	)

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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!selectedTemplate) return
		if (!title.trim()) {
			setError('Title is required')
			return
		}

		setSaving(true)
		setError(null)

		try {
			const res = await fetch('/api/clips', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					templateId: selectedTemplate.id,
					slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
					title,
					dataJson: fieldValues,
					defaultDurationSec: 30,
				}),
			})

			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				throw new Error(data.error || `Failed to create clip (${res.status})`)
			}

			router.push('/clips')
			router.refresh()
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Something went wrong')
		} finally {
			setSaving(false)
		}
	}

	// Initialize defaults on first render if a template is preselected
	if (selectedTemplate && Object.keys(fieldValues).length === 0 && selectedTemplate.fields.length > 0) {
		const defaults: Record<string, string> = {}
		for (const f of selectedTemplate.fields) {
			defaults[f.key] = f.default != null ? String(f.default) : ''
		}
		// Use setTimeout to avoid setState during render
		setTimeout(() => setFieldValues(defaults), 0)
	}

	return (
		<form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
			{error && <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">{error}</div>}

			{/* Template Selection */}
			<section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
				<h3 className="mb-4 text-lg font-semibold text-white">Template</h3>
				<div className="grid gap-3 sm:grid-cols-2">
					{templates.map(t => (
						<button
							key={t.slug}
							type="button"
							onClick={() => handleTemplateChange(t.slug)}
							className={`rounded-lg border p-4 text-left transition-colors ${
								selectedSlug === t.slug ? 'border-blue-500 bg-blue-950/50' : 'border-slate-700 bg-slate-800 hover:border-slate-600'
							}`}
						>
							<p className="font-medium text-white">{t.name}</p>
							<p className="mt-1 text-xs text-slate-400">{t.description}</p>
						</button>
					))}
				</div>
			</section>

			{/* Clip Info */}
			<section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
				<h3 className="mb-4 text-lg font-semibold text-white">Clip Info</h3>
				<div className="space-y-4">
					<div>
						<label htmlFor="title" className="block text-sm text-slate-400">
							Title <span className="text-red-400">*</span>
						</label>
						<input
							id="title"
							type="text"
							value={title}
							onChange={e => handleTitleChange(e.target.value)}
							placeholder="e.g. Welcome - Alex Johnson"
							required
							className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
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
							placeholder="auto-generated from title"
							className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
						/>
					</div>
				</div>
			</section>

			{/* Template Content Fields */}
			{selectedTemplate && selectedTemplate.fields.length > 0 && (
				<section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
					<h3 className="mb-4 text-lg font-semibold text-white">{selectedTemplate.name} Content</h3>
					<div className="space-y-4">
						{selectedTemplate.fields.map(field => {
							if (field.type === 'asset') return null
							return (
								<TemplateField
									key={field.key}
									field={field}
									value={fieldValues[field.key] ?? ''}
									onChange={val => handleFieldChange(field.key, val)}
								/>
							)
						})}
					</div>
				</section>
			)}

			{/* Submit */}
			<div className="flex items-center gap-4">
				<button
					type="submit"
					disabled={saving}
					className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
				>
					{saving ? 'Creating...' : 'Create Clip'}
				</button>
				<a href="/clips" className="text-sm text-slate-400 hover:text-slate-300">
					Cancel
				</a>
			</div>
		</form>
	)
}
