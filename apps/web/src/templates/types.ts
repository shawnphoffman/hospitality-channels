import type { ComponentType } from 'react'

export interface TemplateSceneProps {
	data: Record<string, string>
}

export interface TemplateSceneEntry {
	scene: ComponentType<TemplateSceneProps>
}
