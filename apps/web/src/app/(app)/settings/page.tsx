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

	return (
		<div>
			<h2 className="mb-6 text-2xl font-bold text-white">Settings</h2>
			<SettingsForm initialSettings={settings} />
		</div>
	)
}
