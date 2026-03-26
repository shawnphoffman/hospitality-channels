export const dynamic = 'force-dynamic'

import { eq, asc } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { notFound } from 'next/navigation'
import { RenderScene } from '../../../clips/[id]/render/render-scene'

/**
 * Renders a single clip from a program, selected by `clipIndex` query param.
 * The worker calls this endpoint once per clip in the program to capture
 * individual screenshots that are later stitched into the final video.
 *
 * URL: /programs/{programId}/render?clipIndex=0
 */
export default async function ProgramRenderPage({
	params,
	searchParams,
}: {
	params: { id: string }
	searchParams: { clipIndex?: string }
}) {
	const db = await getDb()

	const [program] = await db.select().from(schema.programs).where(eq(schema.programs.id, params.id)).limit(1)
	if (!program) notFound()

	const programClips = await db
		.select()
		.from(schema.programClips)
		.where(eq(schema.programClips.programId, params.id))
		.orderBy(asc(schema.programClips.position))

	if (programClips.length === 0) notFound()

	const clipIndex = parseInt(searchParams.clipIndex ?? '0', 10)
	const programClip = programClips[clipIndex]
	if (!programClip) notFound()

	const [clip] = await db.select().from(schema.clips).where(eq(schema.clips.id, programClip.clipId)).limit(1)
	if (!clip) notFound()

	const [dbTemplate] = await db.select().from(schema.templates).where(eq(schema.templates.id, clip.templateId)).limit(1)
	if (!dbTemplate) notFound()

	const dataJson = (clip.dataJson ?? {}) as Record<string, string>

	return <RenderScene templateSlug={dbTemplate.slug} data={dataJson} />
}
