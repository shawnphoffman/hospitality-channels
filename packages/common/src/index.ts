export const RENDER_RESOLUTION = {
  width: 1920,
  height: 1080,
} as const;

export const RENDER_DEFAULTS = {
  durationSec: 30,
  fps: 30,
} as const;

export type EnvConfig = {
  NODE_ENV: "development" | "production" | "test";
};

export function getEnvConfig(): EnvConfig {
  return {
    NODE_ENV: (process.env.NODE_ENV ?? "development") as EnvConfig["NODE_ENV"],
  };
}

const isProduction = (process.env.NODE_ENV ?? "development") === "production";

export const PATHS = {
  database: isProduction ? "/data/guest-tv-pages.db" : "data/guest-tv-pages.db",
  assets: isProduction ? "/data/assets" : "./data/assets",
  renders: isProduction ? "/data/renders" : "./renders",
  exports: isProduction ? "/exports" : "./exports",
} as const;

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export function createLogger(name: string, level: LogLevel = "info") {
  const threshold = LOG_LEVELS[level] ?? 1;

  function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
    if ((LOG_LEVELS[level] ?? 1) < threshold) return;
    const timestamp = new Date().toISOString();
    const payload = { timestamp, level, name, message, ...data };
    const line = JSON.stringify(payload);
    if (level === "error") {
      console.error(line);
    } else {
      console.log(line);
    }
  }

  return {
    debug: (msg: string, data?: Record<string, unknown>) => log("debug", msg, data),
    info: (msg: string, data?: Record<string, unknown>) => log("info", msg, data),
    warn: (msg: string, data?: Record<string, unknown>) => log("warn", msg, data),
    error: (msg: string, data?: Record<string, unknown>) => log("error", msg, data),
  };
}
