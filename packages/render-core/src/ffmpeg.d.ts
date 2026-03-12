export interface FFmpegNormalizeOptions {
    inputPath: string;
    outputPath: string;
    trimSec?: number;
    durationSec?: number;
    fps?: number;
    width?: number;
    height?: number;
}
export declare function normalizeVideo(options: FFmpegNormalizeOptions): Promise<{
    success: boolean;
    error?: string;
}>;
//# sourceMappingURL=ffmpeg.d.ts.map