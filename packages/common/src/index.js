import { join } from "node:path";
export const RENDER_RESOLUTION = {
    width: 1920,
    height: 1080,
};
export const RENDER_DEFAULTS = {
    durationSec: 30,
    fps: 30,
};
export function getEnvConfig() {
    return {
        NODE_ENV: (process.env.NODE_ENV ?? "development"),
    };
}
const isProduction = (process.env.NODE_ENV ?? "development") === "production";
/** In development, use repo-root/data so web and worker (running from apps/*) share one DB. */
const devDatabase = join(process.cwd(), "..", "data", "guest-tv-pages.db");
export const PATHS = {
    database: isProduction ? "/data/guest-tv-pages.db" : devDatabase,
    assets: isProduction ? "/data/assets" : "./data/assets",
    renders: isProduction ? "/data/renders" : "./renders",
    exports: isProduction ? "/exports" : "./exports",
};
const LOG_LEVELS = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
export function createLogger(name, level = "info") {
    const threshold = LOG_LEVELS[level] ?? 1;
    function log(level, message, data) {
        if ((LOG_LEVELS[level] ?? 1) < threshold)
            return;
        const timestamp = new Date().toISOString();
        const payload = { timestamp, level, name, message, ...data };
        const line = JSON.stringify(payload);
        if (level === "error") {
            console.error(line);
        }
        else {
            console.log(line);
        }
    }
    return {
        debug: (msg, data) => log("debug", msg, data),
        info: (msg, data) => log("info", msg, data),
        warn: (msg, data) => log("warn", msg, data),
        error: (msg, data) => log("error", msg, data),
    };
}
//# sourceMappingURL=index.js.map