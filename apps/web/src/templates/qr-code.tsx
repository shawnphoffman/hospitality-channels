'use client'

import { QRCodeSVG } from 'qrcode.react'

interface QrCodeProps {
	/** The raw string to encode (WiFi URI, URL, plain text, etc.) */
	value: string
	/** QR code size in pixels (default 120) */
	size?: number
}

/**
 * Renders a QR code from any string value.
 * Supports any format: WiFi URIs (WIFI:T:WPA;S:MyNetwork;P:pass;;),
 * URLs, plain text, vCards, etc.
 */
export function QrCode({ value, size = 120 }: QrCodeProps) {
	return (
		<div className="rounded-xl bg-white p-3" style={{ lineHeight: 0 }}>
			<QRCodeSVG value={value} size={size} bgColor="#ffffff" fgColor="#0f172a" level="M" />
		</div>
	)
}
