import type { Template } from "@hospitality-channels/content-model";
import { welcomeTemplate } from "./welcome.js";
import { houseGuideTemplate } from "./house-guide.js";

const templates: (Template & { schema?: Record<string, unknown> })[] = [
  welcomeTemplate,
  houseGuideTemplate,
];

export function getTemplateRegistry(): (Template & { schema?: Record<string, unknown> })[] {
  return templates;
}

export function getTemplateBySlug(slug: string): (Template & { schema?: Record<string, unknown> }) | undefined {
  return templates.find((t) => t.slug === slug);
}
