"use client";

import type { PreviewTemplateSceneProps } from "../types";
import { WifiQrCode } from "../wifi-qr-code";

export function HouseGuidePreviewScene({ data, renderMode }: PreviewTemplateSceneProps) {
  const hasWifiQr = Boolean(data.wifiSsid && data.wifiPassword);
  const hasWifi = Boolean(data.wifiSsid);
  const hasInfo = Boolean(data.infoImageUrl || data.infoText);
  const isEmpty = !hasWifi && !hasInfo;

  return (
    <div className="flex h-full w-full flex-col bg-gradient-to-b from-slate-900 to-slate-950 text-white">
      <div className="flex items-center justify-center" style={{ paddingTop: 80, paddingInline: 96 }}>
        <h1 style={{ fontSize: 64 }} className="font-bold tracking-tight">House Guide</h1>
      </div>

      <div className="mx-auto mt-6 rounded-full bg-indigo-500" style={{ height: 3, width: 120 }} />

      <div style={{ padding: "50px 96px 60px" }} className="flex flex-1 flex-col gap-8">
        {isEmpty ? (
          <div className="flex flex-1 items-center justify-center">
            <p style={{ fontSize: 32 }} className="text-slate-500">No house info configured yet.</p>
          </div>
        ) : (
          <>
            {hasWifi && (
              <div
                className="flex items-center gap-8 rounded-2xl border border-slate-800 bg-slate-800/40"
                style={{ padding: "32px 40px" }}
              >
                {hasWifiQr && <WifiQrCode ssid={data.wifiSsid} password={data.wifiPassword} size={120} />}
                <div>
                  <p style={{ fontSize: 20, letterSpacing: "0.15em" }} className="uppercase text-slate-400">
                    Wi-Fi
                  </p>
                  <p style={{ fontSize: 36 }} className="mt-3 font-semibold leading-snug">
                    {data.wifiSsid}
                  </p>
                </div>
              </div>
            )}

            {hasInfo && (
              <div
                className="flex flex-1 items-center gap-12 rounded-2xl border border-slate-800 bg-slate-800/40"
                style={{ padding: "40px 48px" }}
              >
                {data.infoImageUrl && (
                  <img
                    src={data.infoImageUrl}
                    alt=""
                    className="shrink-0 rounded-xl object-cover"
                    style={{ width: 260, height: 260 }}
                  />
                )}
                {data.infoText && (
                  <p style={{ fontSize: 32, whiteSpace: "pre-line" }} className="flex-1 leading-relaxed text-slate-200">
                    {data.infoText}
                  </p>
                )}
              </div>
            )}
          </>
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
