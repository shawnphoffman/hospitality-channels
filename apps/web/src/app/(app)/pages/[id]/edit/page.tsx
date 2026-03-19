export const dynamic = 'force-dynamic'

import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { getTemplateRegistry } from '@hospitality-channels/templates'
import { notFound } from 'next/navigation'
import { EditPageForm } from './form'

export default async function EditPage({ params }: { params: { id: string } }) {
	const db = await getDb()
	const [page] = await db.select().from(schema.pages).where(eq(schema.pages.id, params.id)).limit(1)

	if (!page) notFound()

	const [dbTemplate] = await db.select().from(schema.templates).where(eq(schema.templates.id, page.templateId)).limit(1)

	if (!dbTemplate) notFound()

	const registryTemplates = getTemplateRegistry()
	const matchedTemplate = registryTemplates.find(t => t.slug === dbTemplate.slug)

	const fields = (matchedTemplate?.schema?.fields ?? []) as Array<{
		key: string
		label: string
		type: string
		default: unknown
		required?: boolean
	}>

	const rooms = await db.select().from(schema.rooms)

	return (
		<div>
			<h2 className="mb-6 text-2xl font-bold text-white">Edit Page</h2>
			<EditPageForm
				page={{
					id: page.id,
					title: page.title,
					slug: page.slug,
					templateId: page.templateId,
					roomId: page.roomId,
					dataJson: (page.dataJson ?? {}) as Record<string, string>,
					defaultDurationSec: page.defaultDurationSec ?? 30,
				}}
				templateName={dbTemplate.name ?? matchedTemplate?.name ?? 'Unknown'}
				templateSlug={dbTemplate.slug}
				fields={fields}
				rooms={rooms.map(r => ({ id: r.id, name: r.name }))}
			/>
		</div>
	)
}
