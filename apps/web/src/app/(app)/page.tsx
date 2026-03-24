export const dynamic = "force-dynamic";

import { getDb, schema } from "@/db";
import { count } from "drizzle-orm";

export default async function DashboardPage() {
  const db = await getDb();
  const [[pagesCount], [templatesCount], [publishedCount]] = await Promise.all([
    db.select({ value: count() }).from(schema.pages),
    db.select({ value: count() }).from(schema.templates),
    db.select({ value: count() }).from(schema.publishedArtifacts)
  ]);

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">Dashboard</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Pages"
          value={String(pagesCount.value)}
          description="Total page compositions"
          href="/pages"
        />
        <StatCard
          title="Templates"
          value={String(templatesCount.value)}
          description="Available templates"
          href="/templates"
        />
        <StatCard
          title="Published"
          value={String(publishedCount.value)}
          description="Published artifacts"
          href="/publish"
        />
      </div>
      <div className="mt-10">
        <h3 className="mb-4 text-lg font-semibold text-slate-200">
          Quick Actions
        </h3>
        <div className="flex flex-wrap gap-4">
          <a
            href="/pages/new"
            className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-500"
          >
            Create New Page
          </a>
          <a
            href="/templates"
            className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
          >
            Browse Templates
          </a>
          <a
            href="/publish"
            className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-800"
          >
            Publish
          </a>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  description,
  href
}: {
  title: string;
  value: string;
  description: string;
  href?: string;
}) {
  const content = (
    <>
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className="rounded-xl border border-slate-800 bg-slate-900 p-6 transition-colors hover:border-slate-700 hover:bg-slate-800/80"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      {content}
    </div>
  );
}
