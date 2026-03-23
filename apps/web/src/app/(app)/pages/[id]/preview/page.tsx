export const dynamic = 'force-dynamic'

import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { getTemplateBySlug } from '@hospitality-channels/templates'
import { notFound } from 'next/navigation'
import { PreviewClient } from './preview-client'

export default async function PreviewPage({ params }: { params: { id: string } }) {
	const db = await getDb()
	const [page] = await db.select().from(schema.pages).where(eq(schema.pages.id, params.id)).limit(1)

	if (!page) notFound()

	const [dbTemplate] = await db.select().from(schema.templates).where(eq(schema.templates.id, page.templateId)).limit(1)

	if (!dbTemplate) notFound()

	const registryTemplate = getTemplateBySlug(dbTemplate.slug)

	const dataJson = (page.dataJson ?? {}) as Record<string, string>

	const profiles = await db.select().from(schema.publishProfiles)
	const [tunarrSetting] = await db.select().from(schema.settings).where(eq(schema.settings.key, 'tunarr_url')).limit(1)

	return (
		<PreviewClient
			page={{
				id: page.id,
				title: page.title,
				slug: page.slug,
				defaultDurationSec: page.defaultDurationSec ?? 30,
			}}
			templateSlug={dbTemplate.slug}
			templateName={dbTemplate.name ?? registryTemplate?.name ?? 'Unknown'}
			data={dataJson}
			profiles={profiles.map(p => ({ id: p.id, name: p.name }))}
			tunarrConfigured={!!tunarrSetting?.value}
		/>
	)
}
