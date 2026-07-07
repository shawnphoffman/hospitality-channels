'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { formatDuration, type ProgramClip } from './program-editor-shared'

interface ClipSequenceEditorProps {
	programId: string
	clips: ProgramClip[]
	setClips: Dispatch<SetStateAction<ProgramClip[]>>
	availableClips: { id: string; title: string }[]
	perClipDuration: number
}

export function ClipSequenceEditor({ programId, clips, setClips, availableClips, perClipDuration }: ClipSequenceEditorProps) {
	const router = useRouter()

	// Add clip state
	const [addClipId, setAddClipId] = useState('')

	const handleAddClip = async () => {
		if (!addClipId) return
		try {
			const res = await fetch(`/api/programs/${programId}/clips`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ clipId: addClipId }),
			})
			if (res.ok) {
				setAddClipId('')
				router.refresh()
				const listRes = await fetch(`/api/programs/${programId}`)
				if (listRes.ok) {
					const data = await listRes.json()
					setClips(
						data.clips?.map((c: { id: string; clipId: string; position: number; clip: { title: string; templateId: string } | null }) => ({
							programClipId: c.id,
							clipId: c.clipId,
							position: c.position,
							title: c.clip?.title ?? 'Unknown',
							templateName: '',
						})) ?? []
					)
				}
			}
		} catch {
			/* empty */
		}
	}

	const handleRemoveClip = async (clipId: string) => {
		await fetch(`/api/programs/${programId}/clips/${clipId}`, { method: 'DELETE' })
		setClips(prev => prev.filter(c => c.clipId !== clipId))
	}

	const handleMoveClip = async (index: number, direction: -1 | 1) => {
		const newIndex = index + direction
		if (newIndex < 0 || newIndex >= clips.length) return
		const updated = [...clips]
		const temp = updated[index]
		updated[index] = updated[newIndex]
		updated[newIndex] = temp
		const reordered = updated.map((c, i) => ({ ...c, position: i }))
		setClips(reordered)
		await fetch(`/api/programs/${programId}/clips`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(reordered.map(c => ({ clipId: c.clipId, position: c.position }))),
		})
	}

	return (
		<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h3 className="mb-3 text-sm font-semibold text-slate-300">Clips ({clips.length})</h3>

			{clips.length === 0 ? (
				<p className="text-sm text-slate-500">No clips added yet.</p>
			) : (
				<div className="space-y-2">
					{clips.map((clip, i) => (
						<div key={clip.programClipId} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2">
							<div className="h-12 w-20 shrink-0 overflow-hidden rounded bg-slate-900">
								<iframe
									src={`/clips/${clip.clipId}/render`}
									className="pointer-events-none"
									style={{ width: 1920, height: 1080, transform: 'scale(0.0417)', transformOrigin: 'top left' }}
									tabIndex={-1}
								/>
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-white">{clip.title}</p>
								<p className="text-xs text-slate-500">
									{clip.templateName}
									{perClipDuration > 0 ? (
										<> &middot; {formatDuration(perClipDuration)}</>
									) : (
										<span className="ml-1 text-amber-400"> &middot; duration not set</span>
									)}
								</p>
							</div>
							<div className="flex shrink-0 items-center gap-1">
								<button
									onClick={() => handleMoveClip(i, -1)}
									disabled={i === 0}
									className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30"
									title="Move up"
								>
									<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
										<polyline points="18 15 12 9 6 15" />
									</svg>
								</button>
								<button
									onClick={() => handleMoveClip(i, 1)}
									disabled={i === clips.length - 1}
									className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30"
									title="Move down"
								>
									<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
										<polyline points="6 9 12 15 18 9" />
									</svg>
								</button>
								<button
									onClick={() => handleRemoveClip(clip.clipId)}
									className="rounded p-1 text-red-400 hover:bg-red-950 hover:text-red-300"
									title="Remove"
								>
									<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
										<line x1="18" y1="6" x2="6" y2="18" />
										<line x1="6" y1="6" x2="18" y2="18" />
									</svg>
								</button>
							</div>
						</div>
					))}
				</div>
			)}

			<div className="mt-3 flex gap-2">
				<select
					value={addClipId}
					onChange={e => setAddClipId(e.target.value)}
					className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
				>
					<option value="">Add a clip...</option>
					{availableClips.map(c => (
						<option key={c.id} value={c.id}>
							{c.title}
						</option>
					))}
				</select>
				<button
					onClick={handleAddClip}
					disabled={!addClipId}
					className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
				>
					Add
				</button>
			</div>
		</section>
	)
}
