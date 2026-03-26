import type { Template } from '@hospitality-channels/content-model'

export const localInfoTemplate: Template & { schema: Record<string, unknown> } = {
	slug: 'local-info',
	name: 'Local Info',
	description: 'Showcase local information with photos and descriptions',
	category: 'info',
	status: 'active',
	version: 1,
	schema: {
		fields: [
			{
				key: 'headerText',
				label: 'Header',
				type: 'string',
				default: 'Local Information',
			},
			{
				key: 'layout',
				label: 'Layout',
				type: 'string',
				default: 'photo-right',
			},
			{
				key: 'photo1Url',
				label: 'Photo 1',
				type: 'image',
				default: '',
			},
			{
				key: 'title1',
				label: 'Title 1',
				type: 'string',
				default: '',
			},
			{
				key: 'description1',
				label: 'Description 1',
				type: 'textarea',
				default: '',
			},
			{
				key: 'photo2Url',
				label: 'Photo 2',
				type: 'image',
				default: '',
			},
			{
				key: 'title2',
				label: 'Title 2',
				type: 'string',
				default: '',
			},
			{
				key: 'description2',
				label: 'Description 2',
				type: 'textarea',
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
