'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import { formatDuration, type AudioTrack } from './program-editor-shared'

interface AudioTrackManagerProps {
	programId: string
	tracks: AudioTrack[]
	setTracks: Dispatch<SetStateAction<AudioTrack[]>>
	audioAssets: { id: string; filename: string; originalPath: string }[]
}

export function AudioTrackManager({ programId, tracks, setTracks, audioAssets }: AudioTrackManagerProps) {
	// Add audio state
	const [addAudioAssetId, setAddAudioAssetId] = useState('')
	const [addAudioUrl, setAddAudioUrl] = useState('')

	const handleAddAudioTrack = async () => {
		if (!addAudioAssetId && !addAudioUrl) return
		const body: Record<string, unknown> = {}
		if (addAudioAssetId) {
			body.assetId = addAudioAssetId
			body.audioUrl = `/api/assets/serve?path=${encodeURIComponent(audioAssets.find(a => a.id === addAudioAssetId)?.originalPath ?? '')}`
		} else {
			body.audioUrl = addAudioUrl
		}
		try {
			const res = await fetch(`/api/programs/${programId}/audio-tracks`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})
			if (res.ok) {
				const track = await res.json()
				setTracks(prev => [
					...prev,
					{
						id: track.id,
						position: track.position,
						assetId: track.assetId,
						audioUrl: track.audioUrl,
						durationSec: track.durationSec,
						filename: addAudioAssetId ? (audioAssets.find(a => a.id === addAudioAssetId)?.filename ?? 'audio') : addAudioUrl,
					},
				])
				setAddAudioAssetId('')
				setAddAudioUrl('')
			}
		} catch {
			/* empty */
		}
	}

	const handleRemoveTrack = async (trackId: string) => {
		await fetch(`/api/programs/${programId}/audio-tracks/${trackId}`, { method: 'DELETE' })
		setTracks(prev => prev.filter(t => t.id !== trackId))
	}

	const handleMoveTrack = async (index: number, direction: -1 | 1) => {
		const newIndex = index + direction
		if (newIndex < 0 || newIndex >= tracks.length) return
		const updated = [...tracks]
		const temp = updated[index]
		updated[index] = updated[newIndex]
		updated[newIndex] = temp
		const reordered = updated.map((t, i) => ({ ...t, position: i }))
		setTracks(reordered)
		await fetch(`/api/programs/${programId}/audio-tracks`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(reordered.map(t => ({ trackId: t.id, position: t.position }))),
		})
	}

	// Probe assets for missing metadata
	const [probing, setProbing] = useState(false)
	const handleProbeAssets = async () => {
		setProbing(true)
		try {
			const res = await fetch('/api/assets/probe', { method: 'POST' })
			if (res.ok) {
				const tracksRes = await fetch(`/api/programs/${programId}/audio-tracks`)
				if (tracksRes.ok) {
					const enrichedTracks = await tracksRes.json()
					setTracks(
						enrichedTracks.map(
							(t: {
								id: string
								position: number
								assetId: string | null
								audioUrl: string | null
								durationSec: number | null
								asset?: { name?: string; originalPath?: string; derivedPath?: string | null }
							}) => ({
								id: t.id,
								position: t.position,
								assetId: t.assetId,
								audioUrl: t.audioUrl,
								durationSec: t.durationSec,
								filename: t.asset?.name ?? t.asset?.originalPath?.split('/').pop() ?? t.audioUrl ?? 'audio',
								coverArtPath: t.asset?.derivedPath ?? null,
							})
						)
					)
				}
			}
		} catch {
			/* empty */
		} finally {
			setProbing(false)
		}
	}

	return (
		<section className="rounded-xl border border-slate-800 bg-slate-900 p-4">
			<h3 className="mb-3 text-sm font-semibold text-slate-300">Audio Tracks ({tracks.length})</h3>

			{tracks.length === 0 ? (
				<p className="text-sm text-slate-500">No audio tracks added yet.</p>
			) : (
				<div className="space-y-2">
					{tracks.map((track, i) => (
						<div key={track.id} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-2">
							{track.coverArtPath ? (
								/* eslint-disable-next-line @next/next/no-img-element */
								<img
									src={`/api/assets/serve?path=${encodeURIComponent(track.coverArtPath)}`}
									alt=""
									className="h-8 w-8 shrink-0 rounded object-cover"
								/>
							) : (
								<svg className="h-5 w-5 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
									/>
								</svg>
							)}
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm text-white">{track.filename}</p>
								<p className="text-xs">
									{track.durationSec ? (
										<span className="text-slate-500">{formatDuration(track.durationSec)}</span>
									) : (
										<button
											type="button"
											onClick={handleProbeAssets}
											disabled={probing}
											className="text-amber-400 underline decoration-amber-400/40 hover:text-amber-300 disabled:opacity-50"
										>
											{probing ? 'Detecting duration...' : 'Duration unknown - click to detect'}
										</button>
									)}
								</p>
							</div>
							<div className="flex shrink-0 items-center gap-1">
								<button
									onClick={() => handleMoveTrack(i, -1)}
									disabled={i === 0}
									className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30"
									title="Move up"
								>
									<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
										<polyline points="18 15 12 9 6 15" />
									</svg>
								</button>
								<button
									onClick={() => handleMoveTrack(i, 1)}
									disabled={i === tracks.length - 1}
									className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-30"
									title="Move down"
								>
									<svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
										<polyline points="6 9 12 15 18 9" />
									</svg>
								</button>
								<button
									onClick={() => handleRemoveTrack(track.id)}
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

			<div className="mt-3 space-y-2">
				{audioAssets.length > 0 && (
					<div className="flex gap-2">
						<select
							value={addAudioAssetId}
							onChange={e => {
								setAddAudioAssetId(e.target.value)
								if (e.target.value) setAddAudioUrl('')
							}}
							className="min-w-0 flex-1 truncate rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
						>
							<option value="">Select audio asset...</option>
							{audioAssets.map(a => (
								<option key={a.id} value={a.id}>
									{a.filename}
								</option>
							))}
						</select>
						<button
							onClick={handleAddAudioTrack}
							disabled={!addAudioAssetId}
							className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
						>
							Add
						</button>
					</div>
				)}
				<div className="flex gap-2">
					<input
						type="text"
						value={addAudioUrl}
						onChange={e => {
							setAddAudioUrl(e.target.value)
							if (e.target.value) setAddAudioAssetId('')
						}}
						placeholder="Or paste audio URL..."
						className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
					/>
					<button
						onClick={handleAddAudioTrack}
						disabled={!addAudioUrl}
						className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
					>
						Add
					</button>
				</div>
			</div>
		</section>
	)
}
