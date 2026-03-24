import type { ComponentType } from 'react'

export interface TemplateSceneProps {
	data: Record<string, string>
	renderMode?: boolean
}

export interface TemplateSceneEntry {
	scene: ComponentType<TemplateSceneProps>
}
