import { spawn } from 'node:child_process'

export interface FfmpegRunOptions {
	args: string[]
	timeoutMs: number
	onStderr?: (chunk: string) => void
}

export interface FfmpegRunResult {
	success: boolean
	error?: string
}

export async function runFfmpeg(opts: FfmpegRunOptions): Promise<FfmpegRunResult> {
	return new Promise(resolve => {
		const proc = spawn('ffmpeg', opts.args, { stdio: ['ignore', 'pipe', 'pipe'] })
		let stderr = ''
		let timedOut = false
		let settled = false

		const timer = setTimeout(() => {
			timedOut = true
			proc.kill('SIGKILL')
		}, opts.timeoutMs)

		const settle = (result: FfmpegRunResult) => {
			if (settled) return
			settled = true
			clearTimeout(timer)
			resolve(result)
		}

		proc.stderr?.on('data', (chunk: Buffer) => {
			const s = chunk.toString()
			stderr += s
			opts.onStderr?.(s)
		})

		proc.on('close', code => {
			if (timedOut) {
				settle({ success: false, error: `ffmpeg timed out after ${opts.timeoutMs}ms` })
				return
			}
			if (code === 0) {
				settle({ success: true })
				return
			}
			settle({ success: false, error: stderr.slice(-500) })
		})

		proc.on('error', err => {
			settle({ success: false, error: err.message })
		})
	})
}
