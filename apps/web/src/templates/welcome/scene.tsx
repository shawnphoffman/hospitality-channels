'use client'

import type { TemplateSceneProps } from '../types'
import { WifiQrCode } from '../wifi-qr-code'

export function WelcomeScene({ data }: TemplateSceneProps) {
	const guestName = data.guestName || 'Guest'
	const welcomeMessage = data.welcomeMessage || 'Welcome to your home away from home!'
	const wifiSsid = data.wifiSsid
	const wifiPassword = data.wifiPassword
	const hasWifiQr = Boolean(wifiSsid && wifiPassword)
	const backgroundImageUrl = data.backgroundImageUrl
	const backgroundVideoUrl = data.backgroundVideoUrl
	const hasVideo = Boolean(backgroundVideoUrl)
	const hasBg = Boolean(backgroundImageUrl || backgroundVideoUrl)

	const cardClass = hasBg
		? 'border border-white/10 bg-black/60 backdrop-blur-sm'
		: 'border border-slate-700/60 bg-slate-800/60 backdrop-blur-sm'

	return (
		<div
			className="relative flex h-full w-full flex-col items-center justify-center text-white"
			style={{
				background:
					backgroundImageUrl && !hasVideo
						? `url(${backgroundImageUrl}) center / cover no-repeat`
						: hasBg
							? '#000'
							: 'linear-gradient(to bottom right, #0f172a, #1e293b, #1e1b4b)',
			}}
		>
			{hasBg && <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />}

			{hasVideo && (
				<video src={backgroundVideoUrl} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" />
			)}

			{!hasBg && (
				<div
					className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full"
					style={{
						top: -160,
						height: 600,
						width: 800,
						opacity: 0.2,
						filter: 'blur(120px)',
						background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)',
					}}
				/>
			)}

			<div className={`relative z-10 flex flex-col items-center rounded-3xl ${cardClass}`} style={{ padding: '64px 80px' }}>
				<p style={{ fontSize: 96 }} className="mb-6 text-center font-bold leading-none tracking-tight">
					{guestName}
				</p>

				<h1 style={{ fontSize: 42 }} className="mb-10 text-center font-light leading-tight text-white/70">
					{welcomeMessage}
				</h1>

				{wifiSsid && (
					<div className="flex items-center gap-8">
						{hasWifiQr && <WifiQrCode ssid={wifiSsid} password={wifiPassword} size={140} />}
						<div className={hasWifiQr ? 'text-left' : 'text-center'}>
							<p style={{ fontSize: 20, letterSpacing: '0.2em' }} className="mb-2 uppercase text-white/50">
								Wi-Fi
							</p>
							<p style={{ fontSize: 36 }} className="font-semibold">
								{wifiSsid}
							</p>
							{!hasWifiQr && wifiPassword && (
								<p style={{ fontSize: 28 }} className="mt-2 font-light text-white/70">
									{wifiPassword}
								</p>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
