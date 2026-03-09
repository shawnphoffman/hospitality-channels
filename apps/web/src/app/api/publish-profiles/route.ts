import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { generateId } from "@/lib/id";

export async function GET() {
  const profiles = await db.select().from(schema.publishProfiles);
  return NextResponse.json(profiles);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.name || !body.exportPath) {
    return NextResponse.json(
      { error: "name and exportPath are required" },
      { status: 400 }
    );
  }

  const profile = {
    id: generateId(),
    name: body.name,
    exportPath: body.exportPath,
    outputFormat: body.outputFormat || "mp4",
    lineupType: body.lineupType || null,
    roomScope: body.roomScope || null,
    fileNamingPattern: body.fileNamingPattern || null,
  };

  await db.insert(schema.publishProfiles).values(profile);
  return NextResponse.json(profile, { status: 201 });
}
