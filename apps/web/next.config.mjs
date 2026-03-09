/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@hospitality-channels/common",
    "@hospitality-channels/content-model",
    "@hospitality-channels/templates",
    "@hospitality-channels/storage",
    "@hospitality-channels/publish",
    "@hospitality-channels/ui",
  ],
};

export default nextConfig;
