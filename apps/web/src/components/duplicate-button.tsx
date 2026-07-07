'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface DuplicateButtonProps {
	/** POST endpoint that creates the copy and returns it (with an id). */
	endpoint: string
	/** Optional JSON body for the duplicate request. */
	body?: Record<string, unknown>
	/** When set, navigate to `${hrefBase}/${newId}` after duplicating; otherwise refresh the current page. */
	hrefBase?: string
	label?: string
	className?: string
}

const DEFAULT_CLASSES =
	'rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-50'

export function DuplicateButton({ endpoint, body, hrefBase, label = 'Duplicate', className }: DuplicateButtonProps) {
	const router = useRouter()
	const [busy, setBusy] = useState(false)

	const handleClick = async () => {
		setBusy(true)
		try {
			const res = await fetch(endpoint, {
				method: 'POST',
				...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
			})
			if (!res.ok) {
				const data = await res.json().catch(() => ({}))
				alert(data.error || 'Duplicate failed')
				return
			}
			const data = await res.json()
			if (hrefBase && data.id) {
				router.push(`${hrefBase}/${data.id}`)
			} else {
				router.refresh()
			}
		} catch {
			alert('Duplicate failed')
		} finally {
			setBusy(false)
		}
	}

	return (
		<button onClick={handleClick} disabled={busy} className={className ?? DEFAULT_CLASSES}>
			{busy ? 'Duplicating...' : label}
		</button>
	)
}
