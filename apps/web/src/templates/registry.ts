import type { TemplateSceneEntry } from './types'
import { WelcomeScene } from './welcome'
import { HouseGuideScene } from './house-guide'
import { HotelWelcomeScene } from './hotel-welcome'
import { DailyAgendaScene } from './daily-agenda'
import { LocalInfoScene } from './local-info'
import { AmenitiesScene } from './amenities'
import { CheckoutScene } from './checkout'
import { ContactDirectoryScene } from './contact-directory'
import { EmergencyInfoScene } from './emergency-info'

const sceneRegistry: Record<string, TemplateSceneEntry> = {
	welcome: { scene: WelcomeScene },
	'house-guide': { scene: HouseGuideScene },
	'hotel-welcome': { scene: HotelWelcomeScene },
	'daily-agenda': { scene: DailyAgendaScene },
	'local-info': { scene: LocalInfoScene },
	amenities: { scene: AmenitiesScene },
	checkout: { scene: CheckoutScene },
	'contact-directory': { scene: ContactDirectoryScene },
	'emergency-info': { scene: EmergencyInfoScene },
}

export function getTemplateScenes(slug: string): TemplateSceneEntry | undefined {
	return sceneRegistry[slug]
}

export function getRegisteredTemplateSlugs(): string[] {
	return Object.keys(sceneRegistry)
}
