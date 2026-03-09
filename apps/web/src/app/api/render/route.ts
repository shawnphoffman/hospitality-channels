import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { pageId, durationSec } = body as { pageId: string; durationSec?: number };

  if (!pageId) {
    return NextResponse.json({ error: "pageId is required" }, { status: 400 });
  }

  // MVP: enqueue a render job (in-memory for now)
  // In production, this would push to a job queue consumed by the worker
  const job = {
    id: `render-${Date.now().toString(36)}`,
    pageId,
    durationSec: durationSec ?? 30,
    status: "queued" as const,
    createdAt: new Date().toISOString(),
  };

  // TODO: integrate with actual job queue / worker
  return NextResponse.json(job, { status: 202 });
}
