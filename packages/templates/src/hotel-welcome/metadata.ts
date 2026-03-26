import type { Template } from '@hospitality-channels/content-model'

export const hotelWelcomeTemplate: Template & {
	schema: Record<string, unknown>
} = {
	slug: 'hotel-welcome',
	name: 'Hotel Welcome',
	description: 'Full-screen hotel welcome display with background image, guest name, subtitle, and Wi-Fi info',
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
				required: true,
			},
			{
				key: 'backgroundVideoUrl',
				label: 'Background Video',
				type: 'video',
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
				key: 'subtitle',
				label: 'Subtitle',
				type: 'textarea',
				default: 'Welcome to your stay',
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
