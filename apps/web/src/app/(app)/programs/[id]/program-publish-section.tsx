'use client'

import type { JobData } from './program-editor-shared'

interface ProgramPublishSectionProps {
	profiles: { id: string; name: string; exportPath: string; fileNamingPattern: string | null }[]
	renderJob: JobData | null
	rendering: boolean
	renderingProfileId: string | null
	saving: boolean
	clipCount: number
	onSaveAndPublish: (profileId: string) => void
}

export function ProgramPublishSection({
	profiles,
	renderJob,
	rendering,
	renderingProfileId,
	saving,
	clipCount,
	onSaveAndPublish,
}: ProgramPublishSectionProps) {
	return (
		<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h3 className="mb-3 text-sm font-semibold text-slate-300">Publish</h3>

			{/* Job status */}
			{renderJob && (
				<div
					className={`mb-3 rounded-lg border px-4 py-3 text-sm ${
						renderJob.status === 'completed'
							? 'border-green-800 bg-green-950 text-green-300'
							: renderJob.status === 'failed'
								? 'border-red-800 bg-red-950 text-red-300'
								: 'border-blue-800 bg-blue-950 text-blue-300'
					}`}
				>
					{renderJob.status === 'queued' && 'Render & publish job queued...'}
					{renderJob.status === 'processing' && 'Rendering and publishing... This may take a few minutes.'}
					{renderJob.status === 'completed' && (
						<span>
							Rendered and published!
							{renderJob.outputPath && <span className="ml-2 text-xs text-green-400">{renderJob.outputPath}</span>}
						</span>
					)}
					{renderJob.status === 'failed' && <>Failed{renderJob.error ? `: ${renderJob.error}` : ''}</>}
				</div>
			)}

			<div className="space-y-2">
				{profiles.map(p => (
					<div key={p.id} className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-800 p-3 md:flex-row md:items-center">
						<div className="min-w-0 flex-1">
							<p className="text-sm font-medium text-white">{p.name}</p>
							<p className="mt-0.5 text-xs text-slate-400">
								{p.exportPath}
								{p.fileNamingPattern && <span className="text-slate-500"> &middot; {p.fileNamingPattern}</span>}
							</p>
						</div>
						<button
							onClick={() => onSaveAndPublish(p.id)}
							disabled={saving || rendering || clipCount === 0}
							className="w-full shrink-0 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 md:w-auto"
						>
							{rendering && renderingProfileId === p.id ? 'Working...' : 'Save & Publish'}
						</button>
					</div>
				))}
			</div>
		</section>
	)
}
