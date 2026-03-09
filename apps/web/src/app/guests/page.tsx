export const dynamic = 'force-dynamic';

import { db, schema } from "@/db";

export default async function GuestsPage() {
  const allGuests = await db.select().from(schema.guests);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Guests</h2>
      </div>
      {allGuests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 p-12 text-center">
          <p className="text-slate-400">No guest records yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allGuests.map((guest) => (
            <div
              key={guest.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <h3 className="font-semibold text-white">
                {guest.displayName || `${guest.firstName} ${guest.lastName}`}
              </h3>
              {guest.arrivalDate && (
                <p className="mt-1 text-xs text-slate-400">
                  {guest.arrivalDate}
                  {guest.departureDate ? ` — ${guest.departureDate}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
