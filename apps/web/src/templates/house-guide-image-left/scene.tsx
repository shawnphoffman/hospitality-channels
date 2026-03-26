'use client'

import { SimpleMarkdown } from '../../lib/markdown'
import type { TemplateSceneProps } from '../types'
import { WifiQrCode } from '../wifi-qr-code'

export function HouseGuideImageLeftScene({ data }: TemplateSceneProps) {
	const hasWifiQr = Boolean(data.wifiSsid && data.wifiPassword)
	const hasWifi = Boolean(data.wifiSsid)
	const backgroundImageUrl = data.backgroundImageUrl
	const hasBg = Boolean(backgroundImageUrl)

	const cardClass = hasBg
		? 'rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm'
		: 'rounded-2xl border border-slate-800 bg-slate-800/40'

	return (
		<div
			className="relative flex h-full w-full text-white"
			style={{
				backgroundImage: hasBg ? `url(${backgroundImageUrl})` : undefined,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
				background: hasBg ? undefined : 'linear-gradient(to bottom, #0f172a, #020617)',
			}}
		>
			{hasBg && <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />}

			{/* Left: Image */}
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

			{/* Right: Title + WiFi + Text */}
			<div className="relative z-10 flex w-[55%] flex-col justify-center" style={{ padding: '60px 80px 60px 20px' }}>
				<h1 style={{ fontSize: 64 }} className="font-bold tracking-tight">
					{data.headerText || 'House Guide'}
				</h1>

				<div className="mt-2" style={{ height: 3, width: 120, background: hasBg ? 'rgba(255,255,255,0.3)' : '#6366f1' }} />

				<div className="mt-10 flex flex-col gap-8">
					{hasWifi && (
						<div className={`flex items-center gap-8 ${cardClass}`} style={{ padding: '28px 36px' }}>
							{hasWifiQr && <WifiQrCode ssid={data.wifiSsid} password={data.wifiPassword} size={100} />}
							<div>
								<p style={{ fontSize: 18, letterSpacing: '0.15em' }} className="uppercase text-white/50">
									Wi-Fi
								</p>
								<p style={{ fontSize: 32 }} className="mt-2 font-semibold leading-snug">
									{data.wifiSsid}
								</p>
							</div>
						</div>
					)}

					{data.infoText && (
						<div className={`flex-1 ${cardClass}`} style={{ padding: '36px 40px' }}>
							<SimpleMarkdown text={data.infoText} style={{ fontSize: 30 }} className="leading-relaxed text-white/80" />
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
