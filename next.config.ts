import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The platform preview proxy 301s /dashboard → /dashboard/ while Next's
  // built-in URL normalization 308s it straight back — the two redirect
  // forever and the browser reports ERR_TOO_MANY_REDIRECTS right after a new
  // account logs in. Skip the pre-middleware normalization so
  // src/middleware.ts can serve the slashed path directly (rewrite) instead
  // of bouncing it.
  skipMiddlewareUrlNormalize: true,
  // Stop Next's own 308 from trailing-slash paths to bare ones; the
  // middleware below serves the slashed path directly, so the proxy's 301
  // meets a 200 instead of another redirect.
  skipTrailingSlashRedirect: true,
  // libSQL/Turso driver packages ship native binaries and dynamic requires —
  // keep them out of the webpack bundle and load them at runtime instead.
  // z-ai-web-dev-sdk likewise resolves platform credentials/dynamic deps at
  // runtime and must not be bundled into the server build.
  serverExternalPackages: ["@prisma/adapter-libsql", "@libsql/client", "libsql", "@libsql/isomorphic-ws", "z-ai-web-dev-sdk"],
  outputFileTracingIncludes: {
    "/*": ["./scripts/seed/**/*", "./scripts/seed-qafiya-behr.js"],
  },
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
