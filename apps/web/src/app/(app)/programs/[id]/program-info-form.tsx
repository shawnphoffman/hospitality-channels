'use client'

import { ImageField } from '@/components/image-field'

interface ProgramInfoFormProps {
	title: string
	onTitleChange: (val: string) => void
	slug: string
	onSlugChange: (val: string) => void
	description: string
	onDescriptionChange: (val: string) => void
	summary: string
	onSummaryChange: (val: string) => void
	iconUrl: string
	onIconUrlChange: (val: string) => void
}

export function ProgramInfoForm({
	title,
	onTitleChange,
	slug,
	onSlugChange,
	description,
	onDescriptionChange,
	summary,
	onSummaryChange,
	iconUrl,
	onIconUrlChange,
}: ProgramInfoFormProps) {
	return (
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
						onChange={e => onTitleChange(e.target.value)}
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
						onChange={e => onSlugChange(e.target.value)}
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
						onChange={e => onDescriptionChange(e.target.value)}
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
						onChange={e => onSummaryChange(e.target.value)}
						rows={2}
						className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
					/>
				</div>
				<ImageField id="icon" label="Icon / Artwork" value={iconUrl} onChange={onIconUrlChange} placeholder="Select program artwork..." />
			</div>
		</section>
	)
}
