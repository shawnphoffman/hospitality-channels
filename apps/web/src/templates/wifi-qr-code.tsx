"use client";

import { QRCodeSVG } from "qrcode.react";

interface WifiQrCodeProps {
  ssid: string;
  password: string;
  /** QR code size in pixels (default 160) */
  size?: number;
}

function escapeWifiField(value: string): string {
  return value.replace(/([\\;,":])/, "\\$1");
}

/**
 * Renders a WiFi QR code that devices can scan to auto-join the network.
 * Uses the standard WIFI: URI scheme (WPA assumed).
 */
export function WifiQrCode({ ssid, password, size = 160 }: WifiQrCodeProps) {
  const wifiString = `WIFI:T:WPA;S:${escapeWifiField(ssid)};P:${escapeWifiField(
    password
  )};;`;

  return (
    <div className="rounded-xl bg-white p-3" style={{ lineHeight: 0 }}>
      <QRCodeSVG
        value={wifiString}
        size={size}
        bgColor="#ffffff"
        fgColor="#0f172a"
        level="M"
      />
    </div>
  );
}
