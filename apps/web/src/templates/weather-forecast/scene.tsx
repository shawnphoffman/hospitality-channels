'use client'

import type { TemplateSceneProps } from '../types'

interface ForecastDay {
	label: string
	icon: string
	condition: string
	high: string
	low: string
}

export function WeatherForecastScene({ data }: TemplateSceneProps) {
	const headerText = data.headerText || 'Weather Forecast'
	const locationName = data.weatherLocationName || ''
	const footerText = data.footerText || ''
	// Set by the weather provider on Fetch (F/C); manual `unitLabel` overrides; defaults to F.
	const unitLabel = data.weatherUnitLabel || data.unitLabel || 'F'
	const backgroundImageUrl = data.backgroundImageUrl
	const hasBg = Boolean(backgroundImageUrl)

	// Render whichever days have data, supporting more than the 5 declared slots.
	const days: ForecastDay[] = []
	for (let n = 1; n <= 7; n++) {
		const high = data[`weatherDay${n}High`] || ''
		const condition = data[`weatherDay${n}Condition`] || ''
		if (!high && !condition) continue
		days.push({
			label: data[`weatherDay${n}Label`] || '',
			icon: data[`weatherDay${n}Icon`] || '',
			condition,
			high,
			low: data[`weatherDay${n}Low`] || '',
		})
	}

	const isEmpty = days.length === 0
	const cardClass = hasBg
		? 'rounded-2xl border border-white/10 bg-black/60 backdrop-blur-sm'
		: 'rounded-2xl border border-slate-800 bg-slate-800/50'

	return (
		<div
			className="relative flex h-full w-full flex-col text-white"
			style={{
				background: backgroundImageUrl
					? `url(${backgroundImageUrl}) center / cover no-repeat`
					: 'linear-gradient(to bottom, #0f172a, #020617)',
			}}
		>
			{hasBg && <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />}

			<div className="relative z-10 flex h-full w-full flex-col" style={{ padding: '80px 96px' }}>
				{/* Header */}
				<div className="flex flex-col items-center text-center">
					<h1 style={{ fontSize: 72 }} className="font-bold tracking-tight">
						{headerText}
					</h1>
					{locationName && (
						<p style={{ fontSize: 40 }} className="mt-3 font-light text-white/70">
							{locationName}
						</p>
					)}
				</div>

				<div className="mx-auto mt-6 rounded-full bg-indigo-500" style={{ height: 3, width: 140 }} />

				{/* Day cards */}
				<div className="flex flex-1 items-center justify-center">
					{isEmpty ? (
						<p style={{ fontSize: 32 }} className="text-white/50">
							No forecast data yet. Add a weather provider and click &ldquo;Fetch weather&rdquo;.
						</p>
					) : (
						<div className="flex w-full items-stretch justify-center gap-6">
							{days.map((day, i) => (
								<div key={i} className={`flex flex-1 flex-col items-center ${cardClass}`} style={{ padding: '36px 20px', maxWidth: 280 }}>
									{day.label && (
										<p style={{ fontSize: 34 }} className="font-semibold text-white/90">
											{day.label}
										</p>
									)}
									{day.icon && (
										<span style={{ fontSize: 72, lineHeight: 1.1 }} className="my-3">
											{day.icon}
										</span>
									)}
									<p style={{ fontSize: 44 }} className="font-bold">
										{day.high}
										{day.high && unitLabel ? `°${unitLabel}` : ''}
									</p>
									{day.low && (
										<p style={{ fontSize: 30 }} className="mt-1 text-white/60">
											{day.low}
											{unitLabel ? `°${unitLabel}` : ''}
										</p>
									)}
									{day.condition && (
										<p style={{ fontSize: 26 }} className="mt-3 text-center leading-snug text-white/70">
											{day.condition}
										</p>
									)}
								</div>
							))}
						</div>
					)}
				</div>

				{footerText && (
					<div className="flex items-center justify-center" style={{ paddingTop: 40 }}>
						<p style={{ fontSize: 28 }} className="text-white/50">
							{footerText}
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
