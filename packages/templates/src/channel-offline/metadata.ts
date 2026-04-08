import type { Template } from '@hospitality-channels/content-model'

export const channelOfflineTemplate: Template & { schema: Record<string, unknown> } = {
	slug: 'channel-offline',
	name: 'Channel Offline',
	description: 'Simple offline/standby screen with customizable message',
	category: 'utility',
	status: 'active',
	version: 1,
	schema: {
		fields: [
			{ key: 'backgroundImageUrl', label: 'Background Image', type: 'image', default: '' },
			{ key: 'backgroundVideoUrl', label: 'Background Video', type: 'video', default: '' },
			{ key: 'heading', label: 'Heading', type: 'string', default: 'Channel Offline' },
			{ key: 'message', label: 'Message', type: 'markdown', default: 'This channel is currently unavailable.\nPlease check back later.' },
			{ key: 'contactInfo', label: 'Contact Info', type: 'string', default: '' },
			{ key: 'backgroundAudioUrl', label: 'Background Audio', type: 'audio', default: '' },
			{ key: 'matchAudioDuration', label: 'Match video duration to audio length', type: 'boolean', default: false },
		],
	},
}
