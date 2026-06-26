import type { NextConfig } from "next";

// When STATIC_EXPORT=1 (used by the GitHub Pages workflow) the app is built as a
// fully static site served from the /architecture repo subpath. Normal builds
// (local dev, Vercel) keep the server + /api/generate route untouched.
const isStaticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = isStaticExport
  ? {
      output: "export",
      basePath: "/architecture",
      assetPrefix: "/architecture/",
      images: { unoptimized: true },
      trailingSlash: true,
    }
  : {};

export default nextConfig;
