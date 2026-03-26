export const dynamic = 'force-dynamic'

import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { getTemplateRegistry, getTemplateBySlug } from '@hospitality-channels/templates'
import { notFound } from 'next/navigation'
import { ClipEditor } from './clip-editor'

export default async function ClipPage({ params }: { params: { id: string } }) {
	const db = await getDb()
	const [clip] = await db.select().from(schema.clips).where(eq(schema.clips.id, params.id)).limit(1)

	if (!clip) notFound()

	const [dbTemplate] = await db.select().from(schema.templates).where(eq(schema.templates.id, clip.templateId)).limit(1)

	if (!dbTemplate) notFound()

	const registryTemplates = getTemplateRegistry()
	const matchedTemplate = registryTemplates.find(t => t.slug === dbTemplate.slug)
	const registryTemplate = getTemplateBySlug(dbTemplate.slug)

	const fields = (matchedTemplate?.schema?.fields ?? []) as Array<{
		key: string
		label: string
		type: string
		default: unknown
		required?: boolean
	}>

	// Find programs that include this clip
	const programClips = await db.select().from(schema.programClips).where(eq(schema.programClips.clipId, clip.id))

	const programIds = programClips.map(pc => pc.programId)
	const allPrograms = programIds.length > 0 ? await db.select().from(schema.programs) : []
	const clipPrograms = allPrograms.filter(p => programIds.includes(p.id)).map(p => ({ id: p.id, title: p.title }))

	return (
		<ClipEditor
			clip={{
				id: clip.id,
				title: clip.title,
				slug: clip.slug,
				templateId: clip.templateId,
				dataJson: (clip.dataJson ?? {}) as Record<string, string>,
				defaultDurationSec: clip.defaultDurationSec ?? 30,
			}}
			templateName={dbTemplate.name ?? registryTemplate?.name ?? 'Unknown'}
			templateSlug={dbTemplate.slug}
			fields={fields}
			programs={clipPrograms}
		/>
	)
}
