export const dynamic = 'force-dynamic'

import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { notFound } from 'next/navigation'
import { RenderScene } from './render-scene'

export default async function RenderPage({ params }: { params: { id: string } }) {
	const db = await getDb()
	const [page] = await db.select().from(schema.pages).where(eq(schema.pages.id, params.id)).limit(1)

	if (!page) notFound()

	const [dbTemplate] = await db.select().from(schema.templates).where(eq(schema.templates.id, page.templateId)).limit(1)

	if (!dbTemplate) notFound()

	const dataJson = (page.dataJson ?? {}) as Record<string, string>

	return <RenderScene templateSlug={dbTemplate.slug} data={dataJson} />
}
