export const dynamic = "force-dynamic";

import { db, schema } from "@/db";
import { getTemplateRegistry } from "@hospitality-channels/templates";
import { CreatePageForm } from "./form";

export default async function NewPagePage({
  searchParams,
}: {
  searchParams: { template?: string };
}) {
  const templates = getTemplateRegistry();
  const rooms = await db.select().from(schema.rooms);
  const dbTemplates = await db.select().from(schema.templates);

  const templateOptions = templates.map((t) => {
    const dbMatch = dbTemplates.find((dt) => dt.slug === t.slug);
    return {
      slug: t.slug,
      name: t.name,
      description: t.description ?? "",
      category: t.category ?? "",
      id: dbMatch?.id ?? t.slug,
      fields: (t.schema?.fields ?? []) as Array<{
        key: string;
        label: string;
        type: string;
        default: unknown;
        required?: boolean;
      }>,
    };
  });

  const preselectedSlug = searchParams.template ?? null;

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">Create New Page</h2>
      <CreatePageForm
        templates={templateOptions}
        rooms={rooms.map((r) => ({ id: r.id, name: r.name, slug: r.slug }))}
        preselectedTemplate={preselectedSlug}
      />
    </div>
  );
}
