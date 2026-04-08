'use client'

import { useState, useEffect, type ReactNode } from 'react'

export default function AppLayout({ children }: { children: ReactNode }) {
	const [collapsed, setCollapsed] = useState(false)

	return (
		<div className="flex h-screen overflow-hidden">
			<Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />
			<main className="flex-1 overflow-y-auto p-8">{children}</main>
		</div>
	)
}

const iconProps = {
	xmlns: 'http://www.w3.org/2000/svg',
	width: 18,
	height: 18,
	viewBox: '0 0 24 24',
	fill: 'none',
	stroke: 'currentColor',
	strokeWidth: 2,
	strokeLinecap: 'round' as const,
	strokeLinejoin: 'round' as const,
}

type NavItem = { type: 'link'; href: string; label: string; icon: JSX.Element } | { type: 'separator' }

const navItems: NavItem[] = [
	{
		type: 'link',
		href: '/',
		label: 'Dashboard',
		icon: (
			<svg {...iconProps}>
				<rect x="3" y="3" width="7" height="9" rx="1" />
				<rect x="14" y="3" width="7" height="5" rx="1" />
				<rect x="14" y="12" width="7" height="9" rx="1" />
				<rect x="3" y="16" width="7" height="5" rx="1" />
			</svg>
		),
	},
	{
		type: 'link',
		href: '/clips',
		label: 'Clips',
		icon: (
			<svg {...iconProps}>
				<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
				<polyline points="14 2 14 8 20 8" />
				<line x1="16" y1="13" x2="8" y2="13" />
				<line x1="16" y1="17" x2="8" y2="17" />
			</svg>
		),
	},
	{
		type: 'link',
		href: '/programs',
		label: 'Programs',
		icon: (
			<svg {...iconProps}>
				<rect x="2" y="2" width="20" height="20" rx="2" />
				<line x1="7" y1="2" x2="7" y2="22" />
				<line x1="2" y1="12" x2="22" y2="12" />
				<line x1="2" y1="7" x2="7" y2="7" />
				<line x1="2" y1="17" x2="7" y2="17" />
			</svg>
		),
	},
	{
		type: 'link',
		href: '/channels',
		label: 'Channels',
		icon: (
			<svg {...iconProps}>
				<rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
				<polyline points="17 2 12 7 7 2" />
			</svg>
		),
	},
	{ type: 'separator' },
	{
		type: 'link',
		href: '/templates',
		label: 'Templates',
		icon: (
			<svg {...iconProps}>
				<rect x="3" y="3" width="18" height="18" rx="2" />
				<line x1="3" y1="9" x2="21" y2="9" />
				<line x1="9" y1="21" x2="9" y2="9" />
			</svg>
		),
	},
	{
		type: 'link',
		href: '/images',
		label: 'Images',
		icon: (
			<svg {...iconProps}>
				<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
				<circle cx="8.5" cy="8.5" r="1.5" />
				<polyline points="21 15 16 10 5 21" />
			</svg>
		),
	},
	{
		type: 'link',
		href: '/audio',
		label: 'Audio',
		icon: (
			<svg {...iconProps}>
				<path d="M9 18V5l12-3v13" />
				<circle cx="6" cy="18" r="3" />
				<circle cx="18" cy="15" r="3" />
			</svg>
		),
	},
	{
		type: 'link',
		href: '/videos',
		label: 'Videos',
		icon: (
			<svg {...iconProps}>
				<path d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72" />
				<rect x="2.25" y="5.25" width="13.5" height="13.5" rx="2.25" />
			</svg>
		),
	},
	{ type: 'separator' },
	{
		type: 'link',
		href: '/publish',
		label: 'Artifacts',
		icon: (
			<svg {...iconProps}>
				<polyline points="21 8 21 21 3 21 3 8" />
				<rect x="1" y="3" width="22" height="5" />
				<line x1="10" y1="12" x2="14" y2="12" />
			</svg>
		),
	},
	{
		type: 'link',
		href: '/settings',
		label: 'Settings',
		icon: (
			<svg {...iconProps}>
				<circle cx="12" cy="12" r="3" />
				<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
			</svg>
		),
	},
]

function SupportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
	useEffect(() => {
		if (!open) return
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose()
		}
		document.addEventListener('keydown', handler)
		return () => document.removeEventListener('keydown', handler)
	}, [open, onClose])

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
			<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
			<div
				className="relative w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
				onClick={e => e.stopPropagation()}
			>
				<button
					onClick={onClose}
					className="absolute right-3 top-3 rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>

				<div className="mb-4 flex items-center gap-2.5">
					<svg xmlns="http://www.w3.org/2000/svg" width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
						<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
					</svg>
					<h2 className="text-lg font-bold text-white">Support the Trail</h2>
				</div>

				<p className="mb-5 text-sm leading-relaxed text-slate-400">
					Hospitality Channels is free and open source. If it saves you time, consider donating to the Pacific Crest Trail Association.
				</p>

				<a
					href="https://www.pcta.org/donate/#donate"
					target="_blank"
					rel="noopener noreferrer"
					className="mb-2 flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/60 px-4 py-3 transition-colors hover:border-amber-500/50 hover:bg-slate-800"
				>
					<div>
						<p className="font-medium text-white">Pacific Crest Trail Association</p>
						<p className="text-sm text-slate-500">Protecting the PCT from Mexico to Canada</p>
					</div>
					<svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-slate-500">
						<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
						<polyline points="15 3 21 3 21 9" />
						<line x1="10" y1="14" x2="21" y2="3" />
					</svg>
				</a>

				<div className="my-4 border-t border-slate-800" />

				<p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">Support the Developer</p>
				<div className="flex gap-3">
					<a
						href="https://ko-fi.com/shawnhoffman"
						target="_blank"
						rel="noopener noreferrer"
						className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-center text-sm text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-slate-300"
					>
						Ko-fi
					</a>
					<a
						href="https://buymeacoffee.com/shawnhoffman"
						target="_blank"
						rel="noopener noreferrer"
						className="flex-1 rounded-lg border border-slate-700 px-3 py-2 text-center text-sm text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-800 hover:text-slate-300"
					>
						Buy Me a Coffee
					</a>
				</div>
			</div>
		</div>
	)
}

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
	const [supportOpen, setSupportOpen] = useState(false)

	return (
		<>
			<SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} />
			<nav className={`flex shrink-0 flex-col border-r border-slate-800 bg-slate-900 transition-all duration-200 ${collapsed ? 'w-14' : 'w-56'}`}>
				<div className="flex items-center justify-between p-4">
					{!collapsed && (
						<div className="flex min-w-0 items-center gap-2">
							<img src="/logo1b.png" alt="" className="h-7 w-7 shrink-0" />
							<h1 className="truncate text-lg font-bold text-white">Hospitality TV</h1>
						</div>
					)}
					{collapsed && <img src="/logo1b.png" alt="" className="mx-auto h-6 w-6" />}
					<button
						onClick={onToggle}
						className={`shrink-0 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white ${collapsed ? 'mx-auto' : ''}`}
						title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
					>
						<svg {...iconProps} width={16} height={16}>
							{collapsed ? <polyline points="9 18 15 12 9 6" /> : <polyline points="15 18 9 12 15 6" />}
						</svg>
					</button>
				</div>
				<ul className="flex-1 space-y-1 overflow-y-auto px-2">
					{navItems.map((item, i) => {
						if (item.type === 'separator') {
							return (
								<li key={`sep-${i}`} className="py-1">
									<div className={`border-t border-slate-800 ${collapsed ? 'mx-1' : 'mx-2'}`} />
								</li>
							)
						}
						return (
							<li key={item.href}>
								<a
									href={item.href}
									className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-800 hover:text-white ${collapsed ? 'justify-center' : ''}`}
									title={collapsed ? item.label : undefined}
								>
									<span className="shrink-0">{item.icon}</span>
									{!collapsed && <span>{item.label}</span>}
								</a>
							</li>
						)
					})}
				</ul>

				{/* Support button */}
				<div className="border-t border-slate-800 px-2 py-2">
					<button
						onClick={() => setSupportOpen(true)}
						className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-800 hover:text-amber-400 ${collapsed ? 'justify-center' : ''}`}
						title={collapsed ? 'Support' : undefined}
					>
						<span className="shrink-0">
							<svg xmlns="http://www.w3.org/2000/svg" width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
								<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
							</svg>
						</span>
						{!collapsed && <span>Support</span>}
					</button>
				</div>
			</nav>
		</>
	)
}
