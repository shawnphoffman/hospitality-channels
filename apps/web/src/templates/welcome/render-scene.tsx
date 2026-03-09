"use client";

import type { TemplateSceneProps } from "../types";

export function WelcomeRenderScene({ data, room }: TemplateSceneProps) {
  const guestName = data.guestName || "Guest";
  const welcomeMessage = data.welcomeMessage || "Welcome to your home away from home!";
  const wifiSsid = data.wifiSsid;
  const wifiPassword = data.wifiPassword;
  const arrivalDate = data.arrivalDate;
  const departureDate = data.departureDate;

  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center text-white"
      style={{ background: "linear-gradient(to bottom right, #0f172a, #1e293b, #1e1b4b)" }}
    >
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{
          top: -160,
          height: 600,
          width: 800,
          opacity: 0.2,
          filter: "blur(120px)",
          background: "radial-gradient(circle, #6366f1 0%, transparent 70%)",
        }}
      />

      {room && (
        <p style={{ fontSize: 22, letterSpacing: "0.3em" }} className="mb-4 uppercase text-slate-400">
          {room.name}
        </p>
      )}

      <h1 style={{ fontSize: 42 }} className="relative z-10 mb-6 text-center font-light leading-tight text-slate-300">
        {welcomeMessage}
      </h1>

      <p style={{ fontSize: 96 }} className="relative z-10 mb-10 text-center font-bold leading-none tracking-tight">
        {guestName}
      </p>

      {(arrivalDate || departureDate) && (
        <p style={{ fontSize: 28 }} className="relative z-10 mb-12 text-slate-400">
          {arrivalDate}
          {arrivalDate && departureDate ? "  —  " : ""}
          {departureDate}
        </p>
      )}

      {wifiSsid && (
        <div
          className="relative z-10 rounded-2xl border border-slate-700/60 bg-slate-800/60 text-center backdrop-blur-sm"
          style={{ padding: "32px 64px" }}
        >
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
    </div>
  );
}
