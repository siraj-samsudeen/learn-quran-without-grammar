import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow a second dev server to use a separate build directory so
  // both can run concurrently (used by Playwright for the unauthorized
  // project on port 3001). Next refuses to start two dev servers that
  // share the same `.next` dir because of the dev lockfile.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
