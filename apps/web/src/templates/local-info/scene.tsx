'use client'

import type { TemplateSceneProps } from '../types'

function InfoBlock({ title, description, hasBg }: { title: string; description: string; hasBg: boolean }) {
	return (
		<div className="flex flex-1 flex-col justify-center">
			{title && (
				<h2 style={{ fontSize: 40 }} className="font-bold leading-tight">
					{title}
				</h2>
			)}
			{description && (
				<p
					style={{ fontSize: 28, whiteSpace: 'pre-line' }}
					className={`mt-4 leading-relaxed ${hasBg ? 'text-white/70' : 'text-slate-300'}`}
				>
					{description}
				</p>
			)}
		</div>
	)
}

function PhotoBlock({ src, height }: { src: string; height?: number }) {
	return <img src={src} alt="" className="shrink-0 rounded-2xl object-cover" style={{ width: '100%', height: height ?? '100%' }} />
}

export function LocalInfoScene({ data }: TemplateSceneProps) {
	const headerText = data.headerText || 'Local Information'
	const layout = data.layout || 'photo-right'
	const photo1Url = data.photo1Url || ''
	const title1 = data.title1 || ''
	const description1 = data.description1 || ''
	const photo2Url = data.photo2Url || ''
	const title2 = data.title2 || ''
	const description2 = data.description2 || ''
	const backgroundImageUrl = data.backgroundImageUrl
	const hasBg = Boolean(backgroundImageUrl)

	const isEmpty = !photo1Url && !title1 && !description1

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
					{headerText}
				</h1>
			</div>

			<div className={`relative z-10 mx-auto mt-6 rounded-full ${dividerClass}`} style={{ height: 3, width: 120 }} />

			<div style={{ padding: '50px 96px 60px' }} className="relative z-10 flex flex-1 flex-col">
				{isEmpty ? (
					<div className="flex flex-1 items-center justify-center">
						<p style={{ fontSize: 32 }} className="text-white/50">
							No local info configured yet.
						</p>
					</div>
				) : layout === 'two-row' ? (
					<div className="flex flex-1 flex-col gap-8">
						{/* Top row */}
						<div className={`flex flex-1 items-center gap-10 ${cardClass}`} style={{ padding: '32px 40px' }}>
							{photo1Url && (
								<div className="shrink-0" style={{ width: '40%', height: 280 }}>
									<PhotoBlock src={photo1Url} height={280} />
								</div>
							)}
							<InfoBlock title={title1} description={description1} hasBg={hasBg} />
						</div>

						{/* Bottom row */}
						{(photo2Url || title2 || description2) && (
							<div className={`flex flex-1 items-center gap-10 ${cardClass}`} style={{ padding: '32px 40px' }}>
								{photo2Url && (
									<div className="shrink-0" style={{ width: '40%', height: 280 }}>
										<PhotoBlock src={photo2Url} height={280} />
									</div>
								)}
								<InfoBlock title={title2} description={description2} hasBg={hasBg} />
							</div>
						)}
					</div>
				) : (
					<div className={`flex flex-1 items-center gap-12 ${cardClass}`} style={{ padding: '40px 48px' }}>
						{layout === 'photo-left' && photo1Url && (
							<div className="shrink-0" style={{ width: '40%', height: 420 }}>
								<PhotoBlock src={photo1Url} height={420} />
							</div>
						)}

						<div className="flex-1" style={{ width: '60%' }}>
							<InfoBlock title={title1} description={description1} hasBg={hasBg} />
						</div>

						{layout === 'photo-right' && photo1Url && (
							<div className="shrink-0" style={{ width: '40%', height: 420 }}>
								<PhotoBlock src={photo1Url} height={420} />
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
