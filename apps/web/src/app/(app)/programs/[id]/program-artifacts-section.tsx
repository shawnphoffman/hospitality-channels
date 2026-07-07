'use client'

import type { ArtifactData, TunarrChannel } from './program-editor-shared'

interface ProgramArtifactsSectionProps {
	artifacts: ArtifactData[]
	tunarrConfigured?: boolean
	isInTunarrPath: (outputPath: string) => boolean
	pushingArtifactId: string | null
	onOpenPush: (artifactId: string) => void
	loadingChannels: boolean
	tunarrChannels: TunarrChannel[]
	selectedChannelId: string
	onSelectedChannelIdChange: (id: string) => void
	pushMode: 'append' | 'replace'
	onPushModeChange: (mode: 'append' | 'replace') => void
	pushing: boolean
	onPush: () => void
	pushResult: { ok: boolean; message: string } | null
}

export function ProgramArtifactsSection({
	artifacts,
	tunarrConfigured,
	isInTunarrPath,
	pushingArtifactId,
	onOpenPush,
	loadingChannels,
	tunarrChannels,
	selectedChannelId,
	onSelectedChannelIdChange,
	pushMode,
	onPushModeChange,
	pushing,
	onPush,
	pushResult,
}: ProgramArtifactsSectionProps) {
	return (
		<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h3 className="mb-3 text-sm font-semibold text-slate-300">Published Artifacts</h3>
			<div className="space-y-2">
				{artifacts.map(a => {
					const showTunarrPush = tunarrConfigured && a.status === 'published' && isInTunarrPath(a.outputPath) && !a.superseded
					return (
						<div
							key={a.id}
							className={`rounded-lg border p-3 ${a.superseded ? 'border-slate-800 bg-slate-800/50 opacity-60' : 'border-slate-700 bg-slate-800'}`}
						>
							<div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										{a.superseded ? (
											<span className="inline-block rounded-full bg-slate-700 px-2 py-0.5 text-xs font-medium text-slate-500">
												superseded
											</span>
										) : (
											<span
												className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
													a.status === 'published' ? 'bg-green-900 text-green-300' : 'bg-slate-700 text-slate-400'
												}`}
											>
												{a.status}
											</span>
										)}
										<span className="text-xs text-slate-400">
											{a.profileName} &middot; {a.durationSec}s{a.publishedAt && <> &middot; {new Date(a.publishedAt).toLocaleString()}</>}
										</span>
									</div>
									<p className="mt-0.5 truncate text-xs text-slate-500">{a.outputPath}</p>
								</div>
								<div className="flex gap-2">
									{a.allowDownload && a.status === 'published' && !a.superseded && (
										<a
											href={`/api/artifacts/${a.id}/download`}
											download
											className="inline-flex items-center gap-1 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800"
										>
											<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3"
												/>
											</svg>
											Download
										</a>
									)}
									{showTunarrPush && (
										<button
											onClick={() => onOpenPush(a.id)}
											className={`w-full rounded-lg px-3 py-1.5 text-xs font-medium transition-colors md:w-auto ${
												pushingArtifactId === a.id
													? 'bg-purple-600 text-white'
													: 'border border-purple-700 text-purple-400 hover:bg-purple-950'
											}`}
										>
											Push to Tunarr
										</button>
									)}
								</div>
							</div>

							{/* Tunarr push panel */}
							{pushingArtifactId === a.id && (
								<div className="mt-3 rounded-lg border border-purple-800 bg-purple-950/30 p-3">
									{loadingChannels ? (
										<p className="text-sm text-slate-400">Loading channels...</p>
									) : tunarrChannels.length === 0 ? (
										<p className="text-sm text-slate-400">No Tunarr channels found.</p>
									) : (
										<div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
											<select
												value={selectedChannelId}
												onChange={e => onSelectedChannelIdChange(e.target.value)}
												className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-purple-500 focus:outline-none md:w-auto"
											>
												{tunarrChannels.map(ch => (
													<option key={ch.id} value={ch.id}>
														{ch.number}. {ch.name}
													</option>
												))}
											</select>
											<div className="flex gap-4">
												<label className="flex items-center gap-2 text-sm text-slate-300">
													<input
														type="radio"
														name={`push-mode-${a.id}`}
														checked={pushMode === 'append'}
														onChange={() => onPushModeChange('append')}
														className="accent-purple-500"
													/>
													Add
												</label>
												<label className="flex items-center gap-2 text-sm text-slate-300">
													<input
														type="radio"
														name={`push-mode-${a.id}`}
														checked={pushMode === 'replace'}
														onChange={() => onPushModeChange('replace')}
														className="accent-purple-500"
													/>
													Replace
												</label>
											</div>
											<button
												onClick={onPush}
												disabled={pushing}
												className="w-full rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-50 md:w-auto"
											>
												{pushing ? 'Pushing...' : 'Push'}
											</button>
											{pushResult && (
												<span className={`text-sm ${pushResult.ok ? 'text-green-400' : 'text-red-400'}`}>{pushResult.message}</span>
											)}
										</div>
									)}
								</div>
							)}
						</div>
					)
				})}
			</div>
		</section>
	)
}
