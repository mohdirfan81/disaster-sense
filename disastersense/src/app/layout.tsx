import type { Metadata, Viewport } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/providers";

/**
 * Google's signature typeface. Material Design uses Roboto across all surfaces;
 * next/font self-hosts it at build time (no runtime request, no layout shift).
 */
const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap",
});

/**
 * Absolute site URL for metadata/canonical links. Prefers an explicit
 * NEXT_PUBLIC_SITE_URL, then the host-injected URL on Vercel or Render, and
 * finally falls back to localhost for local development.
 */
function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.RENDER_EXTERNAL_URL) return process.env.RENDER_EXTERNAL_URL;
  return "http://localhost:3000";
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "DisasterSense — Disaster Response Multi-Agent System",
    template: "%s · DisasterSense",
  },
  description:
    "Control-room dashboard for disaster response: citizen incident reporting, a visible multi-agent AI pipeline, resource allocation and live situation reports. Decision-support prototype.",
  applicationName: "DisasterSense",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={roboto.variable}>
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-raised focus:px-4 focus:py-2 focus:text-sm"
        >
          Skip to main content
        </a>
        <div className="min-h-screen bg-base">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
