'use client'

import { TagChip } from '@/components/tags/tag-chip'
import { formatDuration, type ChannelDef, type ClipInfo, type ProgramInfo, type ProgramInfoItem } from './channels-shared'

interface ChannelCardProps {
	ch: ChannelDef
	clips: ClipInfo[]
	programs: ProgramInfoItem[]
	editing: boolean
	editBindType: 'program' | 'clip'
	setEditBindType: (t: 'program' | 'clip') => void
	editProgramId: string
	setEditProgramId: (id: string) => void
	editClipId: string
	setEditClipId: (id: string) => void
	editPushMode: 'replace' | 'append'
	setEditPushMode: (m: 'replace' | 'append') => void
	onStartEdit: () => void
	onCancelEdit: () => void
	onSaveEdit: () => void
	expanded: boolean
	programming: ProgramInfo[] | undefined
	loadingProgramming: boolean
	onToggleProgramming: () => void
	onRefreshProgramming: () => void
	pushing: boolean
	pushResult: { ok: boolean; message: string } | null
	onPush: () => void
	onToggleEnabled: () => void
	onRemove: () => void
}

export function ChannelCard({
	ch,
	clips,
	programs,
	editing,
	editBindType,
	setEditBindType,
	editProgramId,
	setEditProgramId,
	editClipId,
	setEditClipId,
	editPushMode,
	setEditPushMode,
	onStartEdit,
	onCancelEdit,
	onSaveEdit,
	expanded,
	programming,
	loadingProgramming,
	onToggleProgramming,
	onRefreshProgramming,
	pushing,
	pushResult,
	onPush,
	onToggleEnabled,
	onRemove,
}: ChannelCardProps) {
	return (
		<div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
			{/* Channel info */}
			<div className="flex flex-wrap items-center gap-2">
				<span className="text-sm font-mono text-slate-500">{ch.channelNumber}.</span>
				<p className="font-medium text-white">{ch.channelName}</p>
				<span
					className={`rounded-full px-2 py-0.5 text-xs font-medium ${
						ch.pushMode === 'append' ? 'bg-blue-900 text-blue-300' : 'bg-amber-900 text-amber-300'
					}`}
				>
					{ch.pushMode}
				</span>
				{!ch.enabled && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-500">disabled</span>}
			</div>
			<p className="mt-1 text-xs text-slate-400">
				{ch.programTitle ? (
					`Bound to program: ${ch.programTitle}`
				) : ch.clipTitle ? (
					<>
						<span className="text-amber-400">(legacy)</span> Bound to clip: {ch.clipTitle}
					</>
				) : (
					'Unbound'
				)}
				{ch.latestArtifact && (
					<span className="ml-2 text-slate-500">
						&middot; Last published{' '}
						{ch.latestArtifact.publishedAt ? new Date(ch.latestArtifact.publishedAt).toLocaleDateString() : 'unknown'}
					</span>
				)}
			</p>
			{ch.programTags && ch.programTags.length > 0 && (
				<div className="mt-1.5 flex flex-wrap gap-1.5">
					{ch.programTags.map(t => (
						<TagChip key={t} name={t} />
					))}
				</div>
			)}
			<p className="mt-1.5 flex items-center gap-1.5 text-xs">
				{(ch.programTitle || ch.clipTitle) && ch.latestArtifact ? (
					<>
						<span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500" />
						<span className="text-green-400">Ready to push</span>
					</>
				) : (ch.programTitle || ch.clipTitle) && !ch.latestArtifact ? (
					<>
						<span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
						<span className="text-amber-400">Awaiting publish</span>
					</>
				) : (
					<>
						<span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-500" />
						<span className="text-slate-500">Not bound - assign a program to enable quick publishing</span>
					</>
				)}
			</p>

			{/* Actions */}
			<div className="mt-3 flex flex-wrap gap-2">
				{ch.latestArtifact && ch.tunarrChannelId && (
					<button
						onClick={onPush}
						disabled={pushing}
						className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-500 disabled:opacity-50"
					>
						{pushing ? 'Pushing...' : 'Push Now'}
					</button>
				)}
				<button
					onClick={onToggleProgramming}
					className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
						expanded ? 'bg-slate-700 text-white' : 'border border-slate-700 text-slate-400 hover:bg-slate-800'
					}`}
				>
					Programming
				</button>
				<button
					onClick={() => (editing ? onCancelEdit() : onStartEdit())}
					className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800"
				>
					{editing ? 'Cancel' : 'Edit'}
				</button>
				<button
					onClick={onToggleEnabled}
					className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
						ch.enabled ? 'border-slate-700 text-slate-400 hover:bg-slate-800' : 'border-green-800 text-green-400 hover:bg-green-950'
					}`}
				>
					{ch.enabled ? 'Disable' : 'Enable'}
				</button>
				<button
					onClick={onRemove}
					className="rounded-lg border border-red-900 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-950"
				>
					Remove
				</button>
			</div>

			{pushResult && <p className={`mt-2 text-sm ${pushResult.ok ? 'text-green-400' : 'text-red-400'}`}>{pushResult.message}</p>}

			{/* Edit panel */}
			{editing && (
				<div className="mt-3 space-y-3 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
					<div>
						<label className="block text-xs text-slate-400">Bind to</label>
						<div className="mt-1 flex gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5 mb-2">
							<button
								type="button"
								onClick={() => {
									setEditBindType('program')
									setEditClipId('')
								}}
								className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${editBindType === 'program' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
							>
								Program
							</button>
							<button
								type="button"
								onClick={() => {
									setEditBindType('clip')
									setEditProgramId('')
								}}
								className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${editBindType === 'clip' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
							>
								Clip (legacy)
							</button>
						</div>
						{editBindType === 'program' ? (
							<select
								value={editProgramId}
								onChange={e => setEditProgramId(e.target.value)}
								className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
							>
								<option value="">None</option>
								{programs.map(p => (
									<option key={p.id} value={p.id}>
										{p.title}
									</option>
								))}
							</select>
						) : (
							<select
								value={editClipId}
								onChange={e => setEditClipId(e.target.value)}
								className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
							>
								<option value="">None</option>
								{clips.map(c => (
									<option key={c.id} value={c.id}>
										{c.title}
									</option>
								))}
							</select>
						)}
					</div>
					<div>
						<label className="block text-xs text-slate-400">Push Mode</label>
						<div className="mt-1 flex gap-4">
							<label className="flex items-center gap-2 text-sm text-slate-300">
								<input
									type="radio"
									checked={editPushMode === 'replace'}
									onChange={() => setEditPushMode('replace')}
									className="accent-blue-500"
								/>
								Replace
							</label>
							<label className="flex items-center gap-2 text-sm text-slate-300">
								<input
									type="radio"
									checked={editPushMode === 'append'}
									onChange={() => setEditPushMode('append')}
									className="accent-blue-500"
								/>
								Append
							</label>
						</div>
					</div>
					<button
						onClick={onSaveEdit}
						className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
					>
						Save
					</button>
				</div>
			)}

			{/* Programming panel */}
			{expanded && (
				<div className="mt-3 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
					<div className="mb-2 flex items-center justify-between">
						<span className="text-xs font-medium text-slate-400">Channel Programming</span>
						<button
							onClick={onRefreshProgramming}
							disabled={loadingProgramming}
							className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
						>
							{loadingProgramming ? 'Loading...' : 'Refresh'}
						</button>
					</div>
					{loadingProgramming ? (
						<p className="text-sm text-slate-400">Loading programming...</p>
					) : programming && programming.length > 0 ? (
						<>
							<p className="mb-2 text-xs text-slate-500">
								{programming.length} program{programming.length !== 1 ? 's' : ''} &middot; Total{' '}
								{formatDuration(programming.reduce((sum, p) => sum + p.duration, 0))}
							</p>
							<div className="space-y-1">
								{programming.map((p, i) => (
									<div key={i} className="flex items-center justify-between text-sm">
										<span className="text-slate-300">{p.title}</span>
										<span className="text-xs text-slate-500">{formatDuration(p.duration)}</span>
									</div>
								))}
							</div>
						</>
					) : (
						<p className="text-sm text-slate-400">No programming found for this channel.</p>
					)}
				</div>
			)}
		</div>
	)
}
