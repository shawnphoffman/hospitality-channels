export const dynamic = 'force-dynamic'

import { getDb, schema } from '@/db'
import { ImagesClient } from './images-client'

export default async function ImagesPage() {
	const db = await getDb()
	const allAssets = await db.select().from(schema.assets)
	const imageAssets = allAssets
		.filter(a => a.type !== 'audio' && a.type !== 'video')
		.map(a => ({
			id: a.id,
			name: a.name ?? null,
			type: a.type,
			originalPath: a.originalPath,
		}))

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold text-white">Images</h2>
				<p className="mt-1 text-sm text-slate-500">Background images, logos, and photos for your templates</p>
			</div>
			<ImagesClient initialAssets={imageAssets} />
		</div>
	)
}
