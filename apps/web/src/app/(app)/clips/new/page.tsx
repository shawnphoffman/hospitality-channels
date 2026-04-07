export const dynamic = 'force-dynamic'

import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { getTemplateRegistry } from '@hospitality-channels/templates'
import { CreateClipForm } from './form'
import type { ComposableLayout } from '@hospitality-channels/content-model'

export default async function NewClipPage({ searchParams }: { searchParams: { template?: string } }) {
	const db = await getDb()
	const templates = getTemplateRegistry()
	const dbTemplates = await db.select().from(schema.templates)

	// Built-in templates
	const builtinOptions = templates.map(t => {
		const dbMatch = dbTemplates.find(dt => dt.slug === t.slug)
		return {
			slug: t.slug,
			name: t.name,
			description: t.description ?? '',
			category: t.category ?? '',
			id: dbMatch?.id ?? t.slug,
			fields: (t.schema?.fields ?? []) as Array<{
				key: string
				label: string
				type: string
				default: unknown
				required?: boolean
			}>,
			templateType: 'builtin' as const,
			layoutJson: null as ComposableLayout | null,
		}
	})

	// Composable templates
	const composableDbTemplates = dbTemplates.filter(
		t => (t as Record<string, unknown>).type === 'composable'
	)
	const composableOptions = composableDbTemplates.map(t => {
		const layoutJson = (t as Record<string, unknown>).layoutJson as ComposableLayout | null
		const sampleData = layoutJson?.sampleData ?? {}
		const fields = layoutJson
			? [
				// Background image override field
				{
					key: '_background_image',
					label: 'Background Image',
					type: 'image' as const,
					default: layoutJson.style.background.type === 'image' ? (layoutJson.style.background.value ?? '') : '',
					required: false,
				},
				...layoutJson.sections
					.filter(s => s.enabled)
					.sort((a, b) => a.order - b.order)
					.flatMap(s => s.fields.map(f => ({
						key: f.key,
						label: f.label,
						type: f.type,
						default: sampleData[f.key] ?? f.default ?? '',
						required: f.required,
					}))),
			]
			: []

		return {
			slug: t.slug,
			name: t.name,
			description: t.description ?? '',
			category: 'custom',
			id: t.id,
			fields,
			templateType: 'composable' as const,
			layoutJson,
		}
	})

	const templateOptions = [...composableOptions, ...builtinOptions]
	const preselectedSlug = searchParams.template ?? null

	return (
		<div>
			<h2 className="mb-6 text-2xl font-bold text-white">Create New Clip</h2>
			<CreateClipForm templates={templateOptions} preselectedTemplate={preselectedSlug} />
		</div>
	)
}
