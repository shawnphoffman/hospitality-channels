"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Profile {
  id: string;
  name: string;
  exportPath: string;
  fileNamingPattern: string | null;
}

interface RenderedPage {
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  renderJobId: string;
  outputPath: string;
  renderedAt: string;
}

interface Artifact {
  id: string;
  pageTitle: string;
  profileName: string;
  outputPath: string;
  durationSec: number;
  status: string;
  publishedAt: string | null;
}

interface JobData {
  id: string;
  status: string;
  error: string | null;
  outputPath: string | null;
}

interface PublishWorkflowProps {
  profiles: Profile[];
  renderedPages: RenderedPage[];
  artifacts: Artifact[];
}

export function PublishWorkflow({
  profiles: initialProfiles,
  renderedPages,
  artifacts,
}: PublishWorkflowProps) {
  const router = useRouter();
  const [profiles, setProfiles] = useState(initialProfiles);
  const [showNewProfile, setShowNewProfile] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfilePath, setNewProfilePath] = useState("");
  const [newProfilePattern, setNewProfilePattern] = useState("{title}-{pageId}.mp4");
  const [savingProfile, setSavingProfile] = useState(false);
  const [publishingPageId, setPublishingPageId] = useState<string | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState(initialProfiles[0]?.id ?? "");
  const [publishJob, setPublishJob] = useState<JobData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!publishJob || publishJob.status === "completed" || publishJob.status === "failed") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${publishJob.id}`);
        if (res.ok) {
          const updated: JobData = await res.json();
          setPublishJob(updated);
          if (updated.status === "completed" || updated.status === "failed") {
            if (updated.status === "completed") {
              router.refresh();
            }
          }
        }
      } catch { /* poll will retry */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [publishJob, router]);

  const handleCreateProfile = async () => {
    if (!newProfileName.trim() || !newProfilePath.trim()) return;
    setSavingProfile(true);
    try {
      const res = await fetch("/api/publish-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProfileName,
          exportPath: newProfilePath,
          fileNamingPattern: newProfilePattern || null,
        }),
      });
      if (res.ok) {
        const profile = await res.json();
        setProfiles((prev) => [...prev, profile]);
        setSelectedProfileId(profile.id);
        setShowNewProfile(false);
        setNewProfileName("");
        setNewProfilePath("");
      }
    } catch {
      setError("Failed to create profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePublish = async (pageId: string) => {
    if (!selectedProfileId) {
      setError("Select a publish profile first");
      return;
    }
    setPublishingPageId(pageId);
    setPublishJob(null);
    setError(null);

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, profileId: selectedProfileId }),
      });
      if (res.ok) {
        const job: JobData = await res.json();
        setPublishJob(job);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to start publish");
        setPublishingPageId(null);
      }
    } catch {
      setError("Failed to start publish");
      setPublishingPageId(null);
    }
  };

  const isPublishing = publishJob && publishJob.status !== "completed" && publishJob.status !== "failed";

  return (
    <div className="space-y-10">
      {error && (
        <div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
          <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-200">&times;</button>
        </div>
      )}

      {publishJob && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          publishJob.status === "completed"
            ? "border-green-800 bg-green-950 text-green-300"
            : publishJob.status === "failed"
              ? "border-red-800 bg-red-950 text-red-300"
              : "border-blue-800 bg-blue-950 text-blue-300"
        }`}>
          {publishJob.status === "queued" && "Publish job queued. Waiting for worker..."}
          {publishJob.status === "processing" && "Publishing... Copying files to export path."}
          {publishJob.status === "completed" && (
            <>Published successfully!{publishJob.outputPath && <span className="ml-2 text-xs text-green-400">{publishJob.outputPath}</span>}</>
          )}
          {publishJob.status === "failed" && `Publish failed${publishJob.error ? `: ${publishJob.error}` : ""}`}
        </div>
      )}

      {/* Publish Profiles */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-200">Publish Profiles</h3>
          <button
            onClick={() => setShowNewProfile(!showNewProfile)}
            className="text-sm text-blue-400 hover:text-blue-300"
          >
            {showNewProfile ? "Cancel" : "+ New Profile"}
          </button>
        </div>

        {showNewProfile && (
          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
            <div>
              <label htmlFor="profile-name" className="block text-sm text-slate-400">Name</label>
              <input
                id="profile-name"
                type="text"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="e.g. Tunarr Export"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="profile-path" className="block text-sm text-slate-400">Export Path</label>
              <input
                id="profile-path"
                type="text"
                value={newProfilePath}
                onChange={(e) => setNewProfilePath(e.target.value)}
                placeholder="e.g. /media/tunarr/guest-pages"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="profile-pattern" className="block text-sm text-slate-400">
                File Naming Pattern
              </label>
              <input
                id="profile-pattern"
                type="text"
                value={newProfilePattern}
                onChange={(e) => setNewProfilePattern(e.target.value)}
                placeholder="{title}-{pageId}.mp4"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-500">
                Available tokens: {"{title}"}, {"{pageId}"}, {"{timestamp}"}
              </p>
            </div>
            <button
              onClick={handleCreateProfile}
              disabled={savingProfile || !newProfileName.trim() || !newProfilePath.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {savingProfile ? "Creating..." : "Create Profile"}
            </button>
          </div>
        )}

        {profiles.length === 0 && !showNewProfile ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
            <p className="text-slate-400">No publish profiles configured.</p>
            <button
              onClick={() => setShowNewProfile(true)}
              className="mt-3 text-sm text-blue-400 hover:text-blue-300"
            >
              Create your first profile
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {profiles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedProfileId(p.id)}
                className={`rounded-xl border p-4 text-left transition-colors ${
                  selectedProfileId === p.id
                    ? "border-blue-500 bg-blue-950/50"
                    : "border-slate-800 bg-slate-900 hover:border-slate-700"
                }`}
              >
                <p className="font-medium text-white">{p.name}</p>
                <p className="mt-1 text-xs text-slate-400">{p.exportPath}</p>
                {p.fileNamingPattern && (
                  <p className="mt-1 text-xs text-slate-500">{p.fileNamingPattern}</p>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Rendered Pages — ready to publish */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-slate-200">Ready to Publish</h3>
        {renderedPages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
            <p className="text-slate-400">
              No rendered pages yet. Go to a page preview and click "Render Video" first.
            </p>
            <a
              href="/pages"
              className="mt-3 inline-block text-sm text-blue-400 hover:text-blue-300"
            >
              Go to Pages
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {renderedPages.map((rp) => (
              <div
                key={rp.renderJobId}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4"
              >
                <div>
                  <p className="font-medium text-white">{rp.pageTitle}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Rendered {new Date(rp.renderedAt).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500">{rp.outputPath}</p>
                </div>
                <button
                  onClick={() => handlePublish(rp.pageId)}
                  disabled={!!isPublishing || profiles.length === 0}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
                >
                  {publishingPageId === rp.pageId && isPublishing
                    ? "Publishing..."
                    : "Publish"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Published Artifacts */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-slate-200">Published Artifacts</h3>
        {artifacts.length === 0 ? (
          <p className="text-slate-400">No artifacts published yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-3 py-2">Page</th>
                  <th className="px-3 py-2">Profile</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Duration</th>
                  <th className="px-3 py-2">Output</th>
                  <th className="px-3 py-2">Published</th>
                </tr>
              </thead>
              <tbody>
                {artifacts.map((a) => (
                  <tr key={a.id} className="border-t border-slate-800">
                    <td className="px-3 py-2 text-white">{a.pageTitle}</td>
                    <td className="px-3 py-2 text-slate-300">{a.profileName}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        a.status === "published"
                          ? "bg-green-900 text-green-300"
                          : "bg-slate-800 text-slate-400"
                      }`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-300">{a.durationSec}s</td>
                    <td className="max-w-xs truncate px-3 py-2 text-xs text-slate-500">{a.outputPath}</td>
                    <td className="px-3 py-2 text-slate-400">
                      {a.publishedAt ? new Date(a.publishedAt).toLocaleString() : "—"}
                    </td>
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
