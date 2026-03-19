import type { Template } from '@hospitality-channels/content-model'
import { welcomeTemplate } from './welcome/index.js'
import { houseGuideTemplate } from './house-guide/index.js'
import { hotelWelcomeTemplate } from './hotel-welcome/index.js'

const templates: (Template & { schema?: Record<string, unknown> })[] = [welcomeTemplate, houseGuideTemplate, hotelWelcomeTemplate]

export function getTemplateRegistry(): (Template & {
	schema?: Record<string, unknown>
})[] {
	return templates
}

export function getTemplateBySlug(slug: string): (Template & { schema?: Record<string, unknown> }) | undefined {
	return templates.find(t => t.slug === slug)
}
