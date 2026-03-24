'use client'

import type { TemplateSceneProps } from '../types'

export function HotelWelcomeScene({ data, renderMode }: TemplateSceneProps) {
	const guestName = data.guestName || 'Guest'
	const subtitle = data.subtitle || 'Welcome to your stay'
	const backgroundImageUrl = data.backgroundImageUrl

	return (
		<div
			className="relative flex h-full w-full items-end text-white"
			style={{
				backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
				backgroundColor: backgroundImageUrl ? undefined : '#1e293b',
			}}
		>
			{/* Semi-transparent panel on the left */}
			<div className="absolute bottom-0 left-0 top-0 flex items-end" style={{ background: 'rgba(0,0,0,0.7)' }}>
				<div className="w-full" style={{ padding: '96px 120px 96px 64px' }}>
					<p style={{ fontSize: 32, letterSpacing: '0.15em', whiteSpace: 'pre-line' }} className="mb-6 uppercase text-white/70">
						{subtitle}
					</p>
					<p style={{ fontSize: 96 }} className="font-bold leading-none tracking-tight">
						{guestName}
					</p>
				</div>
			</div>

			{!renderMode && (
				<p style={{ fontSize: 18 }} className="absolute bottom-10 right-12 text-slate-500">
					Preview
				</p>
			)}
		</div>
	)
}
