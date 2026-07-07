export const dynamic = 'force-dynamic'

import { getDb, schema } from '@/db'
import { loadAllEntityTags } from '@/lib/tags'
import { MediaClient, type MediaAsset, type MediaTypeFilter } from './media-client'

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
	const { type } = await searchParams
	const db = await getDb()
	const [allAssets, entityTags] = await Promise.all([db.select().from(schema.assets), loadAllEntityTags(db)])

	const assets: MediaAsset[] = allAssets.map(a => ({
		id: a.id,
		name: a.name ?? null,
		type: a.type,
		originalPath: a.originalPath,
		derivedPath: a.derivedPath ?? null,
		width: a.width ?? null,
		height: a.height ?? null,
		duration: a.duration ?? null,
		tags: entityTags.assets.get(a.id) ?? [],
	}))

	const initialType: MediaTypeFilter = type === 'images' || type === 'audio' || type === 'videos' || type === 'other' ? type : 'all'

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold text-white">Media</h2>
				<p className="mt-1 text-sm text-slate-500">Images, audio, and video assets for your templates and programs</p>
			</div>
			<MediaClient initialAssets={assets} initialType={initialType} />
		</div>
	)
}
