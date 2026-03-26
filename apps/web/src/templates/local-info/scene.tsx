'use client'

import type { TemplateSceneProps } from '../types'

function InfoBlock({ title, description }: { title: string; description: string }) {
	return (
		<div className="flex flex-1 flex-col justify-center">
			{title && (
				<h2 style={{ fontSize: 40 }} className="font-bold leading-tight">
					{title}
				</h2>
			)}
			{description && (
				<p style={{ fontSize: 28, whiteSpace: 'pre-line' }} className="mt-4 leading-relaxed text-slate-300">
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

	const isEmpty = !photo1Url && !title1 && !description1

	return (
		<div className="flex h-full w-full flex-col text-white" style={{ background: 'linear-gradient(to bottom, #0f172a, #020617)' }}>
			<div className="flex items-center justify-center" style={{ paddingTop: 80, paddingInline: 96 }}>
				<h1 style={{ fontSize: 64 }} className="font-bold tracking-tight">
					{headerText}
				</h1>
			</div>

			<div className="mx-auto mt-6 rounded-full bg-indigo-500" style={{ height: 3, width: 120 }} />

			<div style={{ padding: '50px 96px 60px' }} className="flex flex-1 flex-col">
				{isEmpty ? (
					<div className="flex flex-1 items-center justify-center">
						<p style={{ fontSize: 32 }} className="text-slate-500">
							No local info configured yet.
						</p>
					</div>
				) : layout === 'two-row' ? (
					<div className="flex flex-1 flex-col gap-8">
						{/* Top row */}
						<div
							className="flex flex-1 items-center gap-10 rounded-2xl border border-slate-800 bg-slate-800/40"
							style={{ padding: '32px 40px' }}
						>
							{photo1Url && (
								<div className="shrink-0" style={{ width: '40%', height: 280 }}>
									<PhotoBlock src={photo1Url} height={280} />
								</div>
							)}
							<InfoBlock title={title1} description={description1} />
						</div>

						{/* Bottom row */}
						{(photo2Url || title2 || description2) && (
							<div
								className="flex flex-1 items-center gap-10 rounded-2xl border border-slate-800 bg-slate-800/40"
								style={{ padding: '32px 40px' }}
							>
								{photo2Url && (
									<div className="shrink-0" style={{ width: '40%', height: 280 }}>
										<PhotoBlock src={photo2Url} height={280} />
									</div>
								)}
								<InfoBlock title={title2} description={description2} />
							</div>
						)}
					</div>
				) : (
					<div
						className="flex flex-1 items-center gap-12 rounded-2xl border border-slate-800 bg-slate-800/40"
						style={{ padding: '40px 48px' }}
					>
						{layout === 'photo-left' && photo1Url && (
							<div className="shrink-0" style={{ width: '40%', height: 420 }}>
								<PhotoBlock src={photo1Url} height={420} />
							</div>
						)}

						<div className="flex-1" style={{ width: '60%' }}>
							<InfoBlock title={title1} description={description1} />
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
