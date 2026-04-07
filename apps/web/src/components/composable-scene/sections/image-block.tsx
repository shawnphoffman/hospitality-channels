'use client'

interface ImageBlockSectionProps {
	data: Record<string, string>
	config: Record<string, unknown>
	fields: Array<{ key: string }>
	hasBg: boolean
	accentColor: string
}

export function ImageBlockSection({ data, config, fields, hasBg }: ImageBlockSectionProps) {
	const srcKey = fields.find(f => f.key.endsWith('_src'))?.key ?? fields[0]?.key
	const src = srcKey ? data[srcKey] : ''

	if (!src) return null

	const maxHeight = (config.maxHeight as number) ?? 600
	const objectFit = (config.objectFit as string) ?? 'cover'
	const borderRadius = (config.borderRadius as number) ?? 16
	const alignment = (config.alignment as string) ?? 'center'

	const justifyClass = alignment === 'center' ? 'justify-center' : alignment === 'right' ? 'justify-end' : 'justify-start'

	const cardClass = hasBg
		? 'rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm overflow-hidden'
		: 'rounded-2xl border border-slate-800 bg-slate-800/40 overflow-hidden'

	return (
		<div style={{ paddingInline: 96, paddingTop: 32 }} className={`flex ${justifyClass}`}>
			<div className={cardClass} style={{ borderRadius, maxHeight, overflow: 'hidden' }}>
				<img
					src={src}
					alt=""
					style={{
						maxHeight,
						objectFit: objectFit as 'cover' | 'contain' | 'fill',
						borderRadius,
						display: 'block',
					}}
				/>
			</div>
		</div>
	)
}
