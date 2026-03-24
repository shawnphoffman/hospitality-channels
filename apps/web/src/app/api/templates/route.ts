export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getTemplateRegistry } from "@hospitality-channels/templates";

export async function GET() {
  const templates = getTemplateRegistry();
  return NextResponse.json(templates);
}
