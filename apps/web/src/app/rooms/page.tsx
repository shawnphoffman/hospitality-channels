export const dynamic = 'force-dynamic';

import { db, schema } from "@/db";

export default async function RoomsPage() {
  const allRooms = await db.select().from(schema.rooms);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Rooms</h2>
      </div>
      {allRooms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
          <p className="text-slate-400">No rooms configured yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allRooms.map((room) => (
            <div
              key={room.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <h3 className="font-semibold text-white">{room.name}</h3>
              <p className="text-xs text-slate-400">{room.slug}</p>
              {room.notes && (
                <p className="mt-2 text-sm text-slate-500">{room.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
