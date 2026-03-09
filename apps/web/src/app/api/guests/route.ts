import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { guestSchema } from "@hospitality-channels/content-model";
import { generateId } from "@/lib/id";

export async function GET() {
  const guests = await db.select().from(schema.guests);
  return NextResponse.json(guests);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = guestSchema.parse(body);

  const guest = {
    id: generateId(),
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    displayName: parsed.displayName ?? null,
    arrivalDate: parsed.arrivalDate ?? null,
    departureDate: parsed.departureDate ?? null,
    notes: parsed.notes ?? null,
  };

  await db.insert(schema.guests).values(guest);
  return NextResponse.json(guest, { status: 201 });
}
