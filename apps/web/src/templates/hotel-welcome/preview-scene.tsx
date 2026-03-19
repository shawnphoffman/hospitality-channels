'use client'

import type { PreviewTemplateSceneProps } from '../types'

export function HotelWelcomePreviewScene({ data, renderMode }: PreviewTemplateSceneProps) {
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
			{/* Dark gradient overlay for text legibility */}
			<div
				className="absolute inset-0"
				style={{
					background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 40%, rgba(0,0,0,0.1) 70%, transparent 100%)',
				}}
			/>

			{/* Content pinned to bottom */}
			<div className="relative z-10 w-full" style={{ padding: '96px 120px' }}>
				<p style={{ fontSize: 28, letterSpacing: '0.15em' }} className="mb-4 uppercase text-white/70">
					{subtitle}
				</p>
				<p style={{ fontSize: 96 }} className="font-bold leading-none tracking-tight">
					{guestName}
				</p>
			</div>

			{!renderMode && (
				<p style={{ fontSize: 18 }} className="absolute bottom-10 right-12 text-slate-600">
					Preview
				</p>
			)}
		</div>
	)
}
