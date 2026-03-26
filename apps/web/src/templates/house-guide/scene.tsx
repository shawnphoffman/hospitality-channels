'use client'

import { SimpleMarkdown } from '../../lib/markdown'
import type { TemplateSceneProps } from '../types'
import { WifiQrCode } from '../wifi-qr-code'

export function HouseGuideScene({ data }: TemplateSceneProps) {
	const hasWifiQr = Boolean(data.wifiSsid && data.wifiPassword)
	const hasWifi = Boolean(data.wifiSsid)
	const hasInfo = Boolean(data.infoImageUrl || data.infoText)
	const isEmpty = !hasWifi && !hasInfo
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
				backgroundImage: hasBg ? `url(${backgroundImageUrl})` : undefined,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
				background: hasBg ? undefined : 'linear-gradient(to bottom, #0f172a, #020617)',
			}}
		>
			{hasBg && <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />}

			<div className="relative z-10 flex items-center justify-center" style={{ paddingTop: 80, paddingInline: 96 }}>
				<h1 style={{ fontSize: 64 }} className="font-bold tracking-tight">
					House Guide
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
						{hasWifi && (
							<div className={`flex items-center gap-8 ${cardClass}`} style={{ padding: '32px 40px' }}>
								{hasWifiQr && <WifiQrCode ssid={data.wifiSsid} password={data.wifiPassword} size={120} />}
								<div>
									<p style={{ fontSize: 20, letterSpacing: '0.15em' }} className="uppercase text-white/50">
										Wi-Fi
									</p>
									<p style={{ fontSize: 36 }} className="mt-3 font-semibold leading-snug">
										{data.wifiSsid}
									</p>
								</div>
							</div>
						)}

						{hasInfo && (
							<div className={`flex flex-1 items-center gap-12 ${cardClass}`} style={{ padding: '40px 48px' }}>
								{data.infoImageUrl && (
									<img src={data.infoImageUrl} alt="" className="shrink-0 rounded-xl object-cover" style={{ width: 260, height: 260 }} />
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
