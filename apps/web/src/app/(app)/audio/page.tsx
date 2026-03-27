export const dynamic = 'force-dynamic'

import { getDb, schema } from '@/db'
import { AudioClient } from './audio-client'

export default async function AudioPage() {
	const db = await getDb()
	const allAssets = await db.select().from(schema.assets)
	const audioAssets = allAssets
		.filter(a => a.type === 'audio')
		.map(a => ({
			id: a.id,
			name: a.name ?? null,
			originalPath: a.originalPath,
			duration: a.duration ?? null,
			coverArtPath: a.derivedPath ?? null,
		}))

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold text-white">Audio</h2>
				<p className="mt-1 text-sm text-slate-500">Music and sound files for program audio tracks</p>
			</div>
			<AudioClient initialAssets={audioAssets} />
		</div>
	)
}
