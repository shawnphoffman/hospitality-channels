'use client'

import { ImageField } from './image-field'
import { AudioField } from './audio-field'

interface FieldSchema {
	key: string
	label: string
	type: string
	default?: unknown
	required?: boolean
}

interface TemplateFieldProps {
	field: FieldSchema
	value: string
	onChange: (value: string) => void
	idPrefix?: string
}

export function TemplateField({ field, value, onChange, idPrefix = '' }: TemplateFieldProps) {
	const fieldId = idPrefix ? `${idPrefix}${field.key}` : field.key

	if (field.type === 'image') {
		return (
			<ImageField
				id={fieldId}
				label={field.label}
				value={value}
				onChange={onChange}
				required={field.required}
				placeholder={field.default != null ? String(field.default) : ''}
			/>
		)
	}

	if (field.type === 'audio') {
		return <AudioField id={fieldId} label={field.label} value={value} onChange={onChange} required={field.required} />
	}

	if (field.type === 'boolean') {
		return (
			<div>
				<label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
					<input
						type="checkbox"
						checked={value === 'true'}
						onChange={e => onChange(e.target.checked ? 'true' : 'false')}
						className="rounded border-slate-600 bg-slate-800"
					/>
					{field.label}
				</label>
			</div>
		)
	}

	if (field.type === 'markdown') {
		return (
			<div>
				<label htmlFor={fieldId} className="block text-sm text-slate-400">
					{field.label}
					{field.required && <span className="text-red-400"> *</span>}
				</label>
				<textarea
					id={fieldId}
					rows={4}
					value={value}
					onChange={e => onChange(e.target.value)}
					placeholder={field.default != null ? String(field.default) : ''}
					className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
				/>
				<p className="mt-1 text-xs text-slate-500">Supports **bold**, *italic*, headings (#), and lists</p>
			</div>
		)
	}

	if (field.type === 'textarea') {
		return (
			<div>
				<label htmlFor={fieldId} className="block text-sm text-slate-400">
					{field.label}
					{field.required && <span className="text-red-400"> *</span>}
				</label>
				<textarea
					id={fieldId}
					rows={4}
					value={value}
					onChange={e => onChange(e.target.value)}
					placeholder={field.default != null ? String(field.default) : ''}
					className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
				/>
			</div>
		)
	}

	return (
		<div>
			<label htmlFor={fieldId} className="block text-sm text-slate-400">
				{field.label}
				{field.required && <span className="text-red-400"> *</span>}
			</label>
			<input
				id={fieldId}
				type="text"
				value={value}
				onChange={e => onChange(e.target.value)}
				placeholder={field.default != null ? String(field.default) : ''}
				className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
			/>
		</div>
	)
}
