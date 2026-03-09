import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const [room] = await db
    .select()
    .from(schema.rooms)
    .where(eq(schema.rooms.id, params.id))
    .limit(1);

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  return NextResponse.json(room);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const [existing] = await db
    .select()
    .from(schema.rooms)
    .where(eq(schema.rooms.id, params.id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  const body = await request.json();

  await db
    .update(schema.rooms)
    .set({
      name: body.name ?? existing.name,
      slug: body.slug ?? existing.slug,
      notes: body.notes !== undefined ? body.notes : existing.notes,
      defaultChannelProfileId:
        body.defaultChannelProfileId !== undefined
          ? body.defaultChannelProfileId
          : existing.defaultChannelProfileId,
      defaultThemeId:
        body.defaultThemeId !== undefined
          ? body.defaultThemeId
          : existing.defaultThemeId,
    })
    .where(eq(schema.rooms.id, params.id));

  const [updated] = await db
    .select()
    .from(schema.rooms)
    .where(eq(schema.rooms.id, params.id))
    .limit(1);

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const [existing] = await db
    .select()
    .from(schema.rooms)
    .where(eq(schema.rooms.id, params.id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  await db.delete(schema.rooms).where(eq(schema.rooms.id, params.id));
  return NextResponse.json({ success: true });
}
