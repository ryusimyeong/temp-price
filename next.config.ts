import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  outputFileTracingIncludes: {
    "/api/search": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/playwright-core/browsers.json",
    ],
  },
};
export default nextConfig;
