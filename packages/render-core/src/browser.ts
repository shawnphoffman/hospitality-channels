import { chromium, type Browser } from 'playwright'

const LAUNCH_ARGS = [
	'--no-sandbox',
	'--disable-setuid-sandbox',
	'--disable-dev-shm-usage',
	'--force-color-profile=srgb',
	'--disable-lcd-text',
	'--font-render-hinting=none',
	'--hide-scrollbars',
	'--disable-background-timer-throttling',
	'--disable-renderer-backgrounding',
	'--disable-features=CalculateNativeWinOcclusion,IsolateOrigins,site-per-process',
	'--disable-ipc-flooding-protection',
	'--autoplay-policy=no-user-gesture-required',
]

export async function launchBrowser(): Promise<Browser> {
	return chromium.launch({ headless: true, args: LAUNCH_ARGS })
}
