export const dynamic = 'force-dynamic'

import { getDb, schema } from '@/db'
import { SettingsForm } from './settings-form'

export default async function SettingsPage() {
	const db = await getDb()
	const rows = await db.select().from(schema.settings)
	const settings: Record<string, string> = {}
	for (const row of rows) {
		if (row.value !== null) {
			settings[row.key] = row.value
		}
	}

	const profiles = await db.select().from(schema.publishProfiles)

	return (
		<div>
			<div className="mb-6">
				<h2 className="text-2xl font-bold text-white">Settings</h2>
				<p className="mt-1 text-sm text-slate-500">Tunarr integration, publish profiles, and system configuration</p>
			</div>
			<SettingsForm
				initialSettings={settings}
				initialProfiles={profiles.map(p => ({
					id: p.id,
					name: p.name,
					exportPath: p.exportPath,
					fileNamingPattern: p.fileNamingPattern,
					allowDownload: p.allowDownload,
				}))}
			/>
		</div>
	)
}
