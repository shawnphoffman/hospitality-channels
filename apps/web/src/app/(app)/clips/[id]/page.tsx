export const dynamic = 'force-dynamic'

import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { getTemplateRegistry, getTemplateBySlug } from '@hospitality-channels/templates'
import { notFound } from 'next/navigation'
import { ClipEditor } from './clip-editor'
import type { ComposableLayout } from '@hospitality-channels/content-model'

export default async function ClipPage({ params }: { params: { id: string } }) {
	const db = await getDb()
	const [clip] = await db.select().from(schema.clips).where(eq(schema.clips.id, params.id)).limit(1)

	if (!clip) notFound()

	const [dbTemplate] = await db.select().from(schema.templates).where(eq(schema.templates.id, clip.templateId)).limit(1)

	if (!dbTemplate) notFound()

	const templateType = (dbTemplate as Record<string, unknown>).type as string | undefined
	const layoutJson = (dbTemplate as Record<string, unknown>).layoutJson as ComposableLayout | null | undefined

	let fields: Array<{ key: string; label: string; type: string; default: unknown; required?: boolean }>

	if (templateType === 'composable' && layoutJson) {
		// Derive fields from enabled sections in the layout
		fields = layoutJson.sections
			.filter(s => s.enabled)
			.sort((a, b) => a.order - b.order)
			.flatMap(s => s.fields.map(f => ({
				key: f.key,
				label: f.label,
				type: f.type,
				default: f.default ?? '',
				required: f.required,
			})))
	} else {
		const registryTemplates = getTemplateRegistry()
		const matchedTemplate = registryTemplates.find(t => t.slug === dbTemplate.slug)
		fields = (matchedTemplate?.schema?.fields ?? []) as typeof fields
	}

	const registryTemplate = getTemplateBySlug(dbTemplate.slug)

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
			templateType={templateType}
			layoutJson={layoutJson}
		/>
	)
}
