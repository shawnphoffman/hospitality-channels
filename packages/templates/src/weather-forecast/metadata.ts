import type { Template } from '@hospitality-channels/content-model'

/**
 * Reads the flat weather keys emitted by the `weather` data provider
 * (weatherLocationName, weatherDay{n}Label/High/Low/Condition/Icon). Configure
 * a weather binding on the clip and click "Fetch weather" to populate these;
 * the values are then editable and saved like any other field.
 */
function dayFields(n: number) {
	return [
		{ key: `weatherDay${n}Label`, label: `Day ${n} - Weekday`, type: 'string', default: '' },
		{ key: `weatherDay${n}Icon`, label: `Day ${n} - Icon`, type: 'string', default: '' },
		{ key: `weatherDay${n}Condition`, label: `Day ${n} - Condition`, type: 'string', default: '' },
		{ key: `weatherDay${n}High`, label: `Day ${n} - High`, type: 'string', default: '' },
		{ key: `weatherDay${n}Low`, label: `Day ${n} - Low`, type: 'string', default: '' },
	]
}

export const weatherForecastTemplate: Template & { schema: Record<string, unknown> } = {
	slug: 'weather-forecast',
	name: 'Weather Forecast',
	description: 'A multi-day weather forecast, auto-filled from a location via the weather data provider',
	category: 'info',
	status: 'active',
	version: 1,
	schema: {
		fields: [
			{ key: 'backgroundImageUrl', label: 'Background Image', type: 'image', default: '' },
			{ key: 'headerText', label: 'Header', type: 'string', default: 'Weather Forecast' },
			{ key: 'weatherLocationName', label: 'Location Name', type: 'string', default: '' },
			{ key: 'unitLabel', label: 'Unit Label (e.g. F)', type: 'string', default: 'F' },
			...dayFields(1),
			...dayFields(2),
			...dayFields(3),
			...dayFields(4),
			...dayFields(5),
			{ key: 'footerText', label: 'Footer Text', type: 'string', default: '' },
		],
	},
}
