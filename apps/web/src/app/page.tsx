export default function DashboardPage() {
  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">Dashboard</h2>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Pages" value="0" description="Total page compositions" />
        <StatCard title="Templates" value="2" description="Available templates" />
        <StatCard title="Rooms" value="0" description="Configured rooms" />
        <StatCard title="Published" value="0" description="Published artifacts" />
      </div>
      <div className="mt-10">
        <h3 className="mb-4 text-lg font-semibold text-slate-200">Quick Actions</h3>
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
}: {
  title: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-1 text-3xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}
