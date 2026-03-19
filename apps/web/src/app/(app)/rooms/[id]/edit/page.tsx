export const dynamic = 'force-dynamic'

import { eq } from 'drizzle-orm'
import { getDb, schema } from '@/db'
import { notFound } from 'next/navigation'
import { RoomForm } from '../../room-form'

export default async function EditRoomPage({ params }: { params: { id: string } }) {
	const db = await getDb()
	const [room] = await db.select().from(schema.rooms).where(eq(schema.rooms.id, params.id)).limit(1)

	if (!room) notFound()

	return (
		<div>
			<h2 className="mb-6 text-2xl font-bold text-white">Edit Room</h2>
			<RoomForm
				mode="edit"
				room={{
					id: room.id,
					name: room.name,
					slug: room.slug,
					notes: room.notes ?? '',
				}}
			/>
		</div>
	)
}
