import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const [existing] = await db
    .select()
    .from(schema.publishProfiles)
    .where(eq(schema.publishProfiles.id, params.id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const body = await request.json();

  await db
    .update(schema.publishProfiles)
    .set({
      name: body.name ?? existing.name,
      exportPath: body.exportPath ?? existing.exportPath,
      outputFormat: body.outputFormat ?? existing.outputFormat,
      lineupType: body.lineupType !== undefined ? body.lineupType : existing.lineupType,
      roomScope: body.roomScope !== undefined ? body.roomScope : existing.roomScope,
      fileNamingPattern: body.fileNamingPattern !== undefined ? body.fileNamingPattern : existing.fileNamingPattern,
    })
    .where(eq(schema.publishProfiles.id, params.id));

  const [updated] = await db
    .select()
    .from(schema.publishProfiles)
    .where(eq(schema.publishProfiles.id, params.id))
    .limit(1);

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const [existing] = await db
    .select()
    .from(schema.publishProfiles)
    .where(eq(schema.publishProfiles.id, params.id))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  await db.delete(schema.publishProfiles).where(eq(schema.publishProfiles.id, params.id));
  return NextResponse.json({ success: true });
}
