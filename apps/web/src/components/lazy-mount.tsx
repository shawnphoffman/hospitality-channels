'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface LazyMountProps {
	children: ReactNode
	/** How far outside the viewport to start mounting (default 200px) */
	rootMargin?: string
	className?: string
	/** Shown before the content mounts (default: neutral slate block) */
	placeholder?: ReactNode
}

/**
 * Defers rendering children until the wrapper scrolls near the viewport.
 * Useful for heavy previews (scaled 1920x1080 iframes/scenes) in long lists.
 * Once mounted, children stay mounted.
 */
export function LazyMount({ children, rootMargin = '200px', className, placeholder }: LazyMountProps) {
	const ref = useRef<HTMLDivElement>(null)
	const [visible, setVisible] = useState(false)

	useEffect(() => {
		if (visible) return
		const el = ref.current
		if (!el) return
		if (typeof IntersectionObserver === 'undefined') {
			setVisible(true)
			return
		}
		const observer = new IntersectionObserver(
			entries => {
				if (entries.some(entry => entry.isIntersecting)) setVisible(true)
			},
			{ rootMargin }
		)
		observer.observe(el)
		return () => observer.disconnect()
	}, [visible, rootMargin])

	return (
		<div ref={ref} className={className}>
			{visible ? children : (placeholder ?? <div className="h-full w-full bg-slate-800/50" />)}
		</div>
	)
}
