import type { Config } from "tailwindcss";

/**
 * DisasterSense design tokens - professional grey/white theme.
 * Severity colors are semantic and used consistently across badges, map pins,
 * charts and the activity feed so an operator can read state at a glance.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surfaces
        base: "var(--color-base)",
        panel: "var(--color-panel)",
        raised: "var(--color-raised)",
        line: "var(--color-line)",

        // Severity scale
        critical: "var(--color-critical)",
        high: "var(--color-high)",
        medium: "var(--color-medium)",
        low: "var(--color-low)",

        // Accent / brand - Purple/Pink
        accent: "var(--color-accent)",
        "accent-soft": "var(--color-accent-soft)",
        purple: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
        },
        pink: {
          50: "#fdf2f8",
          100: "#fce7f3",
          200: "#fbcfe8",
          300: "#f9a8d4",
          400: "#f472b6",
          500: "#ec4899",
          600: "#db2777",
          700: "#be185d",
          800: "#9d174d",
          900: "#831843",
        },

        // Status
        running: "var(--color-running)",
        done: "var(--color-done)",
        review: "var(--color-review)",

        // Text
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        faint: "var(--color-faint)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        panel: "0 1px 3px rgba(0,0,0,0.1), 0 8px 24px -12px rgba(0,0,0,0.15)",
        glow: "0 0 0 1px rgba(211,47,47,0.2), 0 0 20px -4px rgba(211,47,47,0.3)"
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
        "scan": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
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
        "scan": "scan 2.2s linear infinite",
        "slide-up": "slide-up 0.5s ease-out both",
        "slide-in-left": "slide-in-left 0.5s ease-out both",
        "scale-in": "scale-in 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
