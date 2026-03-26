'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function NewProgramForm() {
	const router = useRouter()
	const [title, setTitle] = useState('')
	const [slug, setSlug] = useState('')
	const [description, setDescription] = useState('')
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleTitleChange = (val: string) => {
		setTitle(val)
		setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
	}

	const handleSubmit = async () => {
		if (!title.trim()) {
			setError('Title is required')
			return
		}
		setSaving(true)
		setError(null)
		try {
			const res = await fetch('/api/programs', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
					description: description || undefined,
				}),
			})
			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				throw new Error(data.error || 'Failed to create program')
			}
			const program = await res.json()
			router.push(`/programs/${program.id}`)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Something went wrong')
		} finally {
			setSaving(false)
		}
	}

	return (
		<div className="max-w-lg space-y-4">
			{error && <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">{error}</div>}

			<div>
				<label htmlFor="title" className="block text-sm text-slate-400">Title</label>
				<input id="title" type="text" value={title} onChange={e => handleTitleChange(e.target.value)}
					className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
					placeholder="Welcome Loop" />
			</div>

			<div>
				<label htmlFor="slug" className="block text-sm text-slate-400">Slug</label>
				<input id="slug" type="text" value={slug} onChange={e => setSlug(e.target.value)}
					className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none" />
			</div>

			<div>
				<label htmlFor="description" className="block text-sm text-slate-400">Description (optional)</label>
				<textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3}
					className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
					placeholder="A multi-clip welcome screen with background music" />
			</div>

			<div className="flex items-center gap-3">
				<button onClick={handleSubmit} disabled={saving}
					className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50">
					{saving ? 'Creating...' : 'Create Program'}
				</button>
				<a href="/programs" className="text-sm text-slate-400 hover:text-slate-300">Cancel</a>
			</div>
		</div>
	)
}
