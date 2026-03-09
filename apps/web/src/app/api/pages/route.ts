import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { pageSchema } from "@hospitality-channels/content-model";
import { generateId } from "@/lib/id";

export async function GET() {
  const pages = await db.select().from(schema.pages);
  return NextResponse.json(pages);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = pageSchema.parse(body);
  const now = new Date().toISOString();

  const page = {
    id: generateId(),
    templateId: parsed.templateId,
    slug: parsed.slug,
    title: parsed.title,
    roomId: parsed.roomId ?? null,
    guestId: parsed.guestId ?? null,
    themeId: parsed.themeId ?? null,
    dataJson: parsed.dataJson,
    animationProfile: parsed.animationProfile ?? null,
    defaultDurationSec: parsed.defaultDurationSec,
    status: parsed.status,
    createdAt: now,
    updatedAt: now,
  };

  await db.insert(schema.pages).values(page);
  return NextResponse.json(page, { status: 201 });
}
