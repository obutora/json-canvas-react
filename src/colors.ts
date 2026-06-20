import type { CanvasColor } from "./types";

/**
 * Default hex values for the six JSON Canvas preset color slots.
 * These mirror Obsidian's canvas palette and are exposed as CSS custom
 * properties (`--rjc-color-1` ... `--rjc-color-6`) so consumers can theme them.
 */
export const PRESET_HEX: Record<string, string> = {
  "1": "#fb464c", // red
  "2": "#e9973f", // orange
  "3": "#e0de71", // yellow
  "4": "#44cf6e", // green
  "5": "#53dfdd", // cyan
  "6": "#a882ff", // purple
};

/** Ordered list of preset slots, handy for color pickers. */
export const PRESET_SLOTS = ["1", "2", "3", "4", "5", "6"] as const;

/** True when the value is one of the preset slots "1".."6". */
export function isPreset(color: string | undefined): color is string {
  return !!color && Object.prototype.hasOwnProperty.call(PRESET_HEX, color);
}

/**
 * Resolve a {@link CanvasColor} to a usable CSS color string.
 *
 * - Preset slots resolve to `var(--rjc-color-N, <default hex>)` so themes win.
 * - Hex / arbitrary CSS colors pass through unchanged.
 * - `undefined` returns the provided fallback.
 */
export function resolveColor(
  color: CanvasColor | undefined,
  fallback = "var(--rjc-node-border)",
): string {
  if (color == null || color === "") return fallback;
  if (isPreset(color)) return `var(--rjc-color-${color}, ${PRESET_HEX[color]})`;
  return color;
}

/**
 * Resolve a color to a translucent fill suitable for node/edge backgrounds.
 * For presets we layer the themeable color over a low alpha via color-mix;
 * for hex/CSS colors we also color-mix with transparent.
 */
export function resolveTint(
  color: CanvasColor | undefined,
  alphaPercent = 12,
  fallback = "var(--rjc-node-bg)",
): string {
  if (color == null || color === "") return fallback;
  const base = isPreset(color)
    ? `var(--rjc-color-${color}, ${PRESET_HEX[color]})`
    : color;
  return `color-mix(in srgb, ${base} ${alphaPercent}%, transparent)`;
}
