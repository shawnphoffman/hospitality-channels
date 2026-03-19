export const dynamic = 'force-dynamic'

import { getDb, schema } from '@/db'

export default async function AssetsPage() {
	const db = await getDb()
	const allAssets = await db.select().from(schema.assets)

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-2xl font-bold text-white">Assets</h2>
			</div>
			{allAssets.length === 0 ? (
				<div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
					<p className="text-slate-400">No assets uploaded yet. Upload photos, logos, and backgrounds.</p>
				</div>
			) : (
				<div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
					{allAssets.map(asset => (
						<div key={asset.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
							<div className="mb-2 aspect-video rounded bg-slate-800" />
							<p className="truncate text-sm text-white">{asset.id}</p>
							<p className="text-xs text-slate-400">{asset.type}</p>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
