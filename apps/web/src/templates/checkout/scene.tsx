'use client'

import { SimpleMarkdown } from '../../lib/markdown'
import type { TemplateSceneProps } from '../types'

function InfoCard({ label, value, hasBg }: { label: string; value: string; hasBg: boolean }) {
	const cardClass = hasBg
		? 'rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm'
		: 'rounded-2xl border border-slate-800 bg-slate-800/40'

	return (
		<div className={cardClass} style={{ padding: '28px 32px' }}>
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
	const backgroundImageUrl = data.backgroundImageUrl
	const backgroundVideoUrl = data.backgroundVideoUrl
	const hasVideo = Boolean(backgroundVideoUrl)
	const hasBg = Boolean(backgroundImageUrl || backgroundVideoUrl)

	const infoItems = [
		{ label: 'Late Checkout', value: lateCheckout },
		{ label: 'Express Checkout', value: expressCheckout },
		{ label: 'Luggage Storage', value: luggageStorage },
		{ label: 'Front Desk', value: contactNumber },
	].filter(item => item.value)

	const dividerClass = hasBg ? 'bg-white/30' : 'bg-indigo-500'

	return (
		<div
			className="relative flex h-full w-full flex-col text-white"
			style={{
				background:
					backgroundImageUrl && !hasVideo
						? `url(${backgroundImageUrl}) center / cover no-repeat`
						: hasBg
							? '#000'
							: 'linear-gradient(to bottom, #0f172a, #020617)',
			}}
		>
			{hasVideo && (
				<video src={backgroundVideoUrl} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" />
			)}

			{hasBg && <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />}

			<div className="relative z-10 flex items-center justify-center" style={{ paddingTop: 80, paddingInline: 96 }}>
				<h1 style={{ fontSize: 64 }} className="font-bold tracking-tight">
					{headerText}
				</h1>
			</div>

			<div className={`relative z-10 mx-auto rounded-full ${dividerClass}`} style={{ height: 3, width: 120, marginTop: 24 }} />

			<div className="relative z-10 flex items-center justify-center" style={{ marginTop: 40 }}>
				<p style={{ fontSize: 120 }} className="font-bold tracking-tight">
					{checkoutTime}
				</p>
			</div>

			{infoItems.length > 0 && (
				<div className="relative z-10 grid grid-cols-2 gap-6" style={{ padding: '40px 96px 0' }}>
					{infoItems.map(item => (
						<InfoCard key={item.label} label={item.label} value={item.value} hasBg={hasBg} />
					))}
				</div>
			)}

			{additionalInfo && (
				<div className="relative z-10" style={{ padding: '32px 96px 60px' }}>
					<SimpleMarkdown text={additionalInfo} style={{ fontSize: 24 }} className="leading-relaxed text-white/70" />
				</div>
			)}
		</div>
	)
}
