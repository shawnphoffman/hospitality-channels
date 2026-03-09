export const dynamic = "force-dynamic";

import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { PublishWorkflow } from "./publish-workflow";

export default async function PublishPage() {
  const profiles = await db.select().from(schema.publishProfiles);
  const artifacts = await db
    .select()
    .from(schema.publishedArtifacts)
    .orderBy(desc(schema.publishedArtifacts.publishedAt));

  const renderJobs = await db
    .select()
    .from(schema.jobs)
    .where(eq(schema.jobs.type, "render"))
    .orderBy(desc(schema.jobs.createdAt));

  const completedRenders = renderJobs.filter(
    (j) => j.status === "completed" && j.outputPath
  );

  const pages = await db.select().from(schema.pages);

  const pagesWithRenders = completedRenders
    .map((job) => {
      const page = pages.find((p) => p.id === job.pageId);
      if (!page) return null;
      return {
        pageId: page.id,
        pageTitle: page.title,
        pageSlug: page.slug,
        renderJobId: job.id,
        outputPath: job.outputPath!,
        renderedAt: job.completedAt ?? job.createdAt,
      };
    })
    .filter(Boolean) as Array<{
      pageId: string;
      pageTitle: string;
      pageSlug: string;
      renderJobId: string;
      outputPath: string;
      renderedAt: string;
    }>;

  const artifactsWithDetails = artifacts.map((a) => {
    const page = pages.find((p) => p.id === a.pageId);
    const profile = profiles.find((p) => p.id === a.publishProfileId);
    return {
      ...a,
      pageTitle: page?.title ?? a.pageId,
      profileName: profile?.name ?? a.publishProfileId,
    };
  });

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">Publish</h2>
      <PublishWorkflow
        profiles={profiles.map((p) => ({
          id: p.id,
          name: p.name,
          exportPath: p.exportPath,
          fileNamingPattern: p.fileNamingPattern,
        }))}
        renderedPages={pagesWithRenders}
        artifacts={artifactsWithDetails.map((a) => ({
          id: a.id,
          pageTitle: a.pageTitle,
          profileName: a.profileName,
          outputPath: a.outputPath,
          durationSec: a.durationSec,
          status: a.status,
          publishedAt: a.publishedAt,
        }))}
      />
    </div>
  );
}
