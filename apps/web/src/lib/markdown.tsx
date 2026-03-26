import type { CSSProperties } from 'react'

function escapeHtml(text: string): string {
	return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

export function renderMarkdown(text: string): string {
	const escaped = escapeHtml(text)
	const lines = escaped.split('\n')
	const output: string[] = []
	let inUl = false
	let inOl = false

	for (const line of lines) {
		const trimmed = line.trim()

		// Close lists if current line is not a list item
		const isUnorderedItem = /^- (.+)/.test(trimmed)
		const isOrderedItem = /^\d+\. (.+)/.test(trimmed)

		if (!isUnorderedItem && inUl) {
			output.push('</ul>')
			inUl = false
		}
		if (!isOrderedItem && inOl) {
			output.push('</ol>')
			inOl = false
		}

		// Headings
		if (/^### (.+)/.test(trimmed)) {
			output.push(`<h3 style="font-size:1.25em;font-weight:bold;margin:0">${trimmed.replace(/^### /, '')}</h3>`)
			continue
		}
		if (/^## (.+)/.test(trimmed)) {
			output.push(`<h2 style="font-size:1.5em;font-weight:bold;margin:0">${trimmed.replace(/^## /, '')}</h2>`)
			continue
		}
		if (/^# (.+)/.test(trimmed)) {
			output.push(`<h1 style="font-size:1.75em;font-weight:bold;margin:0">${trimmed.replace(/^# /, '')}</h1>`)
			continue
		}

		// Unordered list items
		if (isUnorderedItem) {
			if (!inUl) {
				output.push('<ul>')
				inUl = true
			}
			output.push(`<li>${trimmed.replace(/^- /, '')}</li>`)
			continue
		}

		// Ordered list items
		if (isOrderedItem) {
			if (!inOl) {
				output.push('<ol>')
				inOl = true
			}
			output.push(`<li>${trimmed.replace(/^\d+\. /, '')}</li>`)
			continue
		}

		// Empty lines become line breaks
		if (trimmed === '') {
			output.push('<br>')
			continue
		}

		// Regular text
		output.push(trimmed)
		output.push('<br>')
	}

	// Close any open lists
	if (inUl) output.push('</ul>')
	if (inOl) output.push('</ol>')

	let html = output.join('\n')

	// Inline formatting: bold then italic
	html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
	html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

	return html
}

interface SimpleMarkdownProps {
	text: string
	className?: string
	style?: CSSProperties
}

export function SimpleMarkdown({ text, className, style }: SimpleMarkdownProps) {
	if (!text) return null

	const html = renderMarkdown(text)

	return <div className={className} style={style} dangerouslySetInnerHTML={{ __html: html }} />
}
