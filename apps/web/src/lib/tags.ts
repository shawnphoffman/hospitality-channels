import { eq, inArray } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { generateId } from '@/lib/id'

type Database = Awaited<ReturnType<typeof getDb>>

/**
 * Normalizes a raw tag name into the canonical form: lowercase, hyphenated,
 * alphanumeric. Returns an empty string when nothing usable remains.
 */
export function normalizeTagName(raw: string): string {
	return raw
		.trim()
		.toLowerCase()
		.replace(/[\s_]+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/(^-|-$)/g, '')
		.slice(0, 40)
}

/**
 * Replaces an entity's tag set with the given names (set semantics, which is
 * what the inline add/remove editor sends). Unknown tags are created; tags
 * left with no references anywhere are pruned so the vocabulary stays tidy.
 * Returns the final normalized tag names for the entity.
 */
export async function setEntityTags(db: Database, entity: 'program' | 'clip', entityId: string, names: string[]): Promise<string[]> {
	const normalized = [...new Set(names.map(normalizeTagName).filter(Boolean))]

	// Ensure every requested tag exists
	const existing = normalized.length ? await db.select().from(schema.tags).where(inArray(schema.tags.name, normalized)) : []
	const existingByName = new Map(existing.map(t => [t.name, t.id]))
	const now = new Date().toISOString()
	for (const name of normalized) {
		if (existingByName.has(name)) continue
		const id = generateId()
		await db.insert(schema.tags).values({ id, name, createdAt: now })
		existingByName.set(name, id)
	}

	// Replace the entity's junction rows
	if (entity === 'program') {
		await db.delete(schema.programTags).where(eq(schema.programTags.programId, entityId))
		for (const name of normalized) {
			await db.insert(schema.programTags).values({ id: generateId(), programId: entityId, tagId: existingByName.get(name)! })
		}
	} else {
		await db.delete(schema.clipTags).where(eq(schema.clipTags.clipId, entityId))
		for (const name of normalized) {
			await db.insert(schema.clipTags).values({ id: generateId(), clipId: entityId, tagId: existingByName.get(name)! })
		}
	}

	await pruneOrphanTags(db)
	return normalized
}

/** Deletes tags no longer referenced by any entity. */
export async function pruneOrphanTags(db: Database): Promise<void> {
	const [allTags, programRefs, clipRefs] = await Promise.all([
		db.select({ id: schema.tags.id }).from(schema.tags),
		db.select({ tagId: schema.programTags.tagId }).from(schema.programTags),
		db.select({ tagId: schema.clipTags.tagId }).from(schema.clipTags),
	])
	const referenced = new Set([...programRefs.map(r => r.tagId), ...clipRefs.map(r => r.tagId)])
	const orphans = allTags.map(t => t.id).filter(id => !referenced.has(id))
	if (orphans.length) {
		await db.delete(schema.tags).where(inArray(schema.tags.id, orphans))
	}
}

export interface EntityTags {
	/** Tag names per program id */
	programs: Map<string, string[]>
	/** Tag names per clip id */
	clips: Map<string, string[]>
}

/** Loads every tag assignment in two queries, for list pages. */
export async function loadAllEntityTags(db: Database): Promise<EntityTags> {
	const [programRows, clipRows] = await Promise.all([
		db
			.select({ entityId: schema.programTags.programId, name: schema.tags.name })
			.from(schema.programTags)
			.innerJoin(schema.tags, eq(schema.programTags.tagId, schema.tags.id)),
		db
			.select({ entityId: schema.clipTags.clipId, name: schema.tags.name })
			.from(schema.clipTags)
			.innerJoin(schema.tags, eq(schema.clipTags.tagId, schema.tags.id)),
	])
	const collect = (rows: { entityId: string; name: string }[]) => {
		const map = new Map<string, string[]>()
		for (const row of rows) {
			const list = map.get(row.entityId) ?? []
			list.push(row.name)
			map.set(row.entityId, list)
		}
		for (const list of map.values()) list.sort()
		return map
	}
	return { programs: collect(programRows), clips: collect(clipRows) }
}
