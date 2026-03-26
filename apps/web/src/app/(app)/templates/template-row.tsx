'use client'

import { getTemplateScenes } from '@/templates/registry'

interface TemplateRowProps {
	slug: string
	name: string
	description: string
}

export function TemplateRow({ slug, name, description }: TemplateRowProps) {
	const entry = getTemplateScenes(slug)
	const Scene = entry?.scene

	return (
		<div className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
			{/* Preview thumbnail */}
			<div className="h-[54px] w-24 shrink-0 overflow-hidden rounded bg-slate-950">
				{Scene && (
					<div style={{ width: 1920, height: 1080, transform: 'scale(0.05)', transformOrigin: 'top left' }}>
						<Scene data={{}} />
					</div>
				)}
			</div>
			<div className="min-w-0 flex-1">
				<p className="font-medium text-white">{name}</p>
				{description && <p className="mt-0.5 text-sm text-slate-400">{description}</p>}
			</div>
			<a
				href={`/clips/new?template=${slug}`}
				className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
			>
				Use Template
			</a>
		</div>
	)
}
