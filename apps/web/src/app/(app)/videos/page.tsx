export const dynamic = 'force-dynamic'

import { getDb, schema } from '@/db'
import { VideosClient } from './videos-client'

export default async function VideosPage() {
	const db = await getDb()
	const allAssets = await db.select().from(schema.assets)
	const videoAssets = allAssets
		.filter(a => a.type === 'video')
		.map(a => ({
			id: a.id,
			name: a.name ?? null,
			originalPath: a.originalPath,
			thumbnailPath: a.derivedPath ?? null,
			width: a.width ?? null,
			height: a.height ?? null,
			duration: a.duration ?? null,
		}))

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold text-white">Videos</h2>
				<p className="mt-1 text-sm text-slate-500">Video backgrounds and clips for templates</p>
			</div>
			<VideosClient initialAssets={videoAssets} />
		</div>
	)
}
