'use client'

import type { ComposableLayout } from '@hospitality-channels/content-model'
import { HeaderSection } from './sections/header'
import { TextCardSection } from './sections/text-card'
import { ImageBlockSection } from './sections/image-block'
import { QrCodeSection } from './sections/qr-code'

interface ComposableSceneProps {
	layout: ComposableLayout
	data: Record<string, string>
}

const sectionComponents: Record<string, React.ComponentType<{
	data: Record<string, string>
	config: Record<string, unknown>
	fields: Array<{ key: string }>
	hasBg: boolean
	accentColor: string
}>> = {
	'header': HeaderSection,
	'text-card': TextCardSection,
	'image-block': ImageBlockSection,
	'qr-code': QrCodeSection,
}

function getBackgroundStyle(style: ComposableLayout['style']): React.CSSProperties {
	const bg = style.background
	if (bg.type === 'image' && bg.value) {
		return { background: `url(${bg.value}) center / cover no-repeat` }
	}
	if (bg.type === 'gradient') {
		const from = bg.from ?? '#0f172a'
		const to = bg.to ?? '#020617'
		return { background: `linear-gradient(to bottom, ${from}, ${to})` }
	}
	if (bg.type === 'color' && bg.value) {
		return { backgroundColor: bg.value }
	}
	return { background: 'linear-gradient(to bottom, #0f172a, #020617)' }
}

export function ComposableScene({ layout, data }: ComposableSceneProps) {
	const { style, sections } = layout

	// Allow clip-level background image override
	const effectiveStyle = data._background_image
		? { ...style, background: { type: 'image' as const, value: data._background_image } }
		: style
	const hasBgImage = effectiveStyle.background.type === 'image' && Boolean(effectiveStyle.background.value)

	const enabledSections = sections
		.filter(s => s.enabled)
		.sort((a, b) => a.order - b.order)

	return (
		<div
			className="relative flex h-full w-full flex-col text-white"
			style={{
				...getBackgroundStyle(effectiveStyle),
				fontFamily: effectiveStyle.fontFamily || 'Inter, system-ui, sans-serif',
			}}
		>
			{/* Overlay for background images */}
			{hasBgImage && (
				<div
					className="absolute inset-0"
					style={{ background: `rgba(0,0,0,${effectiveStyle.overlayOpacity ?? 0.55})` }}
				/>
			)}

			{/* Content */}
			<div className="relative z-10 flex h-full w-full flex-col">
				{enabledSections.map(section => {
					const Component = sectionComponents[section.type]
					if (!Component) return null
					return (
						<Component
							key={section.id}
							data={data}
							config={section.config}
							fields={section.fields}
							hasBg={hasBgImage}
							accentColor={effectiveStyle.accentColor}
						/>
					)
				})}

				{enabledSections.length === 0 && (
					<div className="flex h-full items-center justify-center text-slate-500">
						<p style={{ fontSize: 32 }}>No sections enabled</p>
					</div>
				)}
			</div>
		</div>
	)
}
