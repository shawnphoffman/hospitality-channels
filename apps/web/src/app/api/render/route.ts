import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { generateId } from "@/lib/id";

export async function POST(request: Request) {
  const body = await request.json();
  const { pageId, durationSec } = body as { pageId: string; durationSec?: number };

  if (!pageId) {
    return NextResponse.json({ error: "pageId is required" }, { status: 400 });
  }

  const [page] = await db
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.id, pageId))
    .limit(1);

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const previewUrl = `${appUrl}/pages/${pageId}/render`;

  const job = {
    id: generateId(),
    type: "render",
    pageId,
    profileId: null,
    payload: {
      url: previewUrl,
      durationSec: durationSec ?? page.defaultDurationSec ?? 30,
      pageTitle: page.title,
      pageSlug: page.slug,
    },
    status: "queued",
    outputPath: null,
    error: null,
    createdAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
  };

  await db.insert(schema.jobs).values(job);

  return NextResponse.json(job, { status: 202 });
}
