import { z } from 'zod'
import type { DataProvider } from '../types.js'
import { fetchJson } from '../fetch.js'

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

const MIN_DAYS = 1
const MAX_DAYS = 7

export const weatherParamsSchema = z
	.object({
		/** A place name to geocode, e.g. "Seattle, WA". Optional if lat/lon given. */
		place: z.string().trim().optional(),
		latitude: z.number().min(-90).max(90).optional(),
		longitude: z.number().min(-180).max(180).optional(),
		/** Number of forecast days (1-7). */
		days: z.coerce.number().int().min(MIN_DAYS).max(MAX_DAYS).default(5),
		units: z.enum(['fahrenheit', 'celsius']).default('fahrenheit'),
	})
	.refine(p => Boolean(p.place) || (p.latitude !== undefined && p.longitude !== undefined), {
		message: 'Provide a place name or both latitude and longitude',
	})

export type WeatherParams = z.infer<typeof weatherParamsSchema>

/** WMO weather interpretation codes → short condition label + emoji icon. */
const WMO_CODES: Record<number, { label: string; icon: string }> = {
	0: { label: 'Clear', icon: '☀️' },
	1: { label: 'Mostly Clear', icon: '🌤️' },
	2: { label: 'Partly Cloudy', icon: '⛅' },
	3: { label: 'Overcast', icon: '☁️' },
	45: { label: 'Fog', icon: '🌫️' },
	48: { label: 'Rime Fog', icon: '🌫️' },
	51: { label: 'Light Drizzle', icon: '🌦️' },
	53: { label: 'Drizzle', icon: '🌦️' },
	55: { label: 'Heavy Drizzle', icon: '🌦️' },
	56: { label: 'Freezing Drizzle', icon: '🌧️' },
	57: { label: 'Freezing Drizzle', icon: '🌧️' },
	61: { label: 'Light Rain', icon: '🌦️' },
	63: { label: 'Rain', icon: '🌧️' },
	65: { label: 'Heavy Rain', icon: '🌧️' },
	66: { label: 'Freezing Rain', icon: '🌧️' },
	67: { label: 'Freezing Rain', icon: '🌧️' },
	71: { label: 'Light Snow', icon: '🌨️' },
	73: { label: 'Snow', icon: '🌨️' },
	75: { label: 'Heavy Snow', icon: '❄️' },
	77: { label: 'Snow Grains', icon: '🌨️' },
	80: { label: 'Light Showers', icon: '🌦️' },
	81: { label: 'Showers', icon: '🌧️' },
	82: { label: 'Violent Showers', icon: '⛈️' },
	85: { label: 'Snow Showers', icon: '🌨️' },
	86: { label: 'Snow Showers', icon: '❄️' },
	95: { label: 'Thunderstorm', icon: '⛈️' },
	96: { label: 'Thunderstorm', icon: '⛈️' },
	99: { label: 'Thunderstorm', icon: '⛈️' },
}

function describeCode(code: number): { label: string; icon: string } {
	return WMO_CODES[code] ?? { label: '', icon: '' }
}

interface GeocodeResponse {
	results?: Array<{ latitude: number; longitude: number; name: string; admin1?: string; country_code?: string }>
}

interface ForecastResponse {
	daily?: {
		time: string[]
		temperature_2m_max: number[]
		temperature_2m_min: number[]
		weather_code: number[]
	}
}

async function geocode(place: string): Promise<{ latitude: number; longitude: number; name: string }> {
	const url = `${GEOCODE_URL}?name=${encodeURIComponent(place)}&count=1`
	const data = await fetchJson<GeocodeResponse>(url)
	const hit = data.results?.[0]
	if (!hit) throw new Error(`No location found for "${place}"`)
	const parts = [hit.name, hit.admin1].filter(Boolean)
	return { latitude: hit.latitude, longitude: hit.longitude, name: parts.join(', ') }
}

/** Weekday label (e.g. "Mon") for an ISO date string, or '' if unparseable. */
function weekdayLabel(isoDate: string): string {
	const d = new Date(`${isoDate}T00:00:00`)
	if (Number.isNaN(d.getTime())) return ''
	return d.toLocaleDateString('en-US', { weekday: 'short' })
}

function round(n: number | undefined): string {
	if (n === undefined || Number.isNaN(n)) return ''
	return String(Math.round(n))
}

export const weatherProvider: DataProvider<WeatherParams> = {
	id: 'weather',
	label: 'Weather forecast',
	paramsSchema: weatherParamsSchema,
	outputKeys: [
		'weatherLocationName',
		'weatherUnitLabel',
		'weatherDay{n}Label',
		'weatherDay{n}Date',
		'weatherDay{n}High',
		'weatherDay{n}Low',
		'weatherDay{n}Condition',
		'weatherDay{n}Icon',
	],
	async resolve(params) {
		let { latitude, longitude } = params
		let locationName = params.place ?? ''

		if (latitude === undefined || longitude === undefined) {
			if (!params.place) throw new Error('Provide a place name or both latitude and longitude')
			const geo = await geocode(params.place)
			latitude = geo.latitude
			longitude = geo.longitude
			locationName = geo.name
		}

		const tempUnit = params.units === 'celsius' ? 'celsius' : 'fahrenheit'
		const url =
			`${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}` +
			`&daily=temperature_2m_max,temperature_2m_min,weather_code` +
			`&forecast_days=${params.days}&temperature_unit=${tempUnit}&timezone=auto`

		const forecast = await fetchJson<ForecastResponse>(url)
		const daily = forecast.daily
		if (!daily || !Array.isArray(daily.time)) {
			throw new Error('Weather service returned no forecast data')
		}

		const out: Record<string, string> = {
			weatherLocationName: locationName,
			weatherUnitLabel: tempUnit === 'celsius' ? 'C' : 'F',
		}
		const count = Math.min(params.days, daily.time.length)
		for (let i = 0; i < count; i++) {
			const n = i + 1
			const { label, icon } = describeCode(daily.weather_code?.[i] ?? -1)
			out[`weatherDay${n}Label`] = weekdayLabel(daily.time[i])
			out[`weatherDay${n}Date`] = daily.time[i] ?? ''
			out[`weatherDay${n}High`] = round(daily.temperature_2m_max?.[i])
			out[`weatherDay${n}Low`] = round(daily.temperature_2m_min?.[i])
			out[`weatherDay${n}Condition`] = label
			out[`weatherDay${n}Icon`] = icon
		}
		return out
	},
}
