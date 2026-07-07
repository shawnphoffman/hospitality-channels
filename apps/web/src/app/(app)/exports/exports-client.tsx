'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Artifact {
	id: string
	clipId: string | null
	clipTitle: string | null
	programId?: string | null
	programTitle?: string | null
	profileName: string
	outputPath: string
	durationSec: number
	status: string
	publishedAt: string | null
	allowDownload?: boolean
}

interface FileEntry {
	name: string
	path: string
	size: number
	modifiedAt: string
	directory: 'renders' | 'exports'
	hasArtifactRef: boolean
	hasJobRef: boolean
	artifactId?: string
	title?: string
}

interface ExportsClientProps {
	artifacts: Artifact[]
	supersededCount?: number
}

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${(bytes / Math.pow(k, i)).toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`
}

function timeAgo(dateStr: string): string {
	const date = new Date(dateStr)
	const now = new Date()
	const diffMs = now.getTime() - date.getTime()
	const diffMin = Math.floor(diffMs / 60000)
	if (diffMin < 1) return 'just now'
	if (diffMin < 60) return `${diffMin}m ago`
	const diffHrs = Math.floor(diffMin / 60)
	if (diffHrs < 24) return `${diffHrs}h ago`
	const diffDays = Math.floor(diffHrs / 24)
	if (diffDays < 30) return `${diffDays}d ago`
	return date.toLocaleDateString()
}

export function ExportsClient({ artifacts, supersededCount = 0 }: ExportsClientProps) {
	const router = useRouter()

	// Artifact deletion state
	const [deletingArtifactId, setDeletingArtifactId] = useState<string | null>(null)

	// File management state
	const [files, setFiles] = useState<FileEntry[]>([])
	const [loadingFiles, setLoadingFiles] = useState(false)
	const [filesLoaded, setFilesLoaded] = useState(false)
	const [deletingFile, setDeletingFile] = useState<string | null>(null)

	const fetchFiles = useCallback(async () => {
		setLoadingFiles(true)
		try {
			const res = await fetch('/api/files')
			if (res.ok) {
				setFiles(await res.json())
				setFilesLoaded(true)
			}
		} catch {
			// ignore
		} finally {
			setLoadingFiles(false)
		}
	}, [])

	const handleDeleteArtifact = async (artifactId: string) => {
		setDeletingArtifactId(artifactId)
		try {
			const res = await fetch(`/api/artifacts/${artifactId}`, { method: 'DELETE' })
			if (res.ok) {
				router.refresh()
				// Also refresh files if loaded
				if (filesLoaded) fetchFiles()
			}
		} catch {
			// ignore
		} finally {
			setDeletingArtifactId(null)
		}
	}

	const handleDeleteFile = async (filePath: string, cleanupRefs: boolean) => {
		setDeletingFile(filePath)
		try {
			const res = await fetch('/api/files/delete', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ filePath, cleanupRefs }),
			})
			if (res.ok) {
				setFiles(prev => prev.filter(f => f.path !== filePath))
				if (cleanupRefs) router.refresh()
			}
		} catch {
			// ignore
		} finally {
			setDeletingFile(null)
		}
	}

	const handleDeleteAllUnreferenced = async (directory: 'renders' | 'exports') => {
		const unreferenced = files.filter(f => f.directory === directory && !f.hasArtifactRef && !f.hasJobRef)
		for (const file of unreferenced) {
			await handleDeleteFile(file.path, false)
		}
	}

	const renderFiles = files.filter(f => f.directory === 'renders')
	const exportFiles = files.filter(f => f.directory === 'exports')
	const unreferencedRenders = renderFiles.filter(f => !f.hasArtifactRef && !f.hasJobRef)
	const unreferencedExports = exportFiles.filter(f => !f.hasArtifactRef)

	return (
		<div className="space-y-10">
			{/* Exported Files */}
			<section>
				<div className="mb-4 flex items-center justify-between">
					<div>
						<h3 className="text-lg font-semibold text-slate-200">Exported Files</h3>
						{supersededCount > 0 && (
							<p className="text-xs text-slate-500">
								{supersededCount} superseded export{supersededCount !== 1 ? 's' : ''} hidden
							</p>
						)}
					</div>
				</div>

				{artifacts.length === 0 ? (
					<div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
						<p className="text-slate-400">No exports yet. Render and publish a program to see its files here.</p>
					</div>
				) : (
					<div className="space-y-3">
						{artifacts.map(a => (
							<div key={a.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4">
								<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<p className="font-medium text-white">{a.programTitle ?? a.clipTitle ?? 'Untitled'}</p>
											<span
												className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
													a.status === 'published' ? 'bg-green-900 text-green-300' : 'bg-slate-800 text-slate-400'
												}`}
											>
												{a.status}
											</span>
										</div>
										<p className="mt-0.5 text-xs text-slate-400">
											{a.profileName} &middot; {a.durationSec}s &middot; {a.publishedAt ? new Date(a.publishedAt).toLocaleString() : ''}
										</p>
										<p className="truncate text-xs text-slate-500">{a.outputPath}</p>
									</div>
									<div className="flex shrink-0 gap-2">
										{a.allowDownload && a.status === 'published' && (
											<a
												href={`/api/artifacts/${a.id}/download`}
												download
												className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
											>
												<span className="flex items-center gap-1.5">
													<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
														/>
													</svg>
													Download
												</span>
											</a>
										)}
										<button
											onClick={() => handleDeleteArtifact(a.id)}
											disabled={deletingArtifactId === a.id}
											className="rounded-lg border border-red-900 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-950 disabled:opacity-50"
										>
											{deletingArtifactId === a.id ? 'Deleting...' : 'Delete'}
										</button>
									</div>
								</div>
							</div>
						))}
					</div>
				)}
			</section>

			{/* File Management */}
			<section>
				<div className="mb-4 flex items-center justify-between">
					<div>
						<h3 className="text-lg font-semibold text-slate-200">File Management</h3>
						<p className="text-xs text-slate-500">Scan render and export directories for leftover files</p>
					</div>
					<button
						onClick={fetchFiles}
						disabled={loadingFiles}
						className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
					>
						{loadingFiles ? 'Scanning...' : filesLoaded ? 'Rescan' : 'Scan Directories'}
					</button>
				</div>

				{filesLoaded && (
					<div className="space-y-6">
						{/* Renders */}
						<FileSection
							title="Renders"
							description="Intermediate video files from the render pipeline"
							files={renderFiles}
							unreferencedCount={unreferencedRenders.length}
							onDelete={handleDeleteFile}
							onDeleteAllUnreferenced={() => handleDeleteAllUnreferenced('renders')}
							deletingFile={deletingFile}
						/>

						{/* Exports */}
						<FileSection
							title="Exports"
							description="Published output files in the export directory"
							files={exportFiles}
							unreferencedCount={unreferencedExports.length}
							onDelete={handleDeleteFile}
							onDeleteAllUnreferenced={() => handleDeleteAllUnreferenced('exports')}
							deletingFile={deletingFile}
						/>
					</div>
				)}
			</section>
		</div>
	)
}

function FileSection({
	title,
	description,
	files,
	unreferencedCount,
	onDelete,
	onDeleteAllUnreferenced,
	deletingFile,
}: {
	title: string
	description: string
	files: FileEntry[]
	unreferencedCount: number
	onDelete: (path: string, cleanupRefs: boolean) => void
	onDeleteAllUnreferenced: () => void
	deletingFile: string | null
}) {
	const totalSize = files.reduce((sum, f) => sum + f.size, 0)
	const unreferencedSize = files.filter(f => !f.hasArtifactRef && !f.hasJobRef).reduce((sum, f) => sum + f.size, 0)

	return (
		<div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
			<div className="mb-3 flex items-center justify-between">
				<div>
					<h4 className="font-semibold text-white">
						{title}
						<span className="ml-2 text-sm font-normal text-slate-400">
							{files.length} file{files.length !== 1 ? 's' : ''} &middot; {formatBytes(totalSize)}
						</span>
					</h4>
					<p className="text-xs text-slate-500">{description}</p>
				</div>
				{unreferencedCount > 0 && (
					<button
						onClick={onDeleteAllUnreferenced}
						className="rounded-lg border border-amber-800 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-950"
					>
						Clean up {unreferencedCount} orphan{unreferencedCount !== 1 ? 's' : ''} ({formatBytes(unreferencedSize)})
					</button>
				)}
			</div>

			{files.length === 0 ? (
				<p className="py-4 text-center text-sm text-slate-500">No files found</p>
			) : (
				<div className="space-y-1">
					{files.map(file => {
						const isOrphan = !file.hasArtifactRef && !file.hasJobRef
						return (
							<div
								key={file.path}
								className={`flex items-center gap-3 rounded-lg border p-3 ${
									isOrphan ? 'border-amber-900/40 bg-amber-950/10' : 'border-slate-800 bg-slate-800/30'
								}`}
							>
								<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700/50 text-slate-400">
									<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
										{file.name.endsWith('.mp4') || file.name.endsWith('.mkv') ? (
											<>
												<polygon points="5 3 19 12 5 21 5 3" />
											</>
										) : file.name.endsWith('.nfo') ? (
											<>
												<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
												<polyline points="14 2 14 8 20 8" />
											</>
										) : (
											<>
												<rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
												<circle cx="8.5" cy="8.5" r="1.5" />
												<polyline points="21 15 16 10 5 21" />
											</>
										)}
									</svg>
								</div>
								<div className="min-w-0 flex-1">
									<div className="flex items-center gap-2">
										<p className="truncate text-sm font-medium text-white">{file.name}</p>
										{file.title && <span className="shrink-0 text-xs text-slate-500">{file.title}</span>}
										{isOrphan && (
											<span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
												orphan
											</span>
										)}
										{file.hasArtifactRef && (
											<span className="shrink-0 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400">
												published
											</span>
										)}
									</div>
									<p className="truncate text-xs text-slate-500">
										{formatBytes(file.size)} &middot; {timeAgo(file.modifiedAt)}
									</p>
								</div>
								<button
									onClick={() => onDelete(file.path, file.hasArtifactRef)}
									disabled={deletingFile === file.path}
									className="shrink-0 rounded-lg border border-red-900 px-2.5 py-1 text-xs font-medium text-red-400 transition-colors hover:bg-red-950 disabled:opacity-50"
									title={file.hasArtifactRef ? 'Deletes file and removes artifact record' : 'Deletes file from disk'}
								>
									{deletingFile === file.path ? '...' : 'Delete'}
								</button>
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
