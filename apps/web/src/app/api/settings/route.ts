import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const db = await getDb();
  const rows = await db.select().from(schema.settings);
  const result: Record<string, string> = {};
  for (const row of rows) {
    if (row.value !== null) {
      result[row.key] = row.value;
    }
  }
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  const db = await getDb();
  const body = (await request.json()) as Record<string, string>;

  const now = new Date().toISOString();
  for (const [key, value] of Object.entries(body)) {
    const [existing] = await db
      .select()
      .from(schema.settings)
      .where(eq(schema.settings.key, key))
      .limit(1);
    if (existing) {
      await db
        .update(schema.settings)
        .set({ value, updatedAt: now })
        .where(eq(schema.settings.key, key));
    } else {
      await db.insert(schema.settings).values({ key, value, updatedAt: now });
    }
  }

  return NextResponse.json({ success: true });
}
