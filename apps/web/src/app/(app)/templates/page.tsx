import { getTemplateRegistry } from '@hospitality-channels/templates'
import { TemplateRow } from './template-row'

export default function TemplatesPage() {
	const templates = getTemplateRegistry()

	return (
		<div>
			<div className="mb-6 flex items-center justify-between">
				<h2 className="text-2xl font-bold text-white">Templates</h2>
				<a
					href="/templates/dev"
					className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 hover:text-white"
				>
					Dev Mode
				</a>
			</div>
			<div className="space-y-3">
				{templates.map(template => (
					<TemplateRow key={template.slug} slug={template.slug} name={template.name} description={template.description ?? ''} />
				))}
			</div>
		</div>
	)
}
