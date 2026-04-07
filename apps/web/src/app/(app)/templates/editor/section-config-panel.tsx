'use client'

import type { ComposableSection } from '@hospitality-channels/content-model'

interface SectionConfigPanelProps {
	section: ComposableSection
	onUpdateConfig: (config: Record<string, unknown>) => void
	previewData: Record<string, string>
	onPreviewDataChange: (key: string, value: string) => void
}

export function SectionConfigPanel({ section, onUpdateConfig }: SectionConfigPanelProps) {
	const config = section.config

	return (
		<div className="border-t border-slate-700 px-3 pb-3 pt-2">
			<div className="space-y-2">
				{/* Alignment — all sections */}
				<div>
					<label className="block text-xs text-slate-500">Alignment</label>
					<div className="mt-1 flex gap-1">
						{(['left', 'center', 'right'] as const).map(align => (
							<button
								key={align}
								type="button"
								onClick={() => onUpdateConfig({ alignment: align })}
								className={`rounded px-2.5 py-1 text-xs transition-colors ${
									(config.alignment ?? 'center') === align
										? 'bg-blue-600 text-white'
										: 'bg-slate-700 text-slate-400 hover:text-slate-300'
								}`}
							>
								{align.charAt(0).toUpperCase() + align.slice(1)}
							</button>
						))}
					</div>
				</div>

				{/* Section-specific configs */}
				{section.type === 'header' && (
					<>
						<div>
							<label htmlFor={`${section.id}-fontsize`} className="block text-xs text-slate-500">
								Font Size: {(config.fontSize as number) ?? 64}px
							</label>
							<input
								id={`${section.id}-fontsize`}
								type="range"
								min={32}
								max={120}
								value={(config.fontSize as number) ?? 64}
								onChange={e => onUpdateConfig({ fontSize: parseInt(e.target.value) })}
								className="mt-1 w-full"
							/>
						</div>
						<label className="flex items-center gap-2 text-xs text-slate-400">
							<input
								type="checkbox"
								checked={(config.showDivider as boolean) ?? true}
								onChange={e => onUpdateConfig({ showDivider: e.target.checked })}
								className="rounded border-slate-600 bg-slate-800"
							/>
							Show divider line
						</label>
					</>
				)}

				{section.type === 'text-card' && (
					<>
						<label className="flex items-center gap-2 text-xs text-slate-400">
							<input
								type="checkbox"
								checked={(config.transparentBg as boolean) ?? false}
								onChange={e => onUpdateConfig({ transparentBg: e.target.checked })}
								className="rounded border-slate-600 bg-slate-800"
							/>
							Transparent background
						</label>
						<div>
							<label className="block text-xs text-slate-500">Padding</label>
							<div className="mt-1 flex gap-1">
								{(['compact', 'normal', 'spacious'] as const).map(p => (
									<button
										key={p}
										type="button"
										onClick={() => onUpdateConfig({ padding: p })}
										className={`rounded px-2.5 py-1 text-xs transition-colors ${
											(config.padding ?? 'normal') === p
												? 'bg-blue-600 text-white'
												: 'bg-slate-700 text-slate-400 hover:text-slate-300'
										}`}
									>
										{p.charAt(0).toUpperCase() + p.slice(1)}
									</button>
								))}
							</div>
						</div>
					</>
				)}

				{section.type === 'image-block' && (
					<>
						<div>
							<label htmlFor={`${section.id}-maxheight`} className="block text-xs text-slate-500">
								Max Height: {(config.maxHeight as number) ?? 600}px
							</label>
							<input
								id={`${section.id}-maxheight`}
								type="range"
								min={200}
								max={900}
								step={50}
								value={(config.maxHeight as number) ?? 600}
								onChange={e => onUpdateConfig({ maxHeight: parseInt(e.target.value) })}
								className="mt-1 w-full"
							/>
						</div>
						<div>
							<label className="block text-xs text-slate-500">Object Fit</label>
							<div className="mt-1 flex gap-1">
								{(['cover', 'contain', 'fill'] as const).map(fit => (
									<button
										key={fit}
										type="button"
										onClick={() => onUpdateConfig({ objectFit: fit })}
										className={`rounded px-2.5 py-1 text-xs transition-colors ${
											(config.objectFit ?? 'cover') === fit
												? 'bg-blue-600 text-white'
												: 'bg-slate-700 text-slate-400 hover:text-slate-300'
										}`}
									>
										{fit.charAt(0).toUpperCase() + fit.slice(1)}
									</button>
								))}
							</div>
						</div>
						<div>
							<label htmlFor={`${section.id}-radius`} className="block text-xs text-slate-500">
								Border Radius: {(config.borderRadius as number) ?? 16}px
							</label>
							<input
								id={`${section.id}-radius`}
								type="range"
								min={0}
								max={48}
								value={(config.borderRadius as number) ?? 16}
								onChange={e => onUpdateConfig({ borderRadius: parseInt(e.target.value) })}
								className="mt-1 w-full"
							/>
						</div>
					</>
				)}

				{section.type === 'qr-code' && (
					<div>
						<label htmlFor={`${section.id}-qrsize`} className="block text-xs text-slate-500">
							QR Size: {(config.size as number) ?? 200}px
						</label>
						<input
							id={`${section.id}-qrsize`}
							type="range"
							min={100}
							max={400}
							step={20}
							value={(config.size as number) ?? 200}
							onChange={e => onUpdateConfig({ size: parseInt(e.target.value) })}
							className="mt-1 w-full"
						/>
					</div>
				)}
			</div>
		</div>
	)
}
