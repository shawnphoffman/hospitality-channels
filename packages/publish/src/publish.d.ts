import type { PublishProfile } from "@hospitality-channels/content-model";
export interface PublishArtifactInput {
    sourcePath: string;
    pageId: string;
    pageTitle: string;
    profile: PublishProfile;
    posterPath?: string;
    durationSec: number;
}
export interface PublishArtifactResult {
    outputPath: string;
    posterPath?: string;
    nfoPath?: string;
    success: boolean;
    error?: string;
}
export declare function publishArtifact(input: PublishArtifactInput): Promise<PublishArtifactResult>;
//# sourceMappingURL=publish.d.ts.map