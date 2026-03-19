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

	let room: { name: string } | null = null
	if (page.roomId) {
		const [r] = await db.select().from(schema.rooms).where(eq(schema.rooms.id, page.roomId)).limit(1)
		if (r) room = r
	}

	const dataJson = (page.dataJson ?? {}) as Record<string, string>

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
			room={room}
		/>
	)
}
