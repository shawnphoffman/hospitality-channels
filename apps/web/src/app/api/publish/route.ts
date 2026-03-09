import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { generateId } from "@/lib/id";

export async function POST(request: Request) {
  const body = await request.json();
  const { pageId, profileId } = body as { pageId: string; profileId: string };

  if (!pageId || !profileId) {
    return NextResponse.json(
      { error: "pageId and profileId are required" },
      { status: 400 }
    );
  }

  const [page] = await db
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.id, pageId))
    .limit(1);

  if (!page) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }

  const [profile] = await db
    .select()
    .from(schema.publishProfiles)
    .where(eq(schema.publishProfiles.id, profileId))
    .limit(1);

  if (!profile) {
    return NextResponse.json({ error: "Publish profile not found" }, { status: 404 });
  }

  const renderJob = await db
    .select()
    .from(schema.jobs)
    .where(eq(schema.jobs.pageId, pageId))
    .orderBy(schema.jobs.createdAt)
    .limit(1);

  const latestRender = renderJob.find(
    (j) => j.type === "render" && j.status === "completed" && j.outputPath
  );

  if (!latestRender?.outputPath) {
    return NextResponse.json(
      { error: "No completed render found for this page. Render the page first." },
      { status: 400 }
    );
  }

  const job = {
    id: generateId(),
    type: "publish",
    pageId,
    profileId,
    payload: {
      sourcePath: latestRender.outputPath,
      pageTitle: page.title,
      pageSlug: page.slug,
      durationSec: page.defaultDurationSec ?? 30,
      exportPath: profile.exportPath,
      fileNamingPattern: profile.fileNamingPattern,
      outputFormat: profile.outputFormat,
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
