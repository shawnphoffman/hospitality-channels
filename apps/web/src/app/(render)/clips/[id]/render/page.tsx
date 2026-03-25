export const dynamic = 'force-dynamic'

import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { notFound } from 'next/navigation'
import { RenderScene } from './render-scene'

export default async function RenderPage({ params }: { params: { id: string } }) {
	const db = await getDb()
	const [clip] = await db.select().from(schema.clips).where(eq(schema.clips.id, params.id)).limit(1)

	if (!clip) notFound()

	const [dbTemplate] = await db.select().from(schema.templates).where(eq(schema.templates.id, clip.templateId)).limit(1)

	if (!dbTemplate) notFound()

	const dataJson = (clip.dataJson ?? {}) as Record<string, string>

	return <RenderScene templateSlug={dbTemplate.slug} data={dataJson} />
}
