import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createClient, type Client } from '@libsql/client'
import { afterEach, describe, expect, it } from 'vitest'
import { MIGRATIONS, runMigrations } from '../src/db/migrations'

let clients: Client[] = []

function freshDb(): Client {
	const dir = mkdtempSync(path.join(tmpdir(), 'migrations-test-'))
	const client = createClient({ url: `file:${path.join(dir, 'test.db')}` })
	clients.push(client)
	return client
}

afterEach(() => {
	for (const client of clients) client.close()
	clients = []
})

async function tableNames(client: Client): Promise<Set<string>> {
	const res = await client.execute("SELECT name FROM sqlite_master WHERE type='table'")
	return new Set(res.rows.map((r: any) => String(r.name ?? r[0])))
}

async function columnNames(client: Client, table: string): Promise<Set<string>> {
	const res = await client.execute(`PRAGMA table_info('${table}')`)
	return new Set(res.rows.map((r: any) => String(r.name ?? r[1])))
}

describe('runMigrations', () => {
	it('applies every migration to a fresh database', async () => {
		const client = freshDb()
		const applied = await runMigrations(client)

		expect(applied).toEqual(MIGRATIONS.map(m => m.id))

		const tables = await tableNames(client)
		for (const table of [
			'templates',
			'pages',
			'assets',
			'publish_profiles',
			'published_artifacts',
			'jobs',
			'settings',
			'programs',
			'tags',
			'program_tags',
			'page_tags',
			'asset_tags',
		]) {
			expect(tables.has(table), `missing table ${table}`).toBe(true)
		}
		expect((await columnNames(client, 'jobs')).has('attempts')).toBe(true)
		expect((await columnNames(client, 'published_artifacts')).has('sequence_number')).toBe(true)
	})

	it('is a no-op on the second run', async () => {
		const client = freshDb()
		await runMigrations(client)
		const second = await runMigrations(client)
		expect(second).toEqual([])
	})

	it('adopts a legacy database created before migration tracking existed', async () => {
		const client = freshDb()
		// A legacy release ran the baseline statements untracked on startup.
		await MIGRATIONS[0].run(client)
		expect((await tableNames(client)).has('schema_migrations')).toBe(false)

		const applied = await runMigrations(client)
		expect(applied).toEqual(MIGRATIONS.map(m => m.id))
		expect((await columnNames(client, 'jobs')).has('attempts')).toBe(true)
	})

	it('tolerates every migration being re-run against an up-to-date schema', async () => {
		const client = freshDb()
		await runMigrations(client)
		// Simulate a lost tracking table: every migration must be individually idempotent.
		await client.execute('DELETE FROM schema_migrations')
		const applied = await runMigrations(client)
		expect(applied).toEqual(MIGRATIONS.map(m => m.id))
	})

	it('records applied migrations with timestamps', async () => {
		const client = freshDb()
		await runMigrations(client)
		const rows = await client.execute('SELECT id, applied_at FROM schema_migrations ORDER BY id')
		expect(rows.rows.length).toBe(MIGRATIONS.length)
		for (const row of rows.rows) {
			expect(String((row as any).applied_at)).toMatch(/^\d{4}-\d{2}-\d{2}T/)
		}
	})
})
