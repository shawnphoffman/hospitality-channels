export const dynamic = 'force-dynamic'

import { getDb, schema } from '@/db'
import { count, desc, eq, isNotNull } from 'drizzle-orm'
import Link from 'next/link'

function formatDuration(sec: number): string {
	if (sec <= 0) return '—'
	const m = Math.floor(sec / 60)
	const s = Math.round(sec % 60)
	return `${m}:${s.toString().padStart(2, '0')}`
}

function timeAgo(dateStr: string): string {
	const date = new Date(dateStr)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffMin = Math.floor(diffMs / 60000)
	if (diffMin < 1) return 'just now'
	if (diffMin < 60) return `${diffMin}m ago`
	const diffHrs = Math.floor(diffMin / 60)
	if (diffHrs < 24) return `${diffHrs}h ago`
	const diffDays = Math.floor(diffHrs / 24)
	if (diffDays < 30) return `${diffDays}d ago`
	return date.toLocaleDateString()
}

export default async function DashboardPage() {
	const db = await getDb()

	const [
		[clipsCount],
		[programsCount],
		[channelsCount],
		[artifactsCount],
		[audioCount],
		[imageCount],
		allPrograms,
		allProgramClips,
		allAudioTracks,
		recentArtifacts,
		recentJobs,
		channels,
		allClips,
		profiles,
		[tunarrSetting],
	] = await Promise.all([
		db.select({ value: count() }).from(schema.clips),
		db.select({ value: count() }).from(schema.programs),
		db.select({ value: count() }).from(schema.channelDefinitions),
		db.select({ value: count() }).from(schema.publishedArtifacts),
		db.select({ value: count() }).from(schema.assets).where(eq(schema.assets.type, 'audio')),
		db.select({ value: count() }).from(schema.assets).where(eq(schema.assets.type, 'photo')),
		db.select().from(schema.programs),
		db.select().from(schema.programClips),
		db.select().from(schema.programAudioTracks),
		db.select().from(schema.publishedArtifacts).orderBy(desc(schema.publishedArtifacts.publishedAt)).limit(5),
		db.select().from(schema.jobs).orderBy(desc(schema.jobs.createdAt)).limit(5),
		db.select().from(schema.channelDefinitions).where(eq(schema.channelDefinitions.enabled, true)),
		db.select().from(schema.clips),
		db.select().from(schema.publishProfiles),
		db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_url')).limit(1),
	])

	const tunarrConfigured = !!tunarrSetting?.value

	// Enrich programs
	const programsWithDetails = allPrograms
		.map(p => {
			const clips = allProgramClips.filter(pc => pc.programId === p.id)
			const tracks = allAudioTracks.filter(t => t.programId === p.id)
			const audioDuration = tracks.reduce((sum, t) => sum + (t.durationSec ?? 0), 0)
			const computedDuration = p.durationMode === 'manual' ? (p.manualDurationSec ?? 0) : audioDuration
			return { ...p, clipCount: clips.length, computedDuration }
		})
		.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
		.slice(0, 4)

	// Enrich recent artifacts
	const enrichedArtifacts = recentArtifacts.map(a => {
		const program = a.programId ? allPrograms.find(p => p.id === a.programId) : null
		const clip = a.clipId ? allClips.find(c => c.id === a.clipId) : null
		const profile = profiles.find(p => p.id === a.publishProfileId)
		return {
			...a,
			label: program?.title ?? clip?.title ?? 'Unknown',
			profileName: profile?.name ?? 'Unknown',
		}
	})

	// Active channels
	const enrichedChannels = channels
		.sort((a, b) => a.channelNumber - b.channelNumber)
		.slice(0, 6)
		.map(ch => {
			const program = ch.programId ? allPrograms.find(p => p.id === ch.programId) : null
			const clip = ch.clipId ? allClips.find(c => c.id === ch.clipId) : null
			return { ...ch, boundTo: program?.title ?? clip?.title ?? null }
		})

	return (
		<div className="space-y-6 sm:space-y-8">
			<div>
				<h2 className="text-xl font-bold text-white sm:text-2xl">Dashboard</h2>
				<p className="mt-1 text-sm text-slate-500">Overview of your hospitality TV system</p>
			</div>

			{/* Stats Row */}
			<div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-6">
				<StatCard
					href="/programs"
					label="Programs"
					value={programsCount.value}
					icon={
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
							<rect x="2" y="2" width="20" height="20" rx="2" />
							<line x1="7" y1="2" x2="7" y2="22" />
							<line x1="2" y1="12" x2="22" y2="12" />
						</svg>
					}
					color="blue"
				/>
				<StatCard
					href="/clips"
					label="Clips"
					value={clipsCount.value}
					icon={
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
							<polyline points="14 2 14 8 20 8" />
						</svg>
					}
					color="indigo"
				/>
				<StatCard
					href="/channels"
					label="Channels"
					value={channelsCount.value}
					icon={
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
							<rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
							<polyline points="17 2 12 7 7 2" />
						</svg>
					}
					color="purple"
				/>
				<StatCard
					href="/publish"
					label="Artifacts"
					value={artifactsCount.value}
					icon={
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
							<polyline points="21 8 21 21 3 21 3 8" />
							<rect x="1" y="3" width="22" height="5" />
						</svg>
					}
					color="emerald"
				/>
				<StatCard
					href="/images"
					label="Images"
					value={imageCount.value}
					icon={
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
							<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
							<circle cx="8.5" cy="8.5" r="1.5" />
							<polyline points="21 15 16 10 5 21" />
						</svg>
					}
					color="amber"
				/>
				<StatCard
					href="/audio"
					label="Audio"
					value={audioCount.value}
					icon={
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
							<path d="M9 18V5l12-3v13" />
							<circle cx="6" cy="18" r="3" />
							<circle cx="18" cy="15" r="3" />
						</svg>
					}
					color="rose"
				/>
			</div>

			{/* Main Grid */}
			<div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
				{/* Programs */}
				<section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
					<div className="mb-4 flex items-center justify-between">
						<h3 className="font-semibold text-white">Programs</h3>
						<Link href="/programs" className="text-xs text-slate-400 hover:text-white">
							View all
						</Link>
					</div>
					{programsWithDetails.length === 0 ? (
						<div className="rounded-lg border border-dashed border-slate-700 py-8 text-center">
							<p className="text-sm text-slate-500">No programs yet</p>
							<Link href="/programs/new" className="mt-2 inline-block text-sm text-blue-400 hover:text-blue-300">
								Create your first program
							</Link>
						</div>
					) : (
						<div className="space-y-2">
							{programsWithDetails.map(p => (
								<Link
									key={p.id}
									href={`/programs/${p.id}`}
									className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/40 p-3 transition-colors hover:border-slate-700 hover:bg-slate-800/70"
								>
									<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
										<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
											<polygon points="5 3 19 12 5 21 5 3" />
										</svg>
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-white">{p.title}</p>
										<p className="text-xs text-slate-500">
											{p.clipCount} clip{p.clipCount !== 1 ? 's' : ''} &middot; {formatDuration(p.computedDuration)}
										</p>
									</div>
									<span className="shrink-0 text-xs text-slate-600">{timeAgo(p.updatedAt)}</span>
								</Link>
							))}
						</div>
					)}
				</section>

				{/* Active Channels */}
				<section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
					<div className="mb-4 flex items-center justify-between">
						<div className="flex items-center gap-2">
							<h3 className="font-semibold text-white">Active Channels</h3>
							{tunarrConfigured ? (
								<span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
									Tunarr connected
								</span>
							) : (
								<span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
									Tunarr not configured
								</span>
							)}
						</div>
						<Link href="/channels" className="text-xs text-slate-400 hover:text-white">
							View all
						</Link>
					</div>
					{enrichedChannels.length === 0 ? (
						<div className="rounded-lg border border-dashed border-slate-700 py-8 text-center">
							<p className="text-sm text-slate-500">No active channels</p>
							<Link href="/channels" className="mt-2 inline-block text-sm text-blue-400 hover:text-blue-300">
								Set up channels
							</Link>
						</div>
					) : (
						<div className="space-y-2">
							{enrichedChannels.map(ch => (
								<Link
									key={ch.id}
									href="/channels"
									className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/40 p-3 transition-colors hover:border-slate-700 hover:bg-slate-800/70"
								>
									<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 font-mono text-sm font-bold text-purple-400">
										{ch.channelNumber}
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-white">{ch.channelName}</p>
										{ch.boundTo ? (
											<p className="truncate text-xs text-slate-500">{ch.boundTo}</p>
										) : (
											<p className="text-xs text-amber-500/70">No program bound</p>
										)}
									</div>
									{ch.artifactId && (
										<span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
											Published
										</span>
									)}
								</Link>
							))}
						</div>
					)}
				</section>

				{/* Recent Artifacts */}
				<section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
					<div className="mb-4 flex items-center justify-between">
						<h3 className="font-semibold text-white">Recent Artifacts</h3>
						<Link href="/publish" className="text-xs text-slate-400 hover:text-white">
							View all
						</Link>
					</div>
					{enrichedArtifacts.length === 0 ? (
						<div className="rounded-lg border border-dashed border-slate-700 py-8 text-center">
							<p className="text-sm text-slate-500">No published artifacts yet</p>
						</div>
					) : (
						<div className="space-y-2">
							{enrichedArtifacts.map(a => (
								<div key={a.id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/40 p-3">
									<div
										className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${a.status === 'published' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}
									>
										<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
											{a.status === 'published' ? (
												<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
											) : (
												<circle cx="12" cy="12" r="10" />
											)}
										</svg>
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-white">{a.label}</p>
										<p className="truncate text-xs text-slate-500">
											{a.profileName} &middot; {formatDuration(a.durationSec)}
										</p>
									</div>
									{a.publishedAt && <span className="shrink-0 text-xs text-slate-600">{timeAgo(a.publishedAt)}</span>}
								</div>
							))}
						</div>
					)}
				</section>

				{/* Recent Jobs */}
				<section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
					<div className="mb-4 flex items-center justify-between">
						<h3 className="font-semibold text-white">Recent Jobs</h3>
					</div>
					{recentJobs.length === 0 ? (
						<div className="rounded-lg border border-dashed border-slate-700 py-8 text-center">
							<p className="text-sm text-slate-500">No jobs yet</p>
						</div>
					) : (
						<div className="space-y-2">
							{recentJobs.map(job => {
								const clip = job.clipId ? allClips.find(c => c.id === job.clipId) : null
								const program = job.programId ? allPrograms.find(p => p.id === job.programId) : null
								return (
									<div key={job.id} className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/40 p-3">
										<JobStatusIcon status={job.status} />
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium text-white">{program?.title ?? clip?.title ?? job.type}</p>
											<p className="text-xs text-slate-500">
												{job.type.replace(/-/g, ' ')}
												{job.error && <span className="ml-1 text-red-400">&middot; {job.error}</span>}
											</p>
										</div>
										<span className="shrink-0 text-xs text-slate-600">{timeAgo(job.createdAt)}</span>
									</div>
								)
							})}
						</div>
					)}
				</section>
			</div>

			{/* Quick Actions */}
			<section>
				<h3 className="mb-3 text-sm font-medium text-slate-400">Quick Actions</h3>
				<div className="flex flex-wrap gap-3">
					<Link
						href="/programs/new"
						className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
					>
						New Program
					</Link>
					<Link
						href="/clips/new"
						className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
					>
						New Clip
					</Link>
					<Link
						href="/channels"
						className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
					>
						Manage Channels
					</Link>
					<Link
						href="/publish"
						className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
					>
						View Artifacts
					</Link>
				</div>
			</section>
		</div>
	)
}

function StatCard({
	href,
	label,
	value,
	icon,
	color,
}: {
	href: string
	label: string
	value: number
	icon: React.ReactNode
	color: 'blue' | 'indigo' | 'purple' | 'emerald' | 'amber' | 'rose'
}) {
	const colorMap = {
		blue: 'bg-blue-500/10 text-blue-400',
		indigo: 'bg-indigo-500/10 text-indigo-400',
		purple: 'bg-purple-500/10 text-purple-400',
		emerald: 'bg-emerald-500/10 text-emerald-400',
		amber: 'bg-amber-500/10 text-amber-400',
		rose: 'bg-rose-500/10 text-rose-400',
	}

	return (
		<Link
			href={href}
			className="group rounded-xl border border-slate-800 bg-slate-900 p-3 transition-colors hover:border-slate-700 hover:bg-slate-800/60 sm:p-4"
		>
			<div className="flex items-center gap-2 sm:gap-3">
				<div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:h-9 sm:w-9 ${colorMap[color]}`}>{icon}</div>
				<div className="min-w-0">
					<p className="text-xl font-bold text-white sm:text-2xl">{value}</p>
					<p className="truncate text-xs text-slate-500 group-hover:text-slate-400">{label}</p>
				</div>
			</div>
		</Link>
	)
}

function JobStatusIcon({ status }: { status: string }) {
	const base = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'
	switch (status) {
		case 'completed':
			return (
				<div className={`${base} bg-emerald-500/10 text-emerald-400`}>
					<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</div>
			)
		case 'failed':
			return (
				<div className={`${base} bg-red-500/10 text-red-400`}>
					<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</div>
			)
		case 'running':
			return (
				<div className={`${base} bg-blue-500/10 text-blue-400`}>
					<svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
				</div>
			)
		default:
			return (
				<div className={`${base} bg-slate-700/50 text-slate-400`}>
					<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
						<circle cx="12" cy="12" r="10" />
						<polyline points="12 6 12 12 16 14" />
					</svg>
				</div>
			)
	}
}
