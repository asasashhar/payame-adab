import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // libSQL/Turso driver packages ship native binaries and dynamic requires —
  // keep them out of the webpack bundle and load them at runtime instead.
  serverExternalPackages: ["@prisma/adapter-libsql", "@libsql/client", "libsql", "@libsql/isomorphic-ws"],
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
