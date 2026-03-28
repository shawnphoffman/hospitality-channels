export const dynamic = 'force-dynamic'

import { getDb, schema } from '@/db'

const EMOJI_RE = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u

function emojiFirstSort(a: string, b: string): number {
	const aEmoji = EMOJI_RE.test(a)
	const bEmoji = EMOJI_RE.test(b)
	if (aEmoji && !bEmoji) return -1
	if (!aEmoji && bEmoji) return 1
	return a.localeCompare(b)
}

function formatDate(dateStr: string | null | undefined): string {
	if (!dateStr) return ''
	try {
		const d = new Date(dateStr)
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
	} catch {
		return ''
	}
}

export default async function ClipsListPage() {
	const db = await getDb()
	const allClips = await db.select().from(schema.clips)
	const allTemplates = await db.select().from(schema.templates)
	const allAssets = await db.select().from(schema.assets)

	// Build a lookup from original asset path to derived (thumbnail) path
	const thumbnailByPath = new Map<string, string>()
	for (const asset of allAssets) {
		if (asset.derivedPath) {
			thumbnailByPath.set(asset.originalPath, asset.derivedPath)
		}
	}

	const clipsWithDetails = allClips
		.map(clip => {
			const template = allTemplates.find(t => t.id === clip.templateId)
			const data = clip.dataJson as Record<string, unknown> | null
			const bgVideoUrl = (data?.backgroundVideoUrl as string) ?? ''
			// Extract original path from serve URL: /api/assets/serve?path=...
			const pathMatch = bgVideoUrl.match(/[?&]path=([^&]+)/)
			const originalPath = pathMatch ? decodeURIComponent(pathMatch[1]) : ''
			const thumbnailPath = originalPath ? thumbnailByPath.get(originalPath) : undefined
			const bgImageUrl = (data?.backgroundImageUrl as string) ?? ''
			return { ...clip, templateName: template?.name ?? 'Unknown', thumbnailPath, bgImageUrl }
		})
		.sort((a, b) => emojiFirstSort(a.title, b.title))

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold text-white">Clips</h2>
					<p className="mt-1 text-sm text-slate-500">Individual template scenes with customized content</p>
				</div>
				<a
					href="/clips/new"
					className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
				>
					New Clip
				</a>
			</div>
			{clipsWithDetails.length === 0 ? (
				<div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
					<p className="text-slate-400">No clips yet. Create one from a template.</p>
					<a
						href="/clips/new"
						className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500"
					>
						Create Clip
					</a>
				</div>
			) : (
				<div className="space-y-3">
					{clipsWithDetails.map(clip => (
						<a
							key={clip.id}
							href={`/clips/${clip.id}`}
							className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-700"
						>
							<div className="min-w-0 flex-1">
								<h3 className="font-semibold text-white">{clip.title}</h3>
								<p className="mt-0.5 text-xs text-slate-400">
									{clip.templateName} &middot; {clip.slug}
								</p>
								<p className="mt-1 text-xs text-slate-500">
									Created {formatDate(clip.createdAt)}
									{clip.updatedAt && clip.updatedAt !== clip.createdAt && <> &middot; Modified {formatDate(clip.updatedAt)}</>}
								</p>
							</div>
							<div className="h-[54px] w-24 shrink-0 overflow-hidden rounded bg-slate-950">
								{clip.thumbnailPath ? (
									/* eslint-disable-next-line @next/next/no-img-element */
									<img
										src={`/api/assets/serve?path=${encodeURIComponent(clip.thumbnailPath)}`}
										alt=""
										className="h-full w-full object-cover"
									/>
								) : clip.bgImageUrl ? (
									/* eslint-disable-next-line @next/next/no-img-element */
									<img src={clip.bgImageUrl} alt="" className="h-full w-full object-cover" />
								) : (
									<iframe
										src={`/clips/${clip.id}/render`}
										className="pointer-events-none"
										style={{ width: 1920, height: 1080, transform: 'scale(0.05)', transformOrigin: 'top left' }}
										tabIndex={-1}
									/>
								)}
							</div>
						</a>
					))}
				</div>
			)}
		</div>
	)
}
