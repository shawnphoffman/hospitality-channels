import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const { artifactId, profileId } = body as {
    artifactId: string;
    profileId: string;
  };

  if (!artifactId || !profileId) {
    return NextResponse.json(
      { error: "artifactId and profileId are required" },
      { status: 400 }
    );
  }

  // MVP: enqueue a publish job
  const job = {
    id: `publish-${Date.now().toString(36)}`,
    artifactId,
    profileId,
    status: "queued" as const,
    createdAt: new Date().toISOString(),
  };

  // TODO: integrate with actual job queue / worker
  return NextResponse.json(job, { status: 202 });
}
