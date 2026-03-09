import { NextResponse } from "next/server";
import { db, schema } from "@/db";

export async function GET() {
  const assets = await db.select().from(schema.assets);
  return NextResponse.json(assets);
}

// File upload would be handled via multipart form data in a full implementation
export async function POST() {
  return NextResponse.json(
    { error: "File upload not yet implemented. Use multipart form data." },
    { status: 501 }
  );
}
