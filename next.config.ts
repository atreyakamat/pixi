import type { NextConfig } from "next";

// Three targets. "app": static files for the Android wrapper, root is the camera.
// "web": static files for a host like Netlify, root is the landing page and the app is at /app/.
// Unset: the dev server, laid out like "web".
const target = process.env.PIXI_TARGET;
const isApp = target === "app" || target === "web";

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
