'use client'

import { getTemplateScenes } from '@/templates/registry'
import { ComposableScene } from '@/components/composable-scene'
import type { ComposableLayout } from '@hospitality-channels/content-model'

interface RenderSceneProps {
	templateSlug: string
	data: Record<string, string>
	templateType?: string
	layoutJson?: ComposableLayout | null
}

export function RenderScene({ templateSlug, data, templateType, layoutJson }: RenderSceneProps) {
	if (templateType === 'composable' && layoutJson) {
		return (
			<div style={{ width: 1920, height: 1080, overflow: 'hidden' }}>
				<ComposableScene layout={layoutJson} data={data} />
			</div>
		)
	}

	const entry = getTemplateScenes(templateSlug)
	if (!entry) {
		return (
			<div style={{ width: 1920, height: 1080 }} className="flex items-center justify-center bg-slate-950 text-slate-500">
				<p style={{ fontSize: 32 }}>Unknown template: {templateSlug}</p>
			</div>
		)
	}

	const Scene = entry.scene

	return (
		<div style={{ width: 1920, height: 1080, overflow: 'hidden' }}>
			<Scene data={data} />
		</div>
	)
}
