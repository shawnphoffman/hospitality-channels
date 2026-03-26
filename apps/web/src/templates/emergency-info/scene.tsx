'use client'

import { SimpleMarkdown } from '../../lib/markdown'
import type { TemplateSceneProps } from '../types'

const contactCards = [
	{ key: 'frontDesk', label: 'Front Desk' },
	{ key: 'security', label: 'Security' },
	{ key: 'nearestHospital', label: 'Nearest Hospital' },
	{ key: 'nearestPharmacy', label: 'Nearest Pharmacy' },
] as const

export function EmergencyInfoScene({ data }: TemplateSceneProps) {
	const headerText = data.headerText || 'Emergency Information'
	const emergencyNumber = data.emergencyNumber || '911'
	const fireSafety = data.fireSafety || ''
	const additionalInfo = data.additionalInfo || ''
	const backgroundImageUrl = data.backgroundImageUrl
	const hasBg = Boolean(backgroundImageUrl)

	const visibleCards = contactCards.filter(c => data[c.key])

	const cardClass = hasBg
		? 'rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm'
		: 'rounded-2xl border border-slate-800 bg-slate-800/40'

	const dividerClass = hasBg ? 'bg-red-400/50' : 'bg-red-500'

	return (
		<div
			className="relative flex h-full w-full flex-col text-white"
			style={{
				background: hasBg ? `url(${backgroundImageUrl}) center / cover no-repeat` : 'linear-gradient(to bottom, #0f172a, #1a0a0a, #020617)',
			}}
		>
			{hasBg && <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} />}

			<div className="relative z-10 flex items-center justify-center" style={{ paddingTop: 80, paddingInline: 96 }}>
				<h1 style={{ fontSize: 64 }} className="font-bold tracking-tight">
					{headerText}
				</h1>
			</div>

			<div className={`relative z-10 mx-auto mt-6 rounded-full ${dividerClass}`} style={{ height: 3, width: 120 }} />

			<div style={{ padding: '40px 96px 60px' }} className="relative z-10 flex flex-1 flex-col">
				{/* Emergency number - prominent display */}
				<div className="flex flex-col items-center" style={{ marginBottom: 40 }}>
					<p style={{ fontSize: 20, letterSpacing: '0.15em' }} className="uppercase text-white/50">
						Emergency
					</p>
					<p style={{ fontSize: 140 }} className="font-bold leading-none text-red-400">
						{emergencyNumber}
					</p>
				</div>

				{/* Contact cards grid */}
				{visibleCards.length > 0 && (
					<div
						className="grid gap-6"
						style={{
							gridTemplateColumns: visibleCards.length === 1 ? '1fr' : '1fr 1fr',
							marginBottom: fireSafety || additionalInfo ? 32 : 0,
						}}
					>
						{visibleCards.map(card => (
							<div key={card.key} className={cardClass} style={{ padding: '28px 36px' }}>
								<p style={{ fontSize: 18, letterSpacing: '0.15em' }} className="uppercase text-white/50">
									{card.label}
								</p>
								<p style={{ fontSize: 36 }} className="mt-3 font-semibold leading-snug">
									{data[card.key]}
								</p>
							</div>
						))}
					</div>
				)}

				{/* Fire Safety section */}
				{fireSafety && (
					<div className={cardClass} style={{ padding: '28px 36px', marginBottom: additionalInfo ? 24 : 0 }}>
						<p style={{ fontSize: 20, letterSpacing: '0.15em', marginBottom: 12 }} className="uppercase text-white/50">
							Fire Safety
						</p>
						<SimpleMarkdown text={fireSafety} style={{ fontSize: 28 }} className="leading-relaxed text-white/80" />
					</div>
				)}

				{/* Additional Info section */}
				{additionalInfo && (
					<div className={cardClass} style={{ padding: '28px 36px' }}>
						<p style={{ fontSize: 20, letterSpacing: '0.15em', marginBottom: 12 }} className="uppercase text-white/50">
							Additional Information
						</p>
						<SimpleMarkdown text={additionalInfo} style={{ fontSize: 28 }} className="leading-relaxed text-white/80" />
					</div>
				)}
			</div>
		</div>
	)
}
