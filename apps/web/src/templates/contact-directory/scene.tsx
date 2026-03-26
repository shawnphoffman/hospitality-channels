'use client'

import type { TemplateSceneProps } from '../types'

const contactIndices = [1, 2, 3, 4, 5, 6] as const

export function ContactDirectoryScene({ data }: TemplateSceneProps) {
	const header = data.headerText || 'Contact Directory'
	const footer = data.footerText

	const contacts = contactIndices
		.map(i => ({
			label: data[`contact${i}Label`] || '',
			number: data[`contact${i}Number`] || '',
		}))
		.filter(c => c.number)

	const isEmpty = contacts.length === 0

	return (
		<div className="flex h-full w-full flex-col text-white" style={{ background: 'linear-gradient(to bottom, #0f172a, #020617)' }}>
			<div className="flex items-center justify-center" style={{ paddingTop: 80, paddingInline: 96 }}>
				<h1 style={{ fontSize: 64 }} className="font-bold tracking-tight">
					{header}
				</h1>
			</div>

			<div className="mx-auto mt-6 rounded-full bg-indigo-500" style={{ height: 3, width: 120 }} />

			<div style={{ padding: '50px 96px 60px' }} className="flex flex-1 flex-col">
				{isEmpty ? (
					<div className="flex flex-1 items-center justify-center">
						<p style={{ fontSize: 32 }} className="text-slate-500">
							No contacts configured yet.
						</p>
					</div>
				) : (
					<div className="grid grid-cols-2 gap-5">
						{contacts.map((contact, index) => (
							<div
								key={index}
								className="flex items-center justify-between rounded-xl border border-slate-800"
								style={{
									padding: '28px 36px',
									backgroundColor: index % 2 === 0 ? 'rgba(30, 41, 59, 0.4)' : 'rgba(30, 41, 59, 0.25)',
								}}
							>
								<p style={{ fontSize: 24, letterSpacing: '0.15em' }} className="uppercase text-slate-400">
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
						<p style={{ fontSize: 28 }} className="text-slate-400">
							{footer}
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
