'use client'

import { SimpleMarkdown } from '../../lib/markdown'
import type { TemplateSceneProps } from '../types'
import { QrCode } from '../qr-code'

export function HouseGuideScene({ data }: TemplateSceneProps) {
	const hasQr = Boolean(data.qrCodeValue)
	const hasInfo = Boolean(data.infoImageUrl || data.infoText)
	const isEmpty = !hasQr && !hasInfo
	const backgroundImageUrl = data.backgroundImageUrl
	const hasBg = Boolean(backgroundImageUrl)

	const cardClass = hasBg
		? 'rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm'
		: 'rounded-2xl border border-slate-800 bg-slate-800/40'

	const dividerClass = hasBg ? 'bg-white/30' : 'bg-indigo-500'

	return (
		<div
			className="relative flex h-full w-full flex-col text-white"
			style={{
				background: hasBg ? `url(${backgroundImageUrl}) center / cover no-repeat` : 'linear-gradient(to bottom, #0f172a, #020617)',
			}}
		>
			{hasBg && <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />}

			<div className="relative z-10 flex items-center justify-center" style={{ paddingTop: 80, paddingInline: 96 }}>
				<h1 style={{ fontSize: 64 }} className="font-bold tracking-tight">
					{data.headerText || 'House Guide'}
				</h1>
			</div>

			<div className={`relative z-10 mx-auto mt-6 rounded-full ${dividerClass}`} style={{ height: 3, width: 120 }} />

			<div style={{ padding: '50px 96px 60px' }} className="relative z-10 flex flex-1 flex-col gap-8">
				{isEmpty ? (
					<div className="flex flex-1 items-center justify-center">
						<p style={{ fontSize: 32 }} className="text-white/50">
							No house info configured yet.
						</p>
					</div>
				) : (
					<>
						{hasQr && (
							<div className={`flex items-center gap-8 ${cardClass}`} style={{ padding: '32px 40px' }}>
								<QrCode value={data.qrCodeValue} size={120} />
								{data.qrCodeLabel && (
									<p style={{ fontSize: 32 }} className="font-semibold leading-snug">
										{data.qrCodeLabel}
									</p>
								)}
							</div>
						)}

						{hasInfo && (
							<div className={`flex flex-1 items-center gap-12 ${cardClass}`} style={{ padding: '40px 48px' }}>
								{data.infoImageUrl && (
									<img src={data.infoImageUrl} alt="" className="shrink-0 rounded-xl object-cover" style={{ width: 260, height: 'auto' }} />
								)}
								{data.infoText && (
									<SimpleMarkdown text={data.infoText} style={{ fontSize: 32 }} className="flex-1 leading-relaxed text-white/80" />
								)}
							</div>
						)}
					</>
				)}
			</div>
		</div>
	)
}
