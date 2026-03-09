"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface PreviewClientProps {
  page: {
    id: string;
    title: string;
    slug: string;
    status: string;
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

  const scaledW = SCENE_W * scale;
  const scaledH = SCENE_H * scale;

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Toolbar */}
      <div className="mb-4 flex shrink-0 flex-wrap items-center gap-4">
        <div className="mr-auto">
          <h2 className="text-xl font-bold text-white">{page.title}</h2>
          <p className="text-xs text-slate-400">
            {templateName} &middot; {page.status} &middot; {page.slug}
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
                {templateSlug === "welcome" && (
                  <WelcomeScene data={data} room={room} renderMode={renderMode} />
                )}
                {templateSlug === "house-guide" && (
                  <HouseGuideScene data={data} renderMode={renderMode} />
                )}
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

/* ─── Welcome Template ─── */

function WelcomeScene({
  data,
  room,
  renderMode,
}: {
  data: Record<string, string>;
  room: { name: string } | null;
  renderMode: boolean;
}) {
  const guestName = data.guestName || "Guest";
  const welcomeMessage = data.welcomeMessage || "Welcome to your home away from home!";
  const wifiSsid = data.wifiSsid;
  const wifiPassword = data.wifiPassword;
  const arrivalDate = data.arrivalDate;
  const departureDate = data.departureDate;

  return (
    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full opacity-20 blur-[120px]"
        style={{ top: -160, height: 600, width: 800, background: "radial-gradient(circle, #6366f1 0%, transparent 70%)" }}
      />

      {/* Room label */}
      {room && (
        <p style={{ fontSize: 22, letterSpacing: "0.3em" }} className="mb-4 uppercase text-slate-400">
          {room.name}
        </p>
      )}

      {/* Welcome message */}
      <h1 style={{ fontSize: 42 }} className="relative z-10 mb-6 text-center font-light leading-tight text-slate-300">
        {welcomeMessage}
      </h1>

      {/* Guest name — hero */}
      <p style={{ fontSize: 96 }} className="relative z-10 mb-10 text-center font-bold leading-none tracking-tight">
        {guestName}
      </p>

      {/* Stay dates */}
      {(arrivalDate || departureDate) && (
        <p style={{ fontSize: 28 }} className="relative z-10 mb-12 text-slate-400">
          {arrivalDate}
          {arrivalDate && departureDate ? "  —  " : ""}
          {departureDate}
        </p>
      )}

      {/* Wi-Fi info */}
      {wifiSsid && (
        <div className="relative z-10 rounded-2xl border border-slate-700/60 bg-slate-800/60 text-center backdrop-blur-sm" style={{ padding: "32px 64px" }}>
          <p style={{ fontSize: 20, letterSpacing: "0.2em" }} className="mb-2 uppercase text-slate-400">
            Wi-Fi
          </p>
          <p style={{ fontSize: 36 }} className="font-semibold">{wifiSsid}</p>
          {wifiPassword && (
            <p style={{ fontSize: 28 }} className="mt-2 font-light text-slate-300">
              {wifiPassword}
            </p>
          )}
        </div>
      )}

      {/* Preview watermark (hidden in render mode) */}
      {!renderMode && (
        <p style={{ fontSize: 18 }} className="absolute bottom-10 right-12 text-slate-600">
          Preview
        </p>
      )}
    </div>
  );
}

/* ─── House Guide Template ─── */

function HouseGuideScene({
  data,
  renderMode,
}: {
  data: Record<string, string>;
  renderMode: boolean;
}) {
  const items: Array<{ label: string; value: string }> = [];

  if (data.wifiSsid) items.push({ label: "Wi-Fi Network", value: data.wifiSsid });
  if (data.wifiPassword) items.push({ label: "Wi-Fi Password", value: data.wifiPassword });
  if (data.checkoutTime) items.push({ label: "Checkout Time", value: data.checkoutTime });
  if (data.quietHours) items.push({ label: "Quiet Hours", value: data.quietHours });
  if (data.parkingInfo) items.push({ label: "Parking", value: data.parkingInfo });
  if (data.thermostatInstructions) items.push({ label: "Thermostat", value: data.thermostatInstructions });
  if (data.kitchenNotes) items.push({ label: "Kitchen & Amenities", value: data.kitchenNotes });

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-b from-slate-900 to-slate-950 text-white">
      <div className="flex items-center justify-center" style={{ paddingTop: 80, paddingInline: 96 }}>
        <h1 style={{ fontSize: 64 }} className="font-bold tracking-tight">House Guide</h1>
      </div>

      <div className="mx-auto mt-6 rounded-full bg-indigo-500" style={{ height: 3, width: 120 }} />

      <div style={{ padding: "50px 96px 60px" }} className="flex-1">
        {items.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p style={{ fontSize: 32 }} className="text-slate-500">No house info configured yet.</p>
          </div>
        ) : (
          <div
            className="grid h-full"
            style={{
              gridTemplateColumns: items.length > 3 ? "1fr 1fr" : "1fr",
              gap: "32px 64px",
            }}
          >
            {items.map((item) => (
              <div
                key={item.label}
                className="flex flex-col justify-center rounded-2xl border border-slate-800 bg-slate-800/40"
                style={{ padding: "32px 40px" }}
              >
                <p style={{ fontSize: 20, letterSpacing: "0.15em" }} className="uppercase text-slate-400">
                  {item.label}
                </p>
                <p style={{ fontSize: 36 }} className="mt-3 font-semibold leading-snug">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {!renderMode && (
        <p style={{ fontSize: 16, paddingBottom: 24 }} className="text-center text-slate-600">
          Preview
        </p>
      )}
    </div>
  );
}
