export const dynamic = "force-dynamic";

import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { notFound } from "next/navigation";
import { RenderScene } from "./render-scene";

export default async function RenderPage({
  params,
}: {
  params: { id: string };
}) {
  const [page] = await db
    .select()
    .from(schema.pages)
    .where(eq(schema.pages.id, params.id))
    .limit(1);

  if (!page) notFound();

  const [dbTemplate] = await db
    .select()
    .from(schema.templates)
    .where(eq(schema.templates.id, page.templateId))
    .limit(1);

  if (!dbTemplate) notFound();

  let room: { name: string } | null = null;
  if (page.roomId) {
    const [r] = await db
      .select()
      .from(schema.rooms)
      .where(eq(schema.rooms.id, page.roomId))
      .limit(1);
    if (r) room = r;
  }

  const dataJson = (page.dataJson ?? {}) as Record<string, string>;

  return (
    <RenderScene
      templateSlug={dbTemplate.slug}
      data={dataJson}
      room={room}
    />
  );
}
