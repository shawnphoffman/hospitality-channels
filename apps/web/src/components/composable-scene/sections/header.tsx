'use client'

interface HeaderSectionProps {
	data: Record<string, string>
	config: Record<string, unknown>
	fields: Array<{ key: string }>
	hasBg: boolean
	accentColor: string
}

export function HeaderSection({ data, config, fields, hasBg, accentColor }: HeaderSectionProps) {
	const titleKey = fields.find(f => f.key.endsWith('_title'))?.key ?? fields[0]?.key
	const subtitleKey = fields.find(f => f.key.endsWith('_subtitle'))?.key ?? fields[1]?.key

	const title = titleKey ? data[titleKey] : ''
	const subtitle = subtitleKey ? data[subtitleKey] : ''
	const fontSize = (config.fontSize as number) ?? 64
	const showDivider = (config.showDivider as boolean) ?? true
	const alignment = (config.alignment as string) ?? 'center'

	const textAlign = alignment as 'left' | 'center' | 'right'

	if (!title && !subtitle) return null

	return (
		<div style={{ paddingTop: 80, paddingInline: 96, textAlign }}>
			{title && (
				<h1
					style={{ fontSize, lineHeight: 1.1 }}
					className="font-bold tracking-tight text-white"
				>
					{title}
				</h1>
			)}
			{subtitle && (
				<p
					style={{ fontSize: Math.round(fontSize * 0.55), marginTop: 16 }}
					className="font-light text-white/70"
				>
					{subtitle}
				</p>
			)}
			{showDivider && (
				<div
					className={`${alignment === 'center' ? 'mx-auto' : alignment === 'right' ? 'ml-auto' : ''}`}
					style={{ height: 3, width: 120, marginTop: 24, backgroundColor: hasBg ? 'rgba(255,255,255,0.3)' : accentColor }}
				/>
			)}
		</div>
	)
}
