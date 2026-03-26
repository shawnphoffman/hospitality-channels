export const dynamic = "force-dynamic";

import { getDb, schema } from "@/db";

export default async function ClipsListPage() {
  const db = await getDb();
  const allClips = await db.select().from(schema.clips);
  const allTemplates = await db.select().from(schema.templates);

  const clipsWithDetails = allClips.map(clip => {
    const template = allTemplates.find(t => t.id === clip.templateId);
    return { ...clip, templateName: template?.name ?? 'Unknown' };
  });

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
      {clipsWithDetails.length === 0 ? (
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
        <div className="space-y-3">
          {clipsWithDetails.map(clip => (
            <a
              key={clip.id}
              href={`/clips/${clip.id}`}
              className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4 transition-colors hover:border-slate-700"
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white">{clip.title}</h3>
                <p className="mt-0.5 text-xs text-slate-400">{clip.templateName} &middot; {clip.slug}</p>
              </div>
              <div className="h-[54px] w-24 shrink-0 overflow-hidden rounded bg-slate-950">
                <iframe
                  src={`/clips/${clip.id}/render`}
                  className="pointer-events-none"
                  style={{ width: 1920, height: 1080, transform: 'scale(0.05)', transformOrigin: 'top left' }}
                  tabIndex={-1}
                />
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
