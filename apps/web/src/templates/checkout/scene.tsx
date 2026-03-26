'use client'

import { SimpleMarkdown } from '../../lib/markdown'
import type { TemplateSceneProps } from '../types'

function InfoCard({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-2xl border border-slate-800 bg-slate-800/40" style={{ padding: '28px 32px' }}>
			<p style={{ fontSize: 16, letterSpacing: '0.15em' }} className="uppercase text-white/50">
				{label}
			</p>
			<p style={{ fontSize: 28 }} className="mt-2 font-semibold text-white">
				{value}
			</p>
		</div>
	)
}

export function CheckoutScene({ data }: TemplateSceneProps) {
	const headerText = data.headerText || 'Checkout Information'
	const checkoutTime = data.checkoutTime || '11:00 AM'
	const lateCheckout = data.lateCheckout || ''
	const expressCheckout = data.expressCheckout || ''
	const luggageStorage = data.luggageStorage || ''
	const contactNumber = data.contactNumber || ''
	const additionalInfo = data.additionalInfo || ''

	const infoItems = [
		{ label: 'Late Checkout', value: lateCheckout },
		{ label: 'Express Checkout', value: expressCheckout },
		{ label: 'Luggage Storage', value: luggageStorage },
		{ label: 'Front Desk', value: contactNumber },
	].filter(item => item.value)

	return (
		<div className="flex h-full w-full flex-col text-white" style={{ background: 'linear-gradient(to bottom, #0f172a, #020617)' }}>
			<div className="flex items-center justify-center" style={{ paddingTop: 80, paddingInline: 96 }}>
				<h1 style={{ fontSize: 64 }} className="font-bold tracking-tight">
					{headerText}
				</h1>
			</div>

			<div className="mx-auto rounded-full bg-indigo-500" style={{ height: 3, width: 120, marginTop: 24 }} />

			<div className="flex items-center justify-center" style={{ marginTop: 40 }}>
				<p style={{ fontSize: 120 }} className="font-bold tracking-tight">
					{checkoutTime}
				</p>
			</div>

			{infoItems.length > 0 && (
				<div className="grid grid-cols-2 gap-6" style={{ padding: '40px 96px 0' }}>
					{infoItems.map(item => (
						<InfoCard key={item.label} label={item.label} value={item.value} />
					))}
				</div>
			)}

			{additionalInfo && (
				<div style={{ padding: '32px 96px 60px' }}>
					<SimpleMarkdown text={additionalInfo} style={{ fontSize: 24 }} className="leading-relaxed text-slate-300" />
				</div>
			)}
		</div>
	)
}
