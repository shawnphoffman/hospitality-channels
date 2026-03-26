'use client'

import type { TemplateSceneProps } from '../types'

interface AgendaItem {
	time: string
	title: string
	description: string
}

export function DailyAgendaScene({ data }: TemplateSceneProps) {
	const headerText = data.headerText || "Today's Schedule"
	const date = data.date || ''
	const footerText = data.footerText || ''

	const items: AgendaItem[] = [
		{ time: data.item1Time || '', title: data.item1Title || '', description: data.item1Description || '' },
		{ time: data.item2Time || '', title: data.item2Title || '', description: data.item2Description || '' },
		{ time: data.item3Time || '', title: data.item3Title || '', description: data.item3Description || '' },
		{ time: data.item4Time || '', title: data.item4Title || '', description: data.item4Description || '' },
	].filter(item => item.title)

	const isEmpty = items.length === 0

	return (
		<div className="flex h-full w-full flex-col text-white" style={{ background: 'linear-gradient(to bottom, #0f172a, #020617)' }}>
			<div className="flex flex-col items-center justify-center" style={{ paddingTop: 80, paddingInline: 96 }}>
				<h1 style={{ fontSize: 64 }} className="font-bold tracking-tight">
					{headerText}
				</h1>
				{date && (
					<p style={{ fontSize: 36 }} className="mt-4 font-light text-slate-300">
						{date}
					</p>
				)}
			</div>

			<div className="mx-auto mt-6 rounded-full bg-indigo-500" style={{ height: 3, width: 120 }} />

			<div style={{ padding: '50px 96px 40px' }} className="flex flex-1 flex-col gap-6">
				{isEmpty ? (
					<div className="flex flex-1 items-center justify-center">
						<p style={{ fontSize: 32 }} className="text-slate-500">
							No agenda items configured yet.
						</p>
					</div>
				) : (
					<div className="flex flex-1 flex-col gap-5">
						{items.map((item, index) => (
							<div
								key={index}
								className="flex items-start gap-8 rounded-2xl border border-slate-800 bg-slate-800/40"
								style={{ padding: '28px 40px' }}
							>
								{item.time && (
									<div className="shrink-0" style={{ minWidth: 160 }}>
										<p style={{ fontSize: 32 }} className="font-semibold text-indigo-400">
											{item.time}
										</p>
									</div>
								)}
								<div className="flex-1">
									<p style={{ fontSize: 32 }} className="font-semibold leading-snug">
										{item.title}
									</p>
									{item.description && (
										<p style={{ fontSize: 24 }} className="mt-2 leading-relaxed text-slate-300">
											{item.description}
										</p>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>

			{footerText && (
				<div className="flex items-center justify-center" style={{ paddingBottom: 60, paddingInline: 96 }}>
					<p style={{ fontSize: 28 }} className="text-slate-400">
						{footerText}
					</p>
				</div>
			)}
		</div>
	)
}
