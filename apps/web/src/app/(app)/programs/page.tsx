export const dynamic = 'force-dynamic'

import { getDb, schema } from '@/db'

export default async function ProgramsListPage() {
	const db = await getDb()
	const allPrograms = await db.select().from(schema.programs)
	const allProgramClips = await db.select().from(schema.programClips)
	const allAudioTracks = await db.select().from(schema.programAudioTracks)

	const programsWithDetails = allPrograms.map(p => {
		const clips = allProgramClips.filter(pc => pc.programId === p.id)
		const tracks = allAudioTracks.filter(t => t.programId === p.id)
		const audioDuration = tracks.reduce((sum, t) => sum + (t.durationSec ?? 0), 0)
		const computedDuration = p.durationMode === 'manual' ? (p.manualDurationSec ?? 0) : audioDuration
		return {
			...p,
			clipCount: clips.length,
			audioTrackCount: tracks.length,
			computedDuration,
		}
	})

	function formatDuration(sec: number): string {
		if (sec <= 0) return '—'
		const m = Math.floor(sec / 60)
		const s = Math.round(sec % 60)
		return `${m}:${s.toString().padStart(2, '0')}`
	}

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-2xl font-bold text-white">Programs</h2>
				<a
					href="/programs/new"
					className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
				>
					New Program
				</a>
			</div>
			{programsWithDetails.length === 0 ? (
				<div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
					<p className="text-slate-400">No programs yet. Create one to compose clips together.</p>
					<a
						href="/programs/new"
						className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500"
					>
						Create Program
					</a>
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{programsWithDetails.map(program => (
						<a
							key={program.id}
							href={`/programs/${program.id}`}
							className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-slate-700"
						>
							<h3 className="font-semibold text-white">{program.title}</h3>
							<p className="mt-1 text-xs text-slate-400">{program.slug}</p>
							<div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
								<span>{program.clipCount} clip{program.clipCount !== 1 ? 's' : ''}</span>
								<span>{program.audioTrackCount} track{program.audioTrackCount !== 1 ? 's' : ''}</span>
								<span>{formatDuration(program.computedDuration)}</span>
							</div>
							{program.description && (
								<p className="mt-2 line-clamp-2 text-xs text-slate-400">{program.description}</p>
							)}
						</a>
					))}
				</div>
			)}
		</div>
	)
}
