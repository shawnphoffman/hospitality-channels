export const dynamic = 'force-dynamic'

import { getDb, schema } from '@/db'
import { AudioClient } from './audio-client'

export default async function AudioPage() {
	const db = await getDb()
	const allAssets = await db.select().from(schema.assets)
	const audioAssets = allAssets.filter(a => a.type === 'audio')

	return (
		<div>
			<h2 className="mb-6 text-2xl font-bold text-white">Audio</h2>
			<AudioClient initialAssets={audioAssets} />
		</div>
	)
}
