'use client'

import { SimpleMarkdown } from '@/lib/markdown'

interface TextCardSectionProps {
	data: Record<string, string>
	config: Record<string, unknown>
	fields: Array<{ key: string }>
	hasBg: boolean
	accentColor: string
}

export function TextCardSection({ data, config, fields, hasBg }: TextCardSectionProps) {
	const bodyKey = fields[0]?.key
	const body = bodyKey ? data[bodyKey] : ''

	if (!body) return null

	const transparentBg = (config.transparentBg as boolean) ?? false
	const padding = (config.padding as string) ?? 'normal'
	const alignment = (config.alignment as string) ?? 'left'

	const paddingPx = padding === 'compact' ? 24 : padding === 'spacious' ? 48 : 36

	const cardClass = transparentBg
		? ''
		: hasBg
			? 'rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm'
			: 'rounded-2xl border border-slate-800 bg-slate-800/40'

	return (
		<div style={{ paddingInline: 96, paddingTop: 32 }}>
			<div className={cardClass} style={{ padding: paddingPx, textAlign: alignment as 'left' | 'center' | 'right' }}>
				<SimpleMarkdown
					text={body}
					className="text-white/80"
					style={{ fontSize: 28, lineHeight: 1.6 }}
				/>
			</div>
		</div>
	)
}
