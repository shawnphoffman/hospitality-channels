import type { TemplateSceneEntry } from './types'
import { WelcomeScene } from './welcome'
import { HouseGuideScene } from './house-guide'
import { HouseGuideImageLeftScene } from './house-guide-image-left'
import { HouseGuideImageRightScene } from './house-guide-image-right'
import { HotelWelcomeScene } from './hotel-welcome'
import { DailyAgendaScene } from './daily-agenda'
import { LocalInfoScene } from './local-info'
import { AmenitiesScene } from './amenities'
import { CheckoutScene } from './checkout'
import { ContactDirectoryScene } from './contact-directory'
import { EmergencyInfoScene } from './emergency-info'
import { ChannelOfflineScene } from './channel-offline'

const sceneRegistry: Record<string, TemplateSceneEntry> = {
	welcome: { scene: WelcomeScene },
	'house-guide': { scene: HouseGuideScene },
	'house-guide-image-left': { scene: HouseGuideImageLeftScene },
	'house-guide-image-right': { scene: HouseGuideImageRightScene },
	'hotel-welcome': { scene: HotelWelcomeScene },
	'daily-agenda': { scene: DailyAgendaScene },
	'local-info': { scene: LocalInfoScene },
	amenities: { scene: AmenitiesScene },
	checkout: { scene: CheckoutScene },
	'contact-directory': { scene: ContactDirectoryScene },
	'emergency-info': { scene: EmergencyInfoScene },
	'channel-offline': { scene: ChannelOfflineScene },
}

/** Returns the scene entry for a builtin template slug. Returns undefined for composable templates. */
export function getTemplateScenes(slug: string): TemplateSceneEntry | undefined {
	return sceneRegistry[slug]
}

export function getRegisteredTemplateSlugs(): string[] {
	return Object.keys(sceneRegistry)
}

/** Check if a slug belongs to a builtin template */
export function isBuiltinTemplate(slug: string): boolean {
	return slug in sceneRegistry
}
