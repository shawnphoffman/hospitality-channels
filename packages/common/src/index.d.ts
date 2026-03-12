export declare const RENDER_RESOLUTION: {
    readonly width: 1920;
    readonly height: 1080;
};
export declare const RENDER_DEFAULTS: {
    readonly durationSec: 30;
    readonly fps: 30;
};
export type EnvConfig = {
    NODE_ENV: "development" | "production" | "test";
};
export declare function getEnvConfig(): EnvConfig;
export declare const PATHS: {
    readonly database: string;
    readonly assets: "/data/assets" | "./data/assets";
    readonly renders: "/data/renders" | "./renders";
    readonly exports: "/exports" | "./exports";
};
export type LogLevel = "debug" | "info" | "warn" | "error";
export declare function createLogger(name: string, level?: LogLevel): {
    debug: (msg: string, data?: Record<string, unknown>) => void;
    info: (msg: string, data?: Record<string, unknown>) => void;
    warn: (msg: string, data?: Record<string, unknown>) => void;
    error: (msg: string, data?: Record<string, unknown>) => void;
};
//# sourceMappingURL=index.d.ts.map