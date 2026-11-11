import type { NextConfig } from "next";

const isApp = process.env.PIXI_TARGET === "app";

const nextConfig: NextConfig = {
  ...(isApp ? { output: "export" as const, images: { unoptimized: true }, trailingSlash: true } : {}),
  ...(isApp ? {} : { cacheComponents: true, partialPrefetching: true }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  ...(isApp ? {} : { async headers() {
    return [
      { source: "/:path*", headers: [{ key: "Permissions-Policy", value: "camera=(self), microphone=(self)" }] },
    ];
  } }),
};

export default nextConfig;
