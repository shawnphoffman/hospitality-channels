import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createClient, type Client } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import { eq } from 'drizzle-orm'
import { PATHS } from '@hospitality-channels/common'
import { getTemplateRegistry } from '@hospitality-channels/templates'
import { runMigrations } from './migrations'
import * as schema from './schema'

type Database = ReturnType<typeof drizzle<typeof schema>>

function generateId(): string {
	return randomBytes(12).toString('hex')
}

let _client: Client | null = null
let _db: Database | null = null
let initPromise: Promise<void> | null = null

function getLazy(): { client: Client; db: Database } {
	if (!_client || !_db) {
		mkdirSync(dirname(PATHS.database), { recursive: true })
		_client = createClient({ url: `file:${PATHS.database}` })
		_db = drizzle(_client, { schema })
	}
	return { client: _client, db: _db }
}

async function ensureSeeded(database: Database) {
	const registry = getTemplateRegistry()
	const existingSlugs = new Set((await database.select({ slug: schema.templates.slug }).from(schema.templates)).map(r => r.slug))

	for (const tmpl of registry) {
		if (existingSlugs.has(tmpl.slug)) continue
		try {
			await database.insert(schema.templates).values({
				id: generateId(),
				slug: tmpl.slug,
				name: tmpl.name,
				description: tmpl.description ?? null,
				category: tmpl.category ?? null,
				schema: tmpl.schema ?? null,
				previewImage: tmpl.previewImage ?? null,
				version: tmpl.version ?? 1,
				status: tmpl.status,
			})
		} catch {
			/* already exists */
		}
	}
	const existingProfiles = await database.select().from(schema.publishProfiles)
	const hasDefault = existingProfiles.some(p => p.name === 'Default' || p.name === 'Default Export')
	if (!hasDefault) {
		await database.insert(schema.publishProfiles).values({
			id: generateId(),
			name: 'Default',
			exportPath: PATHS.exports,
			outputFormat: 'mp4',
			lineupType: 'main',
			fileNamingPattern: '{title}-{pageId}.mp4',
		})
	}
}

/**
 * Data migrations that clean up legacy data. Each migration is idempotent
 * and safe to run on every startup.
 */
async function runDataMigrations(database: Database) {
	// Migration: Clean up duplicate "Default Tunarr Export" profiles
	// Legacy seed code created a new profile on every restart. Keep the one
	// referenced by published artifacts, rename it to "Default", delete the rest.
	const oldProfiles = await database.select().from(schema.publishProfiles).where(eq(schema.publishProfiles.name, 'Default Tunarr Export'))
	if (oldProfiles.length > 0) {
		// Find which ones are referenced by artifacts
		const referencedIds = new Set(
			(await database.select({ pid: schema.publishedArtifacts.publishProfileId }).from(schema.publishedArtifacts)).map(r => r.pid)
		)
		const toKeep = oldProfiles.find(p => referencedIds.has(p.id)) ?? oldProfiles[0]
		// Rename the kept one
		await database.update(schema.publishProfiles).set({ name: 'Default' }).where(eq(schema.publishProfiles.id, toKeep.id))
		// Delete the rest
		const toDeleteIds = oldProfiles.filter(p => p.id !== toKeep.id).map(p => p.id)
		if (toDeleteIds.length > 0) {
			for (const id of toDeleteIds) {
				await database.delete(schema.publishProfiles).where(eq(schema.publishProfiles.id, id))
			}
		}
	}

	// Migration: Rename "Default Export" → "Default" and "Tunarr Export" → "Tunarr"
	const renameMap: Record<string, string> = { 'Default Export': 'Default', 'Tunarr Export': 'Tunarr' }
	for (const [oldName, newName] of Object.entries(renameMap)) {
		const matches = await database.select().from(schema.publishProfiles).where(eq(schema.publishProfiles.name, oldName))
		for (const p of matches) {
			await database.update(schema.publishProfiles).set({ name: newName }).where(eq(schema.publishProfiles.id, p.id))
		}
	}

	// Migration: Deduplicate profiles with the same name
	// Keep the one referenced by artifacts, or the first one if none are referenced.
	const allProfiles = await database.select().from(schema.publishProfiles)
	const profilesByName = new Map<string, typeof allProfiles>()
	for (const p of allProfiles) {
		const list = profilesByName.get(p.name) ?? []
		list.push(p)
		profilesByName.set(p.name, list)
	}
	for (const [, dupes] of profilesByName) {
		if (dupes.length <= 1) continue
		const referencedIds = new Set(
			(await database.select({ pid: schema.publishedArtifacts.publishProfileId }).from(schema.publishedArtifacts)).map(r => r.pid)
		)
		const keep = dupes.find(p => referencedIds.has(p.id)) ?? dupes[0]
		for (const p of dupes) {
			if (p.id !== keep.id) {
				await database.delete(schema.publishProfiles).where(eq(schema.publishProfiles.id, p.id))
			}
		}
	}

	// Migration: Auto-create programs from clips that have backgroundAudioUrl
	// For each clip with audio, create a program wrapping it (if not already in a program).
	const allClips = await database.select().from(schema.clips)
	const existingProgramClips = await database.select().from(schema.programClips)
	const clipsAlreadyInPrograms = new Set(existingProgramClips.map(pc => pc.clipId))

	for (const clip of allClips) {
		if (clipsAlreadyInPrograms.has(clip.id)) continue
		const data = (clip.dataJson ?? {}) as Record<string, unknown>
		const audioUrl = data.backgroundAudioUrl as string | undefined
		if (!audioUrl) continue

		const now = new Date().toISOString()
		const programId = generateId()

		// Create the program
		await database.insert(schema.programs).values({
			id: programId,
			title: clip.title,
			slug: `${clip.slug}-program`,
			description: null,
			summary: null,
			iconAssetId: null,
			durationMode: data.matchAudioDuration ? 'auto' : 'manual',
			manualDurationSec: clip.defaultDurationSec ?? 30,
			createdAt: now,
			updatedAt: now,
		})

		// Add the clip to the program
		await database.insert(schema.programClips).values({
			id: generateId(),
			programId,
			clipId: clip.id,
			position: 0,
		})

		// Add the audio track
		await database.insert(schema.programAudioTracks).values({
			id: generateId(),
			programId,
			assetId: null,
			audioUrl,
			position: 0,
			durationSec: null,
		})

		// Migrate channel definitions from clipId → programId
		const channelDefs = await database.select().from(schema.channelDefinitions).where(eq(schema.channelDefinitions.clipId, clip.id))
		for (const cd of channelDefs) {
			await database.update(schema.channelDefinitions).set({ programId, clipId: null }).where(eq(schema.channelDefinitions.id, cd.id))
		}
	}
}

async function ensureTables(client: Client, database: Database) {
	const applied = await runMigrations(client)
	if (applied.length > 0) {
		console.log(`Applied ${applied.length} database migration(s): ${applied.join(', ')}`)
	}
	await ensureSeeded(database)
	await runDataMigrations(database)
}

/**
 * Returns the database instance, ensuring tables and seed data exist.
 * All side effects (directory creation, table creation) are deferred
 * until this function is called at runtime — not at module import time.
 */
export async function getDb() {
	const { client, db } = getLazy()
	if (!initPromise) {
		initPromise = ensureTables(client, db).catch(err => {
			console.error('Failed to initialize database tables:', err)
			initPromise = null
			throw err
		})
	}
	await initPromise
	return db
}

export { schema }
