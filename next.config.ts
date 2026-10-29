import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
    // Dev-only "Instant navigation" hints: validate only segments that opt in with `export const instant`.
    // Every page here sits behind a browser-side login check, so the automatic check can't apply to them.
    instantInsights: { validationLevel: "manual-warning" },
  },
  // Hides the round "N" dev-tools badge (it covers the sidebar's bottom-left corner). Errors still show.
  devIndicators: false,
  // Let phones/PCs on the same Wi-Fi use the dev server (e.g. http://192.168.1.6:3000).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
