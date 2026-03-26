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

	const visibleCards = contactCards.filter(c => data[c.key])

	return (
		<div className="flex h-full w-full flex-col text-white" style={{ background: 'linear-gradient(to bottom, #0f172a, #1a0a0a, #020617)' }}>
			<div className="flex items-center justify-center" style={{ paddingTop: 80, paddingInline: 96 }}>
				<h1 style={{ fontSize: 64 }} className="font-bold tracking-tight">
					{headerText}
				</h1>
			</div>

			<div className="mx-auto mt-6 rounded-full bg-red-500" style={{ height: 3, width: 120 }} />

			<div style={{ padding: '40px 96px 60px' }} className="flex flex-1 flex-col">
				{/* Emergency number - prominent display */}
				<div className="flex flex-col items-center" style={{ marginBottom: 40 }}>
					<p style={{ fontSize: 20, letterSpacing: '0.15em' }} className="uppercase text-slate-400">
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
							<div key={card.key} className="rounded-2xl border border-slate-800 bg-slate-800/40" style={{ padding: '28px 36px' }}>
								<p style={{ fontSize: 18, letterSpacing: '0.15em' }} className="uppercase text-slate-400">
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
					<div
						className="rounded-2xl border border-slate-800 bg-slate-800/40"
						style={{ padding: '28px 36px', marginBottom: additionalInfo ? 24 : 0 }}
					>
						<p style={{ fontSize: 20, letterSpacing: '0.15em', marginBottom: 12 }} className="uppercase text-slate-400">
							Fire Safety
						</p>
						<SimpleMarkdown text={fireSafety} style={{ fontSize: 28 }} className="leading-relaxed text-slate-200" />
					</div>
				)}

				{/* Additional Info section */}
				{additionalInfo && (
					<div className="rounded-2xl border border-slate-800 bg-slate-800/40" style={{ padding: '28px 36px' }}>
						<p style={{ fontSize: 20, letterSpacing: '0.15em', marginBottom: 12 }} className="uppercase text-slate-400">
							Additional Information
						</p>
						<SimpleMarkdown text={additionalInfo} style={{ fontSize: 28 }} className="leading-relaxed text-slate-200" />
					</div>
				)}
			</div>
		</div>
	)
}
