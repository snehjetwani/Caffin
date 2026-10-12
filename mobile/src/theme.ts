/**
 * Caffin design tokens. Warm "coffee + study" palette, single light theme for
 * the MVP (dark mode is a post-MVP concern). Import `colors`, `space`, etc.
 * everywhere instead of hardcoding values so the look stays consistent.
 */

export const colors = {
  bg: '#FDFBF7',          // app background (warm off-white)
  surface: '#FFFFFF',     // cards
  surfaceAlt: '#F4EEE5',  // subtle fills, inputs
  text: '#2B2118',        // near-black espresso
  textMuted: '#8A7E70',   // secondary text
  border: '#E7DFD3',      // hairlines
  primary: '#7A5230',     // coffee brown (primary actions)
  primaryText: '#FFFFFF',
  accent: '#C98A3C',      // caramel accent
  star: '#E0A42E',        // rating gold
  danger: '#C0452F',
  success: '#4E7C59',
  overlay: 'rgba(43,33,24,0.45)',
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

export const font = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 20,
  xl: 26,
  xxl: 34,
} as const;

/** Deterministic-ish avatar background from a name/username seed. */
export function seededColor(seed: string): string {
  const palette = ['#7A5230', '#C98A3C', '#4E7C59', '#4A6D8C', '#9C5A4A', '#6B5B95'];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}
