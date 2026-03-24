import { getTemplateRegistry } from "@hospitality-channels/templates";

export default function TemplatesPage() {
  const templates = getTemplateRegistry();

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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map(template => (
          <div
            key={template.slug}
            className="rounded-xl border border-slate-800 bg-slate-900 p-6"
          >
            <h3 className="text-lg font-semibold text-white">
              {template.name}
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              {template.description}
            </p>
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                {template.category}
              </span>
              <span className="text-xs text-slate-500">
                v{template.version}
              </span>
            </div>
            <a
              href={`/pages/new?template=${template.slug}`}
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
            >
              Use Template
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
