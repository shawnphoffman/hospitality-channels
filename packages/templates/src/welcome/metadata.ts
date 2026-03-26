import type { Template } from '@hospitality-channels/content-model'

export const welcomeTemplate: Template & { schema: Record<string, unknown> } = {
	slug: 'welcome',
	name: 'Welcome',
	description: 'Personalized welcome screen with guest name and Wi-Fi info',
	category: 'welcome',
	status: 'active',
	version: 1,
	schema: {
		fields: [
			{
				key: 'backgroundImageUrl',
				label: 'Background Image',
				type: 'image',
				default: '',
			},
			{
				key: 'guestName',
				label: 'Guest Name',
				type: 'string',
				default: '',
				required: true,
			},
			{
				key: 'welcomeMessage',
				label: 'Welcome Message',
				type: 'string',
				default: 'Welcome to your home away from home!',
			},
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
				key: 'backgroundAudioUrl',
				label: 'Background Audio',
				type: 'audio',
				default: '',
			},
			{
				key: 'matchAudioDuration',
				label: 'Match video duration to audio length',
				type: 'boolean',
				default: false,
			},
		],
	},
}
