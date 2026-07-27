export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getProvider } from '@hospitality-channels/data-providers'
import { parseJsonBody } from '@/lib/api-validation'

/**
 * Runs a data provider server-side and returns the resolved flat data map
 * ({ weatherDay1High: '72', ... }). Provider-scoped rather than clip-scoped so
 * the editor's "Fetch" button works before a binding is even saved. Failures
 * surface to the caller (this is an interactive action, not the render path).
 */
export async function POST(request: Request, props: { params: Promise<{ provider: string }> }) {
	const { provider: providerId } = await props.params
	const provider = getProvider(providerId)
	if (!provider) {
		return NextResponse.json({ error: `Unknown provider: ${providerId}` }, { status: 404 })
	}

	const result = await parseJsonBody(request, provider.paramsSchema)
	if (!result.ok) return result.response

	try {
		const data = await provider.resolve(result.data)
		return NextResponse.json({ data })
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Failed to fetch data'
		return NextResponse.json({ error: message }, { status: 502 })
	}
}
