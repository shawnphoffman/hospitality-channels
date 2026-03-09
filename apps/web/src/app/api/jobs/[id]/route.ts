import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const [job] = await db
    .select()
    .from(schema.jobs)
    .where(eq(schema.jobs.id, params.id))
    .limit(1);

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}
