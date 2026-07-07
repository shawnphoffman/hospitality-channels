export const dynamic = 'force-dynamic'

import { getDb, schema } from '@/db'
import { loadAllEntityTags } from '@/lib/tags'
import { ClipsSplitPane, type ClipListItem } from './clips-split-pane'

export default async function ClipsListPage() {
	const db = await getDb()
	const [allClips, allTemplates, allAssets, allProgramClips, allPrograms, entityTags] = await Promise.all([
		db.select().from(schema.clips),
		db.select({ id: schema.templates.id, name: schema.templates.name }).from(schema.templates),
		db.select({ originalPath: schema.assets.originalPath, derivedPath: schema.assets.derivedPath }).from(schema.assets),
		db.select().from(schema.programClips),
		db.select({ id: schema.programs.id, title: schema.programs.title }).from(schema.programs),
		loadAllEntityTags(db),
	])

	const templateNameById = new Map(allTemplates.map(t => [t.id, t.name]))
	const programTitleById = new Map(allPrograms.map(p => [p.id, p.title]))

	// Original asset path to derived (thumbnail) path, for video-background clips
	const thumbnailByPath = new Map<string, string>()
	for (const asset of allAssets) {
		if (asset.derivedPath) thumbnailByPath.set(asset.originalPath, asset.derivedPath)
	}

	const usedByClip = new Map<string, Array<{ id: string; title: string }>>()
	for (const pc of allProgramClips) {
		const list = usedByClip.get(pc.clipId) ?? []
		list.push({ id: pc.programId, title: programTitleById.get(pc.programId) ?? 'Unknown program' })
		usedByClip.set(pc.clipId, list)
	}

	const EMOJI_RE = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u

	const items: ClipListItem[] = allClips
		.map(clip => {
			const data = clip.dataJson as Record<string, unknown> | null
			const bgVideoUrl = (data?.backgroundVideoUrl as string) ?? ''
			const pathMatch = bgVideoUrl.match(/[?&]path=([^&]+)/)
			const originalPath = pathMatch ? decodeURIComponent(pathMatch[1]) : ''
			return {
				id: clip.id,
				title: clip.title,
				slug: clip.slug,
				templateName: templateNameById.get(clip.templateId) ?? 'Unknown',
				durationSec: clip.defaultDurationSec ?? 30,
				createdAt: clip.createdAt,
				updatedAt: clip.updatedAt,
				thumbnailPath: (originalPath && thumbnailByPath.get(originalPath)) || null,
				bgImageUrl: (data?.backgroundImageUrl as string) || null,
				usedBy: usedByClip.get(clip.id) ?? [],
				tags: entityTags.clips.get(clip.id) ?? [],
			}
		})
		.sort((a, b) => {
			const aEmoji = EMOJI_RE.test(a.title)
			const bEmoji = EMOJI_RE.test(b.title)
			if (aEmoji && !bEmoji) return -1
			if (!aEmoji && bEmoji) return 1
			return a.title.localeCompare(b.title)
		})

	return <ClipsSplitPane clips={items} />
}
