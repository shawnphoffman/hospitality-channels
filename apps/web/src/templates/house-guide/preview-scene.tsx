"use client";

import type { PreviewTemplateSceneProps } from "../types";

export function HouseGuidePreviewScene({ data, renderMode }: PreviewTemplateSceneProps) {
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
