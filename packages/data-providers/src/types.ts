import type { ZodType, ZodTypeDef } from 'zod'

/**
 * A data provider fetches values from an external source and maps them into
 * the flat `Record<string, string>` map that clip templates already consume.
 * Weather is the first provider; calendars/events/etc. are just new entries
 * in the registry.
 */
export interface DataProvider<P = unknown> {
	/** Stable id used in a clip's provider binding, e.g. 'weather'. */
	id: string
	/** Human label for the editor UI. */
	label: string
	/** Validates and coerces the binding's `params` before `resolve`. Accepts unknown input (raw JSON). */
	paramsSchema: ZodType<P, ZodTypeDef, unknown>
	/**
	 * Data keys this provider emits, so template authors know exactly which
	 * field keys to read (e.g. `weatherDay1High`). Keys with a `{n}` segment
	 * are emitted per requested day/item.
	 */
	outputKeys: string[]
	/** Fetches the external data and returns a flat string map to merge into clip data. */
	resolve(params: P): Promise<Record<string, string>>
}
