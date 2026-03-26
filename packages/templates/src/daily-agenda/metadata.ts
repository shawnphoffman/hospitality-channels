import type { Template } from '@hospitality-channels/content-model'

export const dailyAgendaTemplate: Template & { schema: Record<string, unknown> } = {
	slug: 'daily-agenda',
	name: 'Daily Agenda',
	description: 'Display a daily schedule with up to 4 agenda items',
	category: 'info',
	status: 'active',
	version: 1,
	schema: {
		fields: [
			{ key: 'backgroundImageUrl', label: 'Background Image', type: 'image', default: '' },
			{ key: 'headerText', label: 'Header', type: 'string', default: "Today's Schedule" },
			{ key: 'date', label: 'Date', type: 'string', default: '' },
			{ key: 'item1Time', label: 'Item 1 Time', type: 'string', default: '' },
			{ key: 'item1Title', label: 'Item 1 Title', type: 'string', default: '' },
			{ key: 'item1Description', label: 'Item 1 Description', type: 'string', default: '' },
			{ key: 'item2Time', label: 'Item 2 Time', type: 'string', default: '' },
			{ key: 'item2Title', label: 'Item 2 Title', type: 'string', default: '' },
			{ key: 'item2Description', label: 'Item 2 Description', type: 'string', default: '' },
			{ key: 'item3Time', label: 'Item 3 Time', type: 'string', default: '' },
			{ key: 'item3Title', label: 'Item 3 Title', type: 'string', default: '' },
			{ key: 'item3Description', label: 'Item 3 Description', type: 'string', default: '' },
			{ key: 'item4Time', label: 'Item 4 Time', type: 'string', default: '' },
			{ key: 'item4Title', label: 'Item 4 Title', type: 'string', default: '' },
			{ key: 'item4Description', label: 'Item 4 Description', type: 'string', default: '' },
			{ key: 'footerText', label: 'Footer Text', type: 'string', default: '' },
			{ key: 'backgroundAudioUrl', label: 'Background Audio', type: 'audio', default: '' },
			{ key: 'matchAudioDuration', label: 'Match video duration to audio length', type: 'boolean', default: false },
		],
	},
}
