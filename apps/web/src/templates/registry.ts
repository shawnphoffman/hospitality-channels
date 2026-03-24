import type { TemplateSceneEntry } from './types'
import { WelcomeScene } from './welcome'
import { HouseGuideScene } from './house-guide'
import { HotelWelcomeScene } from './hotel-welcome'

const sceneRegistry: Record<string, TemplateSceneEntry> = {
	welcome: { scene: WelcomeScene },
	'house-guide': { scene: HouseGuideScene },
	'hotel-welcome': { scene: HotelWelcomeScene },
}

export function getTemplateScenes(slug: string): TemplateSceneEntry | undefined {
	return sceneRegistry[slug]
}

export function getRegisteredTemplateSlugs(): string[] {
	return Object.keys(sceneRegistry)
}
