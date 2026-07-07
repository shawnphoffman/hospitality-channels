'use client'

import type { ClipInfo, ProgramInfoItem, TunarrChannel } from './channels-shared'

interface AddChannelFormProps {
	loadingTunarr: boolean
	tunarrChannels: TunarrChannel[]
	selectedTunarrId: string
	setSelectedTunarrId: (id: string) => void
	bindType: 'program' | 'clip'
	setBindType: (t: 'program' | 'clip') => void
	bindProgramId: string
	setBindProgramId: (id: string) => void
	bindClipId: string
	setBindClipId: (id: string) => void
	addPushMode: 'replace' | 'append'
	setAddPushMode: (m: 'replace' | 'append') => void
	adding: boolean
	clips: ClipInfo[]
	programs: ProgramInfoItem[]
	onRefresh: () => void
	onAdd: () => void
}

export function AddChannelForm({
	loadingTunarr,
	tunarrChannels,
	selectedTunarrId,
	setSelectedTunarrId,
	bindType,
	setBindType,
	bindProgramId,
	setBindProgramId,
	bindClipId,
	setBindClipId,
	addPushMode,
	setAddPushMode,
	adding,
	clips,
	programs,
	onRefresh,
	onAdd,
}: AddChannelFormProps) {
	return (
		<div className="mb-6 space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
			{loadingTunarr ? (
				<p className="text-sm text-slate-400">Loading Tunarr channels...</p>
			) : tunarrChannels.length === 0 ? (
				<div className="flex items-center justify-between">
					<p className="text-sm text-slate-400">No unmanaged Tunarr channels available.</p>
					<button onClick={onRefresh} className="text-xs text-blue-400 hover:text-blue-300">
						Refresh
					</button>
				</div>
			) : (
				<>
					<div>
						<div className="flex items-center justify-between">
							<label className="block text-sm text-slate-400">Tunarr Channel</label>
							<button onClick={onRefresh} className="text-xs text-blue-400 hover:text-blue-300">
								Refresh
							</button>
						</div>
						<select
							value={selectedTunarrId}
							onChange={e => setSelectedTunarrId(e.target.value)}
							className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
						>
							{tunarrChannels.map(c => (
								<option key={c.id} value={c.id}>
									{c.number}. {c.name}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm text-slate-400">Bind to (optional)</label>
						<div className="mt-1 flex gap-1 rounded-lg border border-slate-700 bg-slate-800 p-0.5 mb-2">
							<button
								type="button"
								onClick={() => {
									setBindType('program')
									setBindClipId('')
								}}
								className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${bindType === 'program' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
							>
								Program
							</button>
							<button
								type="button"
								onClick={() => {
									setBindType('clip')
									setBindProgramId('')
								}}
								className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${bindType === 'clip' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-300'}`}
							>
								Clip (legacy)
							</button>
						</div>
						{bindType === 'program' ? (
							<select
								value={bindProgramId}
								onChange={e => setBindProgramId(e.target.value)}
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
								value={bindClipId}
								onChange={e => setBindClipId(e.target.value)}
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
						<label className="block text-sm text-slate-400">Default Push Mode</label>
						<div className="mt-1 flex gap-4">
							<label className="flex items-center gap-2 text-sm text-slate-300">
								<input
									type="radio"
									checked={addPushMode === 'replace'}
									onChange={() => setAddPushMode('replace')}
									className="accent-blue-500"
								/>
								Replace
							</label>
							<label className="flex items-center gap-2 text-sm text-slate-300">
								<input
									type="radio"
									checked={addPushMode === 'append'}
									onChange={() => setAddPushMode('append')}
									className="accent-blue-500"
								/>
								Append
							</label>
						</div>
					</div>
					<button
						onClick={onAdd}
						disabled={adding || !selectedTunarrId}
						className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
					>
						{adding ? 'Adding...' : 'Add Channel'}
					</button>
				</>
			)}
		</div>
	)
}
