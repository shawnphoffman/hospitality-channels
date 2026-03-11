import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: [
    "@hospitality-channels/common",
    "@hospitality-channels/content-model",
    "@hospitality-channels/templates",
    "@hospitality-channels/storage",
    "@hospitality-channels/publish",
    "@hospitality-channels/ui",
  ],
  experimental: {
    externalDir: true,
  },
  webpack: (config) => {
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias["@hospitality-channels/templates"] = path.resolve(
      __dirname,
      "../../packages/templates/src",
    );
    return config;
  },
};

export default nextConfig;
