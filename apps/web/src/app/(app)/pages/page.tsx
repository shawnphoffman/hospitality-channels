export const dynamic = "force-dynamic";

import { getDb, schema } from "@/db";

export default async function PagesListPage() {
  const db = await getDb();
  const allPages = await db.select().from(schema.pages);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Pages</h2>
        <a
          href="/pages/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          New Page
        </a>
      </div>
      {allPages.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
          <p className="text-slate-400">
            No pages yet. Create one from a template.
          </p>
          <a
            href="/pages/new"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Create Page
          </a>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allPages.map(page => (
            <div
              key={page.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <h3 className="font-semibold text-white">{page.title}</h3>
              <p className="mt-1 text-xs text-slate-400">{page.slug}</p>
              <div className="mt-4 flex gap-2">
                <a
                  href={`/pages/${page.id}/edit`}
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Edit
                </a>
                <a
                  href={`/pages/${page.id}/preview`}
                  className="text-sm text-slate-400 hover:text-slate-300"
                >
                  Preview
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
