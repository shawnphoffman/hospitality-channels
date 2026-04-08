import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { getTemplateRegistry } from '@hospitality-channels/templates'
import { getDb, schema } from '@/db'
import { TemplateRow } from './template-row'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
	const templates = getTemplateRegistry()
	const db = await getDb()
	const composableTemplates = await db
		.select()
		.from(schema.templates)
		.where(eq(schema.templates.type, 'composable'))

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-bold text-white">Templates</h2>
					<p className="mt-1 text-sm text-slate-500">Pre-built and custom scene layouts for creating clips</p>
				</div>
				<div className="flex items-center gap-3">
					<Link
						href="/templates/editor"
						className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
					>
						Create Template
					</Link>
					<Link
						href="/templates/dev"
						className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
					>
						Dev Mode
					</Link>
				</div>
			</div>

			{/* Custom Templates */}
			{composableTemplates.length > 0 && (
				<div className="mb-8">
					<h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Custom Templates</h3>
					<div className="space-y-3">
						{composableTemplates.map(template => (
							<div
								key={template.id}
								className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-700"
							>
								<div>
									<h4 className="font-medium text-white">{template.name}</h4>
									<p className="mt-0.5 text-sm text-slate-500">{template.description || 'Composable template'}</p>
								</div>
								<div className="flex items-center gap-2">
									<Link
										href={`/clips/new?template=${template.slug}`}
										className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
									>
										Use
									</Link>
									<Link
										href={`/templates/editor/${template.id}`}
										className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white"
									>
										Edit
									</Link>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Built-in Templates */}
			<div>
				<h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Built-in Templates</h3>
				<div className="space-y-3">
					{templates.map(template => (
						<TemplateRow key={template.slug} slug={template.slug} name={template.name} description={template.description ?? ''} />
					))}
				</div>
			</div>
		</div>
	)
}
