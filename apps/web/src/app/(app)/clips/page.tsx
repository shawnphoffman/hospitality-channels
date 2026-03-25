export const dynamic = "force-dynamic";

import { getDb, schema } from "@/db";

export default async function ClipsListPage() {
  const db = await getDb();
  const allClips = await db.select().from(schema.clips);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Clips</h2>
        <a
          href="/clips/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          New Clip
        </a>
      </div>
      {allClips.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
          <p className="text-slate-400">
            No clips yet. Create one from a template.
          </p>
          <a
            href="/clips/new"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Create Clip
          </a>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allClips.map(clip => (
            <a
              key={clip.id}
              href={`/clips/${clip.id}`}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5 transition-colors hover:border-slate-700"
            >
              <h3 className="font-semibold text-white">{clip.title}</h3>
              <p className="mt-1 text-xs text-slate-400">{clip.slug}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
