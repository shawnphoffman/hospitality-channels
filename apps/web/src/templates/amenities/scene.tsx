'use client'

import type { TemplateSceneProps } from '../types'

interface Amenity {
	name: string
	hours: string
	details: string
	icon: string
}

export function AmenitiesScene({ data }: TemplateSceneProps) {
	const headerText = data.headerText || 'Property Amenities'
	const backgroundImageUrl = data.backgroundImageUrl
	const backgroundVideoUrl = data.backgroundVideoUrl
	const hasVideo = Boolean(backgroundVideoUrl)
	const hasBg = Boolean(backgroundImageUrl || backgroundVideoUrl)

	const amenities: Amenity[] = [
		{ name: data.amenity1Name, hours: data.amenity1Hours, details: data.amenity1Details, icon: data.amenity1Icon || 'pool' },
		{ name: data.amenity2Name, hours: data.amenity2Hours, details: data.amenity2Details, icon: data.amenity2Icon || 'gym' },
		{ name: data.amenity3Name, hours: data.amenity3Hours, details: data.amenity3Details, icon: data.amenity3Icon || 'spa' },
		{ name: data.amenity4Name, hours: data.amenity4Hours, details: data.amenity4Details, icon: data.amenity4Icon || 'business' },
	].filter(a => Boolean(a.name))

	const hasPhoto = Boolean(data.photoUrl)
	const isEmpty = amenities.length === 0 && !hasPhoto

	const cardClass = hasBg
		? 'rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm'
		: 'rounded-2xl border border-slate-800 bg-slate-800/40'

	const dividerClass = hasBg ? 'bg-white/30' : 'bg-indigo-500'
	const badgeClass = hasBg
		? 'rounded-md bg-white/10 font-bold uppercase tracking-widest text-white/60'
		: 'rounded-md bg-slate-700/60 font-bold uppercase tracking-widest text-slate-300'

	return (
		<div
			className="relative flex h-full w-full flex-col text-white"
			style={{
				width: 1920,
				height: 1080,
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
					{headerText}
				</h1>
			</div>

			<div className={`relative z-10 mx-auto mt-6 rounded-full ${dividerClass}`} style={{ height: 3, width: 120 }} />

			<div style={{ padding: '50px 96px 60px' }} className="relative z-10 flex flex-1 gap-12">
				{isEmpty ? (
					<div className="flex flex-1 items-center justify-center">
						<p style={{ fontSize: 32 }} className="text-white/50">
							No amenities configured yet.
						</p>
					</div>
				) : (
					<>
						{amenities.length > 0 && (
							<div className="grid grid-cols-2 gap-6" style={{ flex: hasPhoto ? '0 0 55%' : '1 1 100%' }}>
								{amenities.map(amenity => (
									<div key={amenity.name} className={`flex flex-col ${cardClass}`} style={{ padding: '32px 36px' }}>
										<span
											className={badgeClass}
											style={{ fontSize: 13, padding: '4px 12px', letterSpacing: '0.15em', alignSelf: 'flex-start' }}
										>
											{amenity.icon}
										</span>
										<p style={{ fontSize: 32, marginTop: 16 }} className="font-semibold leading-snug">
											{amenity.name}
										</p>
										{amenity.hours && (
											<p style={{ fontSize: 22, marginTop: 8 }} className="text-white/50">
												{amenity.hours}
											</p>
										)}
										{amenity.details && (
											<p style={{ fontSize: 20, marginTop: 8 }} className="leading-relaxed text-white/70">
												{amenity.details}
											</p>
										)}
									</div>
								))}
							</div>
						)}

						{hasPhoto && (
							<div style={{ flex: amenities.length > 0 ? '0 0 45%' : '1 1 100%' }} className="flex items-center">
								<img src={data.photoUrl} alt="" className="h-full w-full rounded-2xl object-cover" />
							</div>
						)}
					</>
				)}
			</div>
		</div>
	)
}
