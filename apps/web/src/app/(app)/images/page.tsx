export const dynamic = 'force-dynamic'

import { getDb, schema } from '@/db'
import { ImagesClient } from './images-client'

export default async function ImagesPage() {
	const db = await getDb()
	const allAssets = await db.select().from(schema.assets)
	const imageAssets = allAssets.filter(a => a.type !== 'audio' && a.type !== 'video')

	return (
		<div>
			<h2 className="mb-6 text-2xl font-bold text-white">Images</h2>
			<ImagesClient initialAssets={imageAssets} />
		</div>
	)
}
