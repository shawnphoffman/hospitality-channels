export const dynamic = 'force-dynamic';

import { db, schema } from "@/db";

export default async function PublishPage() {
  const profiles = await db.select().from(schema.publishProfiles);
  const artifacts = await db.select().from(schema.publishedArtifacts);

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">Publish</h2>

      <section className="mb-10">
        <h3 className="mb-4 text-lg font-semibold text-slate-200">
          Publish Profiles
        </h3>
        {profiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
            <p className="text-slate-400">
              No publish profiles configured. Add one in Settings.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-5"
              >
                <h4 className="font-semibold text-white">{p.name}</h4>
                <p className="mt-1 text-xs text-slate-400">{p.exportPath}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-4 text-lg font-semibold text-slate-200">
          Published Artifacts
        </h3>
        {artifacts.length === 0 ? (
          <p className="text-slate-400">No artifacts published yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2">Page</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Published</th>
                </tr>
              </thead>
              <tbody>
                {artifacts.map((a) => (
                  <tr key={a.id} className="border-t border-slate-800">
                    <td className="px-3 py-2 text-white">{a.pageId}</td>
                    <td className="px-3 py-2 text-slate-300">{a.status}</td>
                    <td className="px-3 py-2 text-slate-300">{a.durationSec}s</td>
                    <td className="px-3 py-2 text-slate-400">{a.publishedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
