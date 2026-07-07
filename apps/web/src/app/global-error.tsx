'use client'

import { useEffect } from 'react'

// Catches errors thrown in the root layout, which segment-level error boundaries cannot reach.
// Must render its own <html>/<body> because it replaces the root layout entirely.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error(error)
	}, [error])

	return (
		<html lang="en" style={{ backgroundColor: '#020617' }}>
			<body style={{ backgroundColor: '#020617' }}>
				<div
					style={{
						minHeight: '100vh',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						padding: '1.5rem',
						fontFamily: 'system-ui, sans-serif',
						color: '#e2e8f0',
					}}
				>
					<div
						style={{
							width: '100%',
							maxWidth: '28rem',
							borderRadius: '0.75rem',
							border: '1px solid #1e293b',
							backgroundColor: '#0f172a',
							padding: '1.5rem',
							textAlign: 'center',
						}}
					>
						<h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#fff', margin: 0 }}>Something went wrong</h2>
						<p style={{ marginTop: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>
							The app hit an unexpected error. Try again, or reload the page.
						</p>
						{error.message && (
							<p
								style={{
									marginTop: '0.75rem',
									borderRadius: '0.5rem',
									backgroundColor: 'rgba(30,41,59,0.6)',
									padding: '0.5rem 0.75rem',
									fontFamily: 'monospace',
									fontSize: '0.75rem',
									color: '#64748b',
								}}
							>
								{error.message}
							</p>
						)}
						<button
							onClick={reset}
							style={{
								marginTop: '1.25rem',
								borderRadius: '0.5rem',
								backgroundColor: '#2563eb',
								padding: '0.5rem 1rem',
								fontSize: '0.875rem',
								fontWeight: 500,
								color: '#fff',
								border: 'none',
								cursor: 'pointer',
							}}
						>
							Try again
						</button>
					</div>
				</div>
			</body>
		</html>
	)
}
