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
				key: 'headerText',
				label: 'Title',
				type: 'string',
				default: 'House Guide',
			},
			{
				key: 'backgroundImageUrl',
				label: 'Background Image',
				type: 'image',
				default: '',
			},
			{
				key: 'backgroundVideoUrl',
				label: 'Background Video',
				type: 'video',
				default: '',
			},
			{
				key: 'qrCodeValue',
				label: 'QR Code Value',
				type: 'string',
				default: '',
			},
			{
				key: 'qrCodeLabel',
				label: 'QR Code Label',
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
				type: 'markdown',
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
