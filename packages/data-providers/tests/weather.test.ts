import { afterEach, describe, expect, it, vi } from 'vitest'
import { weatherProvider, weatherParamsSchema } from '../src/weather/open-meteo.js'
import { getProvider } from '../src/registry.js'

function jsonResponse(body: unknown): Response {
	return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } })
}

const forecastBody = {
	daily: {
		time: ['2026-07-27', '2026-07-28', '2026-07-29'],
		temperature_2m_max: [76.6, 70.1, 79.4],
		temperature_2m_min: [58.2, 57.9, 57.0],
		weather_code: [3, 61, 0],
	},
}

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('weatherProvider.resolve', () => {
	it('maps a lat/lon forecast to namespaced string keys', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				expect(url).toContain('/v1/forecast')
				return jsonResponse(forecastBody)
			})
		)

		const data = await weatherProvider.resolve({ latitude: 47.6, longitude: -122.3, days: 3, units: 'fahrenheit' })

		expect(data.weatherDay1High).toBe('77') // rounded
		expect(data.weatherDay1Low).toBe('58')
		expect(data.weatherDay1Condition).toBe('Overcast')
		expect(data.weatherDay1Label).toBe('Mon')
		expect(data.weatherDay2Condition).toBe('Light Rain')
		expect(data.weatherDay3Condition).toBe('Clear')
		expect(data.weatherDay3Icon).toBe('☀️')
		expect(data.weatherUnitLabel).toBe('F')
	})

	it('geocodes a place name before fetching the forecast', async () => {
		const calls: string[] = []
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string) => {
				calls.push(url)
				if (url.includes('geocoding-api')) {
					return jsonResponse({ results: [{ latitude: 47.6, longitude: -122.3, name: 'Seattle', admin1: 'Washington' }] })
				}
				return jsonResponse(forecastBody)
			})
		)

		const data = await weatherProvider.resolve({ place: 'Seattle, WA', days: 1, units: 'celsius' })

		expect(calls[0]).toContain('geocoding-api')
		expect(calls[1]).toContain('temperature_unit=celsius')
		expect(data.weatherLocationName).toBe('Seattle, Washington')
		expect(data.weatherUnitLabel).toBe('C')
	})

	it('throws a clear error when the place cannot be geocoded', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => jsonResponse({ results: [] }))
		)
		await expect(weatherProvider.resolve({ place: 'nowhere-xyz', days: 3, units: 'fahrenheit' })).rejects.toThrow(/No location found/)
	})
})

describe('weatherParamsSchema', () => {
	it('requires either a place or explicit coordinates', () => {
		expect(weatherParamsSchema.safeParse({ days: 3 }).success).toBe(false)
		expect(weatherParamsSchema.safeParse({ place: 'X' }).success).toBe(true)
		expect(weatherParamsSchema.safeParse({ latitude: 1, longitude: 2 }).success).toBe(true)
	})

	it('coerces days and clamps to 1-7', () => {
		const ok = weatherParamsSchema.safeParse({ place: 'X', days: '4' })
		expect(ok.success && ok.data.days).toBe(4)
		expect(weatherParamsSchema.safeParse({ place: 'X', days: 99 }).success).toBe(false)
		expect(weatherParamsSchema.safeParse({ place: 'X', days: 0 }).success).toBe(false)
	})
})

describe('registry', () => {
	it('exposes the weather provider by id', () => {
		expect(getProvider('weather')?.id).toBe('weather')
		expect(getProvider('nope')).toBeUndefined()
	})
})
