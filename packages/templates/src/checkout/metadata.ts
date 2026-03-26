import type { Template } from '@hospitality-channels/content-model'

export const checkoutTemplate: Template & { schema: Record<string, unknown> } = {
	slug: 'checkout',
	name: 'Checkout',
	description: 'Checkout time, procedures, and departure information',
	category: 'info',
	status: 'active',
	version: 1,
	schema: {
		fields: [
			{ key: 'backgroundImageUrl', label: 'Background Image', type: 'image', default: '' },
			{ key: 'headerText', label: 'Header', type: 'string', default: 'Checkout Information' },
			{ key: 'checkoutTime', label: 'Checkout Time', type: 'string', default: '11:00 AM', required: true },
			{ key: 'lateCheckout', label: 'Late Checkout', type: 'string', default: '' },
			{ key: 'expressCheckout', label: 'Express Checkout', type: 'string', default: '' },
			{ key: 'luggageStorage', label: 'Luggage Storage', type: 'string', default: '' },
			{ key: 'additionalInfo', label: 'Additional Info', type: 'markdown', default: '' },
			{ key: 'contactNumber', label: 'Front Desk Number', type: 'string', default: '' },
			{ key: 'backgroundAudioUrl', label: 'Background Audio', type: 'audio', default: '' },
			{ key: 'matchAudioDuration', label: 'Match video duration to audio length', type: 'boolean', default: false },
		],
	},
}
