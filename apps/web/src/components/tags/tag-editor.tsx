'use client'

import { useId, useState } from 'react'
import { TagChip } from './tag-chip'

interface TagEditorProps {
	tags: string[]
	/** Known vocabulary for autocomplete. */
	allTags: string[]
	/** Called with the full new tag list; the caller persists it. */
	onChange: (tags: string[]) => void
	disabled?: boolean
}

/** Inline tag chips with remove buttons and a "+ tag" affordance that expands to an autocomplete input. */
export function TagEditor({ tags, allTags, onChange, disabled }: TagEditorProps) {
	const [adding, setAdding] = useState(false)
	const [value, setValue] = useState('')
	const listId = useId()

	const commit = () => {
		const name = value.trim()
		setValue('')
		setAdding(false)
		if (name && !tags.includes(name)) onChange([...tags, name])
	}

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{tags.map(t => (
				<TagChip key={t} name={t} onRemove={disabled ? undefined : () => onChange(tags.filter(x => x !== t))} />
			))}
			{adding ? (
				<span>
					<input
						autoFocus
						list={listId}
						value={value}
						onChange={e => setValue(e.target.value)}
						onKeyDown={e => {
							if (e.key === 'Enter') commit()
							if (e.key === 'Escape') {
								setValue('')
								setAdding(false)
							}
						}}
						onBlur={commit}
						placeholder="tag name"
						aria-label="New tag"
						className="w-28 rounded-full border border-slate-600 bg-slate-800 px-2.5 py-0.5 text-[11px] text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
					/>
					<datalist id={listId}>
						{allTags
							.filter(t => !tags.includes(t))
							.map(t => (
								<option key={t} value={t} />
							))}
					</datalist>
				</span>
			) : (
				<button
					onClick={() => setAdding(true)}
					disabled={disabled}
					className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-slate-600 px-2 py-0.5 text-[11px] text-slate-500 hover:text-slate-300 disabled:opacity-50"
				>
					+ tag
				</button>
			)}
		</div>
	)
}
