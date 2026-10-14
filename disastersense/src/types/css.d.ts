/**
 * Ambient module declarations for side-effect CSS imports.
 *
 * These CSS files are imported for their side effects only (the bundler injects
 * the stylesheet); we import them dynamically at runtime in client components.
 * Declaring them here keeps `tsc` happy without affecting the bundle.
 */

declare module "*.css";
