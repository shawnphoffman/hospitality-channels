export const dynamic = 'force-dynamic'

import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { notFound } from 'next/navigation'
import { TemplateEditorClient } from '../template-editor-client'

export default async function EditTemplatePage({ params }: { params: { id: string } }) {
	const db = await getDb()
	const [template] = await db
		.select()
		.from(schema.templates)
		.where(eq(schema.templates.id, params.id))
		.limit(1)

	if (!template || (template as Record<string, unknown>).type !== 'composable') {
		notFound()
	}

	return (
		<div>
			<TemplateEditorClient
				existingTemplate={{
					id: template.id,
					name: template.name,
					layoutJson: (template as Record<string, unknown>).layoutJson as Record<string, unknown> | null,
				}}
			/>
		</div>
	)
}
