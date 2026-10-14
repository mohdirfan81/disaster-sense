/** @type {import('next').NextConfig} */
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Conservative, framework-agnostic security headers applied to every response.
 * The app ships no inline scripts or third-party frames, so `frame-ancestors`
 * can be locked down; Leaflet tiles are images and unaffected.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig = {
  // Don't advertise the framework version.
  poweredByHeader: false,
  reactStrictMode: true,
  // Linting runs as its own `npm run lint` / `npm run check` step so a lint
  // failure never blocks an otherwise healthy production build.
  eslint: { ignoreDuringBuilds: true },
  // Pin the tracing root to this project so an unrelated lockfile higher up
  // (e.g. in the user's home dir) doesn't trigger a workspace-root warning.
  outputFileTracingRoot: path.join(__dirname, "./"),
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
