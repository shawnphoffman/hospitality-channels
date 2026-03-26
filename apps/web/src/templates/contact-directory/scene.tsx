'use client'

import type { TemplateSceneProps } from '../types'

const contactIndices = [1, 2, 3, 4, 5, 6] as const

export function ContactDirectoryScene({ data }: TemplateSceneProps) {
	const header = data.headerText || 'Contact Directory'
	const footer = data.footerText
	const backgroundImageUrl = data.backgroundImageUrl
	const backgroundVideoUrl = data.backgroundVideoUrl
	const hasVideo = Boolean(backgroundVideoUrl)
	const hasBg = Boolean(backgroundImageUrl || backgroundVideoUrl)

	const contacts = contactIndices
		.map(i => ({
			label: data[`contact${i}Label`] || '',
			number: data[`contact${i}Number`] || '',
		}))
		.filter(c => c.number)

	const isEmpty = contacts.length === 0

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
			{hasBg && <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />}

			{hasVideo && (
				<video src={backgroundVideoUrl} autoPlay loop muted playsInline className="absolute inset-0 h-full w-full object-cover" />
			)}

			<div className="relative z-10 flex items-center justify-center" style={{ paddingTop: 80, paddingInline: 96 }}>
				<h1 style={{ fontSize: 64 }} className="font-bold tracking-tight">
					{header}
				</h1>
			</div>

			<div className={`relative z-10 mx-auto mt-6 rounded-full ${dividerClass}`} style={{ height: 3, width: 120 }} />

			<div style={{ padding: '50px 96px 60px' }} className="relative z-10 flex flex-1 flex-col">
				{isEmpty ? (
					<div className="flex flex-1 items-center justify-center">
						<p style={{ fontSize: 32 }} className="text-white/50">
							No contacts configured yet.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-2 gap-5">
						{contacts.map((contact, index) => (
							<div
								key={index}
								className={`flex items-center justify-between rounded-xl border ${
									hasBg ? 'border-white/10 bg-black/60 backdrop-blur-sm' : 'border-slate-800'
								}`}
								style={{
									padding: '28px 36px',
									backgroundColor: hasBg ? undefined : index % 2 === 0 ? 'rgba(30, 41, 59, 0.4)' : 'rgba(30, 41, 59, 0.25)',
								}}
							>
								<p style={{ fontSize: 24, letterSpacing: '0.15em' }} className="uppercase text-white/50">
									{contact.label}
								</p>
								<p style={{ fontSize: 40 }} className="font-semibold">
									{contact.number}
								</p>
							</div>
						))}
					</div>
				)}

				{footer && (
					<div className="mt-auto flex items-center justify-center" style={{ paddingTop: 40 }}>
						<p style={{ fontSize: 28 }} className="text-white/50">
							{footer}
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
