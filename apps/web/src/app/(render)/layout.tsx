export default function RenderLayout({ children }: { children: React.ReactNode }) {
	return (
		<div
			style={{
				width: '1920px',
				height: '1080px',
				overflow: 'hidden',
				background: '#0f172a',
			}}
		>
			{children}
		</div>
	)
}
