import type { Template } from '@hospitality-channels/content-model'

export const emergencyInfoTemplate: Template & { schema: Record<string, unknown> } = {
	slug: 'emergency-info',
	name: 'Emergency Info',
	description: 'Emergency contacts, safety information, and nearby services',
	category: 'info',
	status: 'active',
	version: 1,
	schema: {
		fields: [
			{ key: 'backgroundImageUrl', label: 'Background Image', type: 'image', default: '' },
			{ key: 'headerText', label: 'Header', type: 'string', default: 'Emergency Information' },
			{ key: 'emergencyNumber', label: 'Emergency Number', type: 'string', default: '911' },
			{ key: 'frontDesk', label: 'Front Desk', type: 'string', default: '' },
			{ key: 'security', label: 'Security', type: 'string', default: '' },
			{ key: 'nearestHospital', label: 'Nearest Hospital', type: 'string', default: '' },
			{ key: 'nearestPharmacy', label: 'Nearest Pharmacy', type: 'string', default: '' },
			{ key: 'fireSafety', label: 'Fire Safety Info', type: 'markdown', default: '' },
			{ key: 'additionalInfo', label: 'Additional Info', type: 'markdown', default: '' },
			{ key: 'backgroundAudioUrl', label: 'Background Audio', type: 'audio', default: '' },
			{ key: 'matchAudioDuration', label: 'Match video duration to audio length', type: 'boolean', default: false },
		],
	},
}
