'use client'

import { SimpleMarkdown } from '../../lib/markdown'
import type { TemplateSceneProps } from '../types'
import { QrCode } from '../qr-code'

export function HouseGuideImageRightScene({ data }: TemplateSceneProps) {
	const hasQr = Boolean(data.qrCodeValue)
	const backgroundImageUrl = data.backgroundImageUrl
	const hasBg = Boolean(backgroundImageUrl)

	const cardClass = hasBg
		? 'rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm'
		: 'rounded-2xl border border-slate-800 bg-slate-800/40'

	return (
		<div
			className="relative flex h-full w-full text-white"
			style={{
				background: hasBg ? `url(${backgroundImageUrl}) center / cover no-repeat` : 'linear-gradient(to bottom, #0f172a, #020617)',
			}}
		>
			{hasBg && <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />}

			{/* Left: Title + WiFi + Text */}
			<div className="relative z-10 flex w-[55%] flex-col justify-center" style={{ padding: '60px 20px 60px 80px' }}>
				<h1 style={{ fontSize: 64 }} className="font-bold tracking-tight">
					{data.headerText || 'House Guide'}
				</h1>

				<div className="mt-2" style={{ height: 3, width: 120, background: hasBg ? 'rgba(255,255,255,0.3)' : '#6366f1' }} />

				<div className="mt-10 flex flex-col gap-8">
					{hasQr && (
						<div className={`flex items-center gap-8 ${cardClass}`} style={{ padding: '28px 36px' }}>
							<QrCode value={data.qrCodeValue} size={100} />
							{data.qrCodeLabel && (
								<p style={{ fontSize: 30 }} className="font-semibold leading-snug">
									{data.qrCodeLabel}
								</p>
							)}
						</div>
					)}

					{data.infoText && (
						<div className={`flex-1 ${cardClass}`} style={{ padding: '36px 40px' }}>
							<SimpleMarkdown text={data.infoText} style={{ fontSize: 30 }} className="leading-relaxed text-white/80" />
						</div>
					)}
				</div>
			</div>

			{/* Right: Image */}
			<div className="relative z-10 flex w-[45%] items-center justify-center" style={{ padding: 60 }}>
				{data.infoImageUrl ? (
					<img src={data.infoImageUrl} alt="" className="max-h-full max-w-full rounded-2xl object-contain" />
				) : (
					<div className={`flex h-full w-full items-center justify-center ${cardClass}`}>
						<p style={{ fontSize: 28 }} className="text-white/30">
							No image
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
