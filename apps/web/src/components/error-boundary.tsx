'use client'

import { Component, type ReactNode } from 'react'

interface ErrorBoundaryProps {
	children: ReactNode
	/** Short label for what failed, e.g. "scene preview" (default "content") */
	label?: string
	className?: string
}

interface ErrorBoundaryState {
	error: Error | null
}

/**
 * Catches render errors in its subtree and shows a compact fallback
 * instead of crashing the whole page. Intended for interactive preview
 * surfaces only; render (headless) routes should fail loudly instead.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
	state: ErrorBoundaryState = { error: null }

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { error }
	}

	render() {
		if (this.state.error) {
			return (
				<div className={this.props.className ?? 'flex h-full w-full items-center justify-center p-4'}>
					<div className="max-w-full rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
						<p className="font-medium">Failed to render {this.props.label ?? 'content'}</p>
						<p className="mt-1 break-words text-xs text-red-400">{this.state.error.message}</p>
					</div>
				</div>
			)
		}
		return this.props.children
	}
}
