'use client'

import { useEffect } from 'react'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error(error)
	}, [error])

	return (
		<div className="flex min-h-[60vh] items-center justify-center">
			<div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 text-center">
				<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-950">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width={24}
						height={24}
						viewBox="0 0 24 24"
						fill="none"
						stroke="#f87171"
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<circle cx="12" cy="12" r="10" />
						<line x1="12" y1="8" x2="12" y2="12" />
						<line x1="12" y1="16" x2="12.01" y2="16" />
					</svg>
				</div>
				<h2 className="text-lg font-bold text-white">Something went wrong</h2>
				<p className="mt-1 text-sm text-slate-400">
					This page hit an unexpected error. Your data is safe — try again, and if it keeps happening, reload the app.
				</p>
				{error.message && <p className="mt-3 rounded-lg bg-slate-800/60 px-3 py-2 font-mono text-xs text-slate-500">{error.message}</p>}
				<div className="mt-5 flex justify-center gap-2">
					<button
						onClick={reset}
						className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
					>
						Try again
					</button>
					<button
						onClick={() => window.location.reload()}
						className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
					>
						Reload
					</button>
				</div>
			</div>
		</div>
	)
}
