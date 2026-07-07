import { NextResponse } from 'next/server'
import type { z } from 'zod'

export type ParsedBody<T> = { ok: true; data: T } | { ok: false; response: NextResponse }

/** Parse and validate a JSON request body. Returns a 400 response for malformed JSON or schema violations. */
export async function parseJsonBody<T>(request: Request, schema: z.ZodType<T, z.ZodTypeDef, unknown>): Promise<ParsedBody<T>> {
	let body: unknown
	try {
		body = await request.json()
	} catch {
		return { ok: false, response: NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 }) }
	}

	const result = schema.safeParse(body)
	if (!result.success) {
		return {
			ok: false,
			response: NextResponse.json(
				{
					error: 'Validation failed',
					issues: result.error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })),
				},
				{ status: 400 }
			),
		}
	}

	return { ok: true, data: result.data }
}
