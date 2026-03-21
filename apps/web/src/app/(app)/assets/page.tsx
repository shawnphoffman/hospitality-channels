export const dynamic = 'force-dynamic'

import { getDb, schema } from '@/db'
import { AssetsClient } from './assets-client'

export default async function AssetsPage() {
	const db = await getDb()
	const allAssets = await db.select().from(schema.assets)

	return (
		<div>
			<h2 className="mb-6 text-2xl font-bold text-white">Assets</h2>
			<AssetsClient initialAssets={allAssets} />
		</div>
	)
}
