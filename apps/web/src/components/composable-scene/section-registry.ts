import type { ComposableSection } from '@hospitality-channels/content-model'

export interface SectionTypeDefinition {
	type: ComposableSection['type']
	label: string
	description: string
	defaultConfig: Record<string, unknown>
	defaultFields: Array<{
		key: string
		label: string
		type: 'string' | 'textarea' | 'markdown' | 'image' | 'video' | 'audio' | 'boolean'
		default: string
		required?: boolean
	}>
}

export const sectionTypes: SectionTypeDefinition[] = [
	{
		type: 'header',
		label: 'Header',
		description: 'Title text with optional subtitle and divider',
		defaultConfig: {
			fontSize: 64,
			showDivider: true,
			alignment: 'center',
		},
		defaultFields: [
			{ key: 'header_title', label: 'Title', type: 'string', default: 'Welcome', required: true },
			{ key: 'header_subtitle', label: 'Subtitle', type: 'string', default: '' },
		],
	},
	{
		type: 'text-card',
		label: 'Text Card',
		description: 'Markdown text block in a styled card',
		defaultConfig: {
			transparentBg: false,
			padding: 'normal',
			alignment: 'left',
		},
		defaultFields: [
			{ key: 'textcard_body', label: 'Body Text', type: 'markdown', default: '' },
		],
	},
	{
		type: 'image-block',
		label: 'Image',
		description: 'Image display with sizing options',
		defaultConfig: {
			maxHeight: 600,
			objectFit: 'cover',
			borderRadius: 16,
			alignment: 'center',
		},
		defaultFields: [
			{ key: 'image_src', label: 'Image', type: 'image', default: '', required: true },
		],
	},
	{
		type: 'qr-code',
		label: 'QR Code',
		description: 'QR code with optional label',
		defaultConfig: {
			size: 200,
			alignment: 'center',
		},
		defaultFields: [
			{ key: 'qr_value', label: 'QR Code Value', type: 'string', default: '', required: true },
			{ key: 'qr_label', label: 'Label', type: 'string', default: '' },
		],
	},
]

export function getSectionTypeDefinition(type: string): SectionTypeDefinition | undefined {
	return sectionTypes.find(s => s.type === type)
}

let _nextId = 0
export function generateSectionId(): string {
	return `sec_${Date.now().toString(36)}_${(++_nextId).toString(36)}`
}

export function createDefaultSection(type: ComposableSection['type'], order: number): ComposableSection {
	const def = getSectionTypeDefinition(type)
	if (!def) throw new Error(`Unknown section type: ${type}`)
	return {
		id: generateSectionId(),
		type,
		enabled: true,
		order,
		config: { ...def.defaultConfig },
		fields: def.defaultFields.map(f => ({ ...f })),
	}
}
