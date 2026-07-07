'use client'

import { TagChip } from './tag-chip'

interface TagFilterBarProps {
	/** Tag names with their usage count for this page. */
	tags: Array<{ name: string; count: number }>
	active: Set<string>
	onToggle: (name: string) => void
}

/** Toggleable tag chips; combining active tags narrows (AND). */
export function TagFilterBar({ tags, active, onToggle }: TagFilterBarProps) {
	if (tags.length === 0) return null
	return (
		<div className="flex flex-wrap gap-1.5 border-b border-slate-800 px-3 py-2.5">
			{tags.map(t => (
				<TagChip key={t.name} name={t.name} active={active.has(t.name)} onClick={() => onToggle(t.name)}>
					<span className="opacity-60 tabular-nums">{t.count}</span>
				</TagChip>
			))}
		</div>
	)
}
