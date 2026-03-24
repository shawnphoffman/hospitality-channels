import type { Template } from '@hospitality-channels/content-model'

export const hotelWelcomeTemplate: Template & {
	schema: Record<string, unknown>
} = {
	slug: 'hotel-welcome',
	name: 'Hotel Welcome',
	description: 'Full-screen hotel welcome display with background image, guest name, and subtitle',
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
