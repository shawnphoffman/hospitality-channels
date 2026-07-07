'use client'

import type { CSSProperties, ReactNode } from 'react'

/**
 * Tag color derives deterministically from the name, so a tag renders
 * identically everywhere it appears without storing a color.
 */
export function tagHue(name: string): number {
	let h = 0
	for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360
	return h
}

export function tagChipStyle(name: string): CSSProperties {
	const h = tagHue(name)
	return {
		color: `hsl(${h} 65% 72%)`,
		borderColor: `hsl(${h} 45% 34%)`,
		background: `hsl(${h} 55% 50% / 0.09)`,
	}
}

interface TagChipProps {
	name: string
	onRemove?: () => void
	onClick?: () => void
	active?: boolean
	children?: ReactNode
}

export function TagChip({ name, onRemove, onClick, active, children }: TagChipProps) {
	const style = tagChipStyle(name)
	const content = (
		<>
			{name}
			{children}
			{onRemove && (
				<button
					onClick={e => {
						e.stopPropagation()
						onRemove()
					}}
					aria-label={`Remove tag ${name}`}
					className="ml-0.5 opacity-60 hover:opacity-100"
					style={{ color: 'inherit' }}
				>
					&times;
				</button>
			)}
		</>
	)
	const classes = `inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] ${active ? 'ring-1 ring-current' : ''}`
	if (onClick) {
		return (
			<button onClick={onClick} className={classes} style={style} aria-pressed={active}>
				{content}
			</button>
		)
	}
	return (
		<span className={classes} style={style}>
			{content}
		</span>
	)
}
