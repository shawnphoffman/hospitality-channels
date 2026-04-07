'use client'

import { QrCode } from '@/templates/qr-code'

interface QrCodeSectionProps {
	data: Record<string, string>
	config: Record<string, unknown>
	fields: Array<{ key: string }>
	hasBg: boolean
	accentColor: string
}

export function QrCodeSection({ data, config, fields, hasBg }: QrCodeSectionProps) {
	const valueKey = fields.find(f => f.key.endsWith('_value'))?.key ?? fields[0]?.key
	const labelKey = fields.find(f => f.key.endsWith('_label'))?.key ?? fields[1]?.key

	const value = valueKey ? data[valueKey] : ''
	const label = labelKey ? data[labelKey] : ''

	if (!value) return null

	const size = (config.size as number) ?? 200
	const alignment = (config.alignment as string) ?? 'center'

	const justifyClass = alignment === 'center' ? 'justify-center' : alignment === 'right' ? 'justify-end' : 'justify-start'

	const cardClass = hasBg
		? 'rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm'
		: 'rounded-2xl border border-slate-800 bg-slate-800/40'

	return (
		<div style={{ paddingInline: 96, paddingTop: 32 }} className={`flex ${justifyClass}`}>
			<div className={`${cardClass} flex flex-col items-center gap-4`} style={{ padding: 32 }}>
				<QrCode value={value} size={size} />
				{label && (
					<p style={{ fontSize: 20 }} className="text-center text-white/70">
						{label}
					</p>
				)}
			</div>
		</div>
	)
}
