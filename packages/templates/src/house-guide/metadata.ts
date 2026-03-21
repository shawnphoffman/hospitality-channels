import type { Template } from '@hospitality-channels/content-model'

export const houseGuideTemplate: Template & { schema: Record<string, unknown> } = {
	slug: 'house-guide',
	name: 'House Guide',
	description: 'House rules, Wi-Fi, thermostat, parking, and general info',
	category: 'info',
	status: 'active',
	version: 1,
	schema: {
		fields: [
			{
				key: 'wifiSsid',
				label: 'Wi-Fi SSID',
				type: 'string',
				default: '',
			},
			{
				key: 'wifiPassword',
				label: 'Wi-Fi Password',
				type: 'string',
				default: '',
			},
			{
				key: 'infoImageUrl',
				label: 'Info Image',
				type: 'image',
				default: '',
			},
			{
				key: 'infoText',
				label: 'Info Text',
				type: 'textarea',
				default: '',
			},
		],
	},
}
