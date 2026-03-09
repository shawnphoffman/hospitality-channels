import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const [page] = await db
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.id, params.id))
    .limit(1);

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  return NextResponse.json(page);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const [existing] = await db
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.id, params.id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const body = await request.json();
  const now = new Date().toISOString();

  await db
    .update(schema.pages)
    .set({
      title: body.title ?? existing.title,
      slug: body.slug ?? existing.slug,
      roomId: body.roomId !== undefined ? body.roomId : existing.roomId,
      guestId: body.guestId !== undefined ? body.guestId : existing.guestId,
      themeId: body.themeId !== undefined ? body.themeId : existing.themeId,
      dataJson: body.dataJson ?? existing.dataJson,
      animationProfile: body.animationProfile !== undefined ? body.animationProfile : existing.animationProfile,
      defaultDurationSec: body.defaultDurationSec ?? existing.defaultDurationSec,
      status: body.status ?? existing.status,
      updatedAt: now,
    })
    .where(eq(schema.pages.id, params.id));

  const [updated] = await db
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.id, params.id))
    .limit(1);

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const [existing] = await db
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.id, params.id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  await db.delete(schema.pages).where(eq(schema.pages.id, params.id));
  return NextResponse.json({ success: true });
}
