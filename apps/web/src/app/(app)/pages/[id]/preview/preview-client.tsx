"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getTemplateScenes } from "@/templates/registry";

interface JobData {
  id: string;
  type: string;
  status: string;
  outputPath: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

interface PreviewClientProps {
  page: {
    id: string;
    title: string;
    slug: string;
    defaultDurationSec: number;
  };
  templateSlug: string;
  templateName: string;
  data: Record<string, string>;
  room: { name: string } | null;
}

const SCENE_W = 1920;
const SCENE_H = 1080;

export function PreviewClient({
  page,
  templateSlug,
  templateName,
  data,
  room,
}: PreviewClientProps) {
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [renderMode, setRenderMode] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);
  const [renderJob, setRenderJob] = useState<JobData | null>(null);
  const [rendering, setRendering] = useState(false);

  const recalc = useCallback(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const pad = 48;
    const s = Math.min((el.clientWidth - pad) / SCENE_W, (el.clientHeight - pad) / SCENE_H, 1);
    setScale(Math.max(s, 0.1));
  }, []);

  useEffect(() => {
    recalc();
    const ro = new ResizeObserver(recalc);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [recalc]);

  useEffect(() => {
    if (!renderJob || renderJob.status === "completed" || renderJob.status === "failed") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/jobs/${renderJob.id}`);
        if (res.ok) {
          const updated: JobData = await res.json();
          setRenderJob(updated);
          if (updated.status === "completed" || updated.status === "failed") {
            setRendering(false);
          }
        }
      } catch { /* poll will retry */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [renderJob]);

  const handleRender = async () => {
    setRendering(true);
    setRenderJob(null);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: page.id,
          durationSec: page.defaultDurationSec,
        }),
      });
      if (res.ok) {
        const job: JobData = await res.json();
        setRenderJob(job);
      } else {
        const err = await res.json().catch(() => ({}));
        setRenderJob({
          id: "",
          type: "render",
          status: "failed",
          outputPath: null,
          error: err.error || "Failed to start render",
          createdAt: new Date().toISOString(),
          completedAt: null,
        });
        setRendering(false);
      }
    } catch {
      setRendering(false);
    }
  };

  const scaledW = SCENE_W * scale;
  const scaledH = SCENE_H * scale;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Toolbar */}
      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-4">
        <div className="mr-auto">
          <h2 className="text-xl font-bold text-white">{page.title}</h2>
          <p className="text-xs text-slate-400">
            {templateName} &middot; {page.slug}
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={showSafeArea}
            onChange={(e) => setShowSafeArea(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800"
          />
          Safe area
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={renderMode}
            onChange={(e) => setRenderMode(e.target.checked)}
            className="rounded border-slate-600 bg-slate-800"
          />
          Render mode
        </label>
        <button
          onClick={handleRender}
          disabled={rendering}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
        >
          {rendering ? "Rendering..." : "Render Video"}
        </button>
        <a
          href={`/pages/${page.id}/edit`}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-slate-500 hover:bg-slate-800"
        >
          Edit
        </a>
        <a
          href="/pages"
          className="text-sm text-slate-400 hover:text-slate-300"
        >
          Back
        </a>
      </div>

      {/* Render job status */}
      {renderJob && (
        <div className={`mb-3 shrink-0 rounded-lg border px-4 py-3 text-sm ${
          renderJob.status === "completed"
            ? "border-green-800 bg-green-950 text-green-300"
            : renderJob.status === "failed"
              ? "border-red-800 bg-red-950 text-red-300"
              : "border-blue-800 bg-blue-950 text-blue-300"
        }`}>
          {renderJob.status === "queued" && "Render job queued. Waiting for worker to pick it up..."}
          {renderJob.status === "processing" && "Rendering video... This may take a minute."}
          {renderJob.status === "completed" && (
            <>
              Render complete!
              {renderJob.outputPath && (
                <span className="ml-2 text-xs text-green-400">{renderJob.outputPath}</span>
              )}
              <span className="ml-3">
                <a href="/publish" className="font-medium text-green-200 underline hover:text-white">
                  Go to Publish
                </a>
              </span>
            </>
          )}
          {renderJob.status === "failed" && (
            <>
              Render failed{renderJob.error ? `: ${renderJob.error}` : ""}
            </>
          )}
        </div>
      )}

      {/* Preview area */}
      <div
        ref={wrapperRef}
        className="flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-xl border border-slate-800 bg-black"
      >
        {scale > 0 && (
          <div
            style={{ width: scaledW, height: scaledH }}
            className="relative shrink-0 overflow-hidden rounded shadow-2xl shadow-black/60"
          >
            <div
              style={{
                width: SCENE_W,
                height: SCENE_H,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
              className="absolute left-0 top-0"
            >
              {/* TV Scene content */}
              <div className="absolute inset-0 overflow-hidden" style={{ backgroundColor: "#0f172a" }}>
                {(() => {
                  const entry = getTemplateScenes(templateSlug);
                  if (!entry) {
                    return (
                      <div className="flex h-full items-center justify-center text-slate-500">
                        <p style={{ fontSize: 32 }}>Unknown template: {templateSlug}</p>
                      </div>
                    );
                  }
                  const Scene = entry.previewScene;
                  return <Scene data={data} room={room} renderMode={renderMode} />;
                })()}
              </div>

              {/* Safe area overlay */}
              {showSafeArea && (
                <div
                  className="pointer-events-none absolute"
                  style={{ inset: "5%", border: "2px dashed rgba(255, 255, 255, 0.25)" }}
                />
              )}

              {/* Render mode badge */}
              {renderMode && (
                <div className="pointer-events-none absolute right-6 top-6 rounded bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white opacity-80">
                  Render Mode
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
