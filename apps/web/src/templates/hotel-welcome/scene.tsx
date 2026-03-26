'use client'

import { SimpleMarkdown } from '../../lib/markdown'
import type { TemplateSceneProps } from '../types'
import { WifiQrCode } from '../wifi-qr-code'

export function HotelWelcomeScene({ data }: TemplateSceneProps) {
	const guestName = data.guestName || 'Guest'
	const subtitle = data.subtitle || 'Welcome to your stay'
	const backgroundImageUrl = data.backgroundImageUrl
	const backgroundVideoUrl = data.backgroundVideoUrl
	const hasVideo = Boolean(backgroundVideoUrl)
	const hasBg = Boolean(backgroundImageUrl || backgroundVideoUrl)
	const wifiSsid = data.wifiSsid
	const wifiPassword = data.wifiPassword
	const hasWifi = Boolean(wifiSsid)
	const hasWifiQr = Boolean(wifiSsid && wifiPassword)

	return (
		<div
			className="relative flex h-full w-full items-end text-white"
			style={{
				background: backgroundImageUrl && !hasVideo ? `url(${backgroundImageUrl}) center / cover no-repeat` : hasBg ? '#000' : '#1e293b',
			}}
		>
			{hasVideo && (
				<video src={backgroundVideoUrl} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" />
			)}

			{/* Semi-transparent panel on the left */}
			<div className="absolute bottom-0 left-0 top-0 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }}>
				<div className="w-full" style={{ padding: '96px 120px 96px 64px' }}>
					<SimpleMarkdown text={subtitle} style={{ fontSize: 32, letterSpacing: '0.15em' }} className="mb-6 uppercase text-white/70" />
					<p style={{ fontSize: 96 }} className="font-bold leading-none tracking-tight">
						{guestName}
					</p>
					{hasWifi && (
						<div
							className="mt-10 flex items-center gap-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm"
							style={{ padding: '24px 32px' }}
						>
							{hasWifiQr && <WifiQrCode ssid={wifiSsid} password={wifiPassword} size={100} />}
							<div>
								<p style={{ fontSize: 16, letterSpacing: '0.2em' }} className="uppercase text-white/50">
									Wi-Fi
								</p>
								<p style={{ fontSize: 28 }} className="mt-1 font-semibold">
									{wifiSsid}
								</p>
								{!hasWifiQr && wifiPassword && (
									<p style={{ fontSize: 22 }} className="mt-1 font-light text-white/70">
										{wifiPassword}
									</p>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	)
}
