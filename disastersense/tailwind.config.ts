import type { Config } from "tailwindcss";

/**
 * DisasterSense design tokens — Google Material Design theme.
 *
 * Surfaces, greys and the primary accent follow Google's Material palette
 * (Google Blue #1a73e8, Google Grey text scale). Elevation uses Material's
 * soft, layered shadows instead of hard neon glows. Corner radii match
 * Material's shape scale (small controls 8px, cards 12–16px, pills full).
 * Severity colors stay semantic and are reused across badges, map pins,
 * charts and the activity feed so state reads at a glance.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surfaces (Google Material light theme)
        base: "var(--color-base)",
        panel: "var(--color-panel)",
        raised: "var(--color-raised)",
        line: "var(--color-line)",

        // Severity scale (Material red/orange/amber/green)
        critical: "var(--color-critical)",
        high: "var(--color-high)",
        medium: "var(--color-medium)",
        low: "var(--color-low)",

        // Accent / brand — Google Blue
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        "accent-hover": "var(--color-accent-hover)",

        // Status
        running: "var(--color-running)",
        done: "var(--color-done)",
        review: "var(--color-review)",

        // Text (Google Grey scale)
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        faint: "var(--color-faint)",
      },
      fontFamily: {
        // Roboto (Google's typeface) loaded via next/font in layout.tsx.
        sans: ["var(--font-roboto)", "Roboto", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["Roboto Mono", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      borderRadius: {
        // Material shape scale
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "28px",
      },
      boxShadow: {
        // Material elevation levels (soft, diffuse — no neon glow)
        panel: "0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)",
        raised: "0 1px 3px 0 rgba(60,64,67,0.24), 0 4px 8px 3px rgba(60,64,67,0.12)",
        overlay: "0 4px 8px 3px rgba(60,64,67,0.15), 0 1px 3px 0 rgba(60,64,67,0.3)",
        // Kept for the alerting KPI tile / danger button: a red-tinted elevation.
        glow: "0 1px 2px 0 rgba(217,48,37,0.3), 0 2px 6px 2px rgba(217,48,37,0.15)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 200ms ease-out both",
        "pulse-soft": "pulse-soft 1.6s ease-in-out infinite",
        "slide-up": "slide-up 0.5s ease-out both",
        "slide-in-left": "slide-in-left 0.5s ease-out both",
        "scale-in": "scale-in 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
