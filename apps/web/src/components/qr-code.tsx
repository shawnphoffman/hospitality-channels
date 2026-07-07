'use client'

import { QRCodeSVG } from 'qrcode.react'

interface QrCodeProps {
	/** The raw string to encode (WiFi URI, URL, plain text, etc.) */
	value: string
	/** QR code size in pixels (default 120) */
	size?: number
}

/**
 * Shared QR code renderer. Encodes any string value:
 * WiFi URIs (WIFI:T:WPA;S:MyNetwork;P:pass;;), URLs, plain text, vCards, etc.
 */
export function QrCode({ value, size = 120 }: QrCodeProps) {
	return (
		<div className="rounded-xl bg-white p-3" style={{ lineHeight: 0 }}>
			<QRCodeSVG value={value} size={size} bgColor="#ffffff" fgColor="#0f172a" level="M" />
		</div>
	)
}

function escapeWifiField(value: string): string {
	return value.replace(/([\\;,":])/, '\\$1')
}

/** Builds the standard WiFi join payload (WPA assumed): WIFI:T:WPA;S:...;P:...;; */
export function encodeWifiValue(ssid: string, password: string): string {
	return `WIFI:T:WPA;S:${escapeWifiField(ssid)};P:${escapeWifiField(password)};;`
}

interface WifiQrCodeProps {
	ssid: string
	password: string
	/** QR code size in pixels (default 160) */
	size?: number
}

/**
 * Renders a WiFi QR code that devices can scan to auto-join the network.
 */
export function WifiQrCode({ ssid, password, size = 160 }: WifiQrCodeProps) {
	return <QrCode value={encodeWifiValue(ssid, password)} size={size} />
}
