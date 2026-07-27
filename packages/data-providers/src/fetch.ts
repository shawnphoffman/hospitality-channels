import { createLogger } from '@hospitality-channels/common'

const logger = createLogger('data-providers')

/** Per-request time budget for provider HTTP calls. */
const PROVIDER_FETCH_TIMEOUT_MS = Math.max(1_000, Number(process.env.PROVIDER_FETCH_TIMEOUT_MS) || 10_000)

/**
 * fetch with a hard timeout and a single retry on network-level failures
 * (connection refused, DNS, timeout). HTTP error statuses are not retried;
 * they reach the caller so the real status can be reported. Mirrors the
 * pattern in packages/publish/src/tunarr.ts.
 */
export async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await fetch(url, { ...init, signal: AbortSignal.timeout(PROVIDER_FETCH_TIMEOUT_MS) })
		} catch (err) {
			if (attempt >= 1) {
				const reason = err instanceof Error && err.name === 'TimeoutError' ? `timed out after ${PROVIDER_FETCH_TIMEOUT_MS}ms` : String(err)
				throw new Error(`Data source unreachable (${reason}).`)
			}
			logger.warn('Provider request failed, retrying once', { url, error: String(err) })
		}
	}
}

/** GET a URL and parse JSON, surfacing non-2xx statuses as errors. */
export async function fetchJson<T>(url: string): Promise<T> {
	const res = await fetchWithTimeout(url)
	if (!res.ok) {
		const text = await res.text().catch(() => '')
		throw new Error(`Request failed ${res.status}: ${text.slice(0, 200)}`)
	}
	return res.json() as Promise<T>
}
