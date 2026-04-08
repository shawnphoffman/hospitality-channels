'use client'

import { SimpleMarkdown } from '../../lib/markdown'
import type { TemplateSceneProps } from '../types'

export function ChannelOfflineScene({ data }: TemplateSceneProps) {
	const heading = data.heading || 'Channel Offline'
	const message = data.message || 'This channel is currently unavailable.\nPlease check back later.'
	const contactInfo = data.contactInfo
	const backgroundImageUrl = data.backgroundImageUrl
	const backgroundVideoUrl = data.backgroundVideoUrl
	const hasVideo = Boolean(backgroundVideoUrl)
	const hasBg = Boolean(backgroundImageUrl || backgroundVideoUrl)

	const cardClass = hasBg
		? 'rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm'
		: 'rounded-2xl border border-slate-800 bg-slate-800/40'

	return (
		<div
			className="relative flex h-full w-full flex-col items-center justify-center text-white"
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

			<div className="relative z-10 flex flex-col items-center" style={{ maxWidth: 960, padding: '0 96px' }}>
				{/* Icon */}
				<div className="mb-8 flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5">
					<svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
						<rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
						<polyline points="17 2 12 7 7 2" />
						<line x1="8" y1="12" x2="16" y2="18" />
						<line x1="16" y1="12" x2="8" y2="18" />
					</svg>
				</div>

				{/* Heading */}
				<h1 style={{ fontSize: 72 }} className="mb-4 text-center font-bold tracking-tight">
					{heading}
				</h1>

				{/* Divider */}
				<div className="mb-8 h-[3px] w-24 rounded-full bg-white/20" />

				{/* Message */}
				<div className={`${cardClass} px-12 py-8 text-center`}>
					<SimpleMarkdown
						text={message}
						className="text-white/70"
						style={{ fontSize: 32, lineHeight: 1.6 }}
					/>
				</div>

				{/* Contact info */}
				{contactInfo && (
					<p style={{ fontSize: 22 }} className="mt-8 text-center text-white/40">
						{contactInfo}
					</p>
				)}
			</div>
		</div>
	)
}
