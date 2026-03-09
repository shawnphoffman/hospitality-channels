import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get("pageId");

  let query = db.select().from(schema.jobs).orderBy(desc(schema.jobs.createdAt));

  if (pageId) {
    query = query.where(eq(schema.jobs.pageId, pageId)) as typeof query;
  }

  const jobs = await query.limit(50);
  return NextResponse.json(jobs);
}
