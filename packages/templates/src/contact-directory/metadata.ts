import type { Template } from '@hospitality-channels/content-model'

export const contactDirectoryTemplate: Template & { schema: Record<string, unknown> } = {
	slug: 'contact-directory',
	name: 'Contact Directory',
	description: 'Phone directory with front desk, concierge, housekeeping, and more',
	category: 'info',
	status: 'active',
	version: 1,
	schema: {
		fields: [
			{ key: 'backgroundImageUrl', label: 'Background Image', type: 'image', default: '' },
			{ key: 'headerText', label: 'Header', type: 'string', default: 'Contact Directory' },
			{ key: 'contact1Label', label: 'Contact 1 Label', type: 'string', default: 'Front Desk' },
			{ key: 'contact1Number', label: 'Contact 1 Number', type: 'string', default: '' },
			{ key: 'contact2Label', label: 'Contact 2 Label', type: 'string', default: 'Concierge' },
			{ key: 'contact2Number', label: 'Contact 2 Number', type: 'string', default: '' },
			{ key: 'contact3Label', label: 'Contact 3 Label', type: 'string', default: 'Housekeeping' },
			{ key: 'contact3Number', label: 'Contact 3 Number', type: 'string', default: '' },
			{ key: 'contact4Label', label: 'Contact 4 Label', type: 'string', default: 'Room Service' },
			{ key: 'contact4Number', label: 'Contact 4 Number', type: 'string', default: '' },
			{ key: 'contact5Label', label: 'Contact 5 Label', type: 'string', default: 'Maintenance' },
			{ key: 'contact5Number', label: 'Contact 5 Number', type: 'string', default: '' },
			{ key: 'contact6Label', label: 'Contact 6 Label', type: 'string', default: 'Valet' },
			{ key: 'contact6Number', label: 'Contact 6 Number', type: 'string', default: '' },
			{ key: 'footerText', label: 'Footer Text', type: 'string', default: '' },
			{ key: 'backgroundAudioUrl', label: 'Background Audio', type: 'audio', default: '' },
			{ key: 'matchAudioDuration', label: 'Match video duration to audio length', type: 'boolean', default: false },
		],
	},
}
