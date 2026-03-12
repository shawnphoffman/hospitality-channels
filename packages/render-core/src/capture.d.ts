export interface CaptureOptions {
    url: string;
    outputPath: string;
    durationSec?: number;
    fps?: number;
    width?: number;
    height?: number;
}
export interface CaptureResult {
    outputPath: string;
    durationSec: number;
    trimSec: number;
    success: boolean;
    error?: string;
}
export declare function capturePageVideo(options: CaptureOptions): Promise<CaptureResult>;
//# sourceMappingURL=capture.d.ts.map