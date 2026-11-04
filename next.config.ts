import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Permissions-Policy", value: "camera=(), microphone=()" },
    ] }];
  },
};
export default nextConfig;
