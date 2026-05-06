// ═══════════════════════════════════════════
// Canonix Design System — Single Source of Truth
// ═══════════════════════════════════════════

// ── Entity Type Colors (used across landing, dashboard, map) ──
export const ENTITY_COLORS = {
  character:  { hex: "#2D5BE3", bg: "#2D5BE312", tailwind: "text-[#2D5BE3]" },
  place:      { hex: "#16A34A", bg: "#16A34A12", tailwind: "text-[#16A34A]" },
  event:      { hex: "#D97706", bg: "#D9770612", tailwind: "text-[#D97706]" },
  org:        { hex: "#9333EA", bg: "#9333EA12", tailwind: "text-[#9333EA]" },
  item:       { hex: "#0D9488", bg: "#0D948812", tailwind: "text-[#0D9488]" },
  timeline:   { hex: "#E11D48", bg: "#E11D4812", tailwind: "text-[#E11D48]" },
} as const;

export type EntityColorKey = keyof typeof ENTITY_COLORS;

// ── Status / Feedback Colors ──
export const STATUS_COLORS = {
  success:  { light: "#16A34A", dark: "#4ADE80" },
  error:    { light: "#DC2626", dark: "#F87171" },
  warning:  { light: "#D97706", dark: "#FBBF24" },
  info:     { light: "#2563EB", dark: "#60A5FA" },
} as const;

// ── Typography Scale ──
export const TYPOGRAPHY = {
  hero:      { size: { sm: "34px", md: "48px", lg: "60px" }, lineHeight: 1.08 },
  h1:        { size: { sm: "28px", md: "34px" }, lineHeight: 1.15 },
  h2:        { size: { sm: "24px", md: "32px", lg: "38px" }, lineHeight: 1.2 },
  h3:        { size: { sm: "17px", md: "19px", lg: "20px" }, lineHeight: 1.3 },
  body:      { size: { sm: "14px", md: "15px", lg: "16px" }, lineHeight: 1.6 },
  bodyLarge: { size: { sm: "16px", md: "18px" }, lineHeight: 1.6 },
  label:     { size: { sm: "11px", md: "12px", lg: "13px" }, lineHeight: 1.3 },
  caption:   { size: { sm: "10px", md: "11px" }, lineHeight: 1.3 },
} as const;

// ── Spacing Scale ──
export const SPACING = {
  section: { sm: "pb-20", md: "pb-24" },
  sectionTop: { sm: "pt-20", md: "pt-32" },
  card: "p-[18px_20px]",
  cardLarge: "p-6 md:p-8",
} as const;

// ── Border Radius ──
export const RADIUS = {
  sm:  "4px",
  md:  "8px",
  lg:  "14px",
  xl:  "20px",
  full: "9999px",
} as const;

// ── Shadows ──
export const SHADOWS = {
  card:      "0 1px 3px rgba(0,0,0,0.04)",
  cardHover: "0 8px 25px -5px rgba(0,0,0,0.08), 0 4px 10px -3px rgba(0,0,0,0.04)",
  darkCardHover: "0 8px 25px -5px rgba(0,0,0,0.3), 0 4px 10px -3px rgba(0,0,0,0.2)",
  accent:    "0 0 20px -3px rgba(45,91,227,0.3)",
  accentDark: "0 0 20px -3px rgba(109,143,232,0.25)",
  cta:       "0 10px 40px -10px rgba(45,91,227,0.3)",
} as const;

// ── Z-Index Scale ──
export const Z_INDEX = {
  base:     1,
  dropdown: 50,
  sticky:   100,
  modal:    200,
  toast:    300,
  tooltip:  400,
} as const;

// ── Animation Easings ──
export const EASINGS = {
  spring:    "cubic-bezier(0.34, 1.56, 0.64, 1)",
  outExpo:   "cubic-bezier(0.16, 1, 0.3, 1)",
  bounce:    "cubic-bezier(0.5, 1.5, 0.5, 1)",
  linear:    "linear",
} as const;

// ── Durations ──
export const DURATIONS = {
  fast:   "0.15s",
  normal: "0.25s",
  slow:   "0.4s",
  spring: "0.5s",
} as const;

// ── Common Tailwind Classes (reusable composites) ──
export const CLASSES = {
  container:     "max-w-4xl mx-auto px-4 md:px-7",
  containerWide: "max-w-[1400px] mx-auto px-4 md:px-7",
  sectionTitle:  "font-serif text-[26px] sm:text-[34px] md:text-[40px] font-light text-ink leading-tight",
  sectionDesc:   "text-ink-2 text-[15px] sm:text-[17px] mt-2 max-w-md mx-auto",
  cardBase:      "bg-surface rounded-lg border border-ink-3/10",
  cardHover:     "hover:border-ink-3/25 hover:shadow-md transition-all",
  btnPrimary:    "inline-flex items-center gap-2 bg-accent text-white rounded-xl px-8 py-3.5 text-[15px] tracking-[0.1em] uppercase hover:bg-accent/90 transition-colors no-underline shadow-lg shadow-accent/15 btn-press hover-glow accent-shimmer",
  btnSecondary:  "inline-flex items-center gap-2 bg-surface text-ink border border-ink-3/20 rounded-xl px-8 py-3.5 text-[15px] tracking-[0.1em] uppercase hover:border-ink-3/40 hover:bg-ink-3/3 transition-colors no-underline btn-press",
  labelCaps:     "text-[13px] tracking-[0.15em] uppercase text-ink-3",
  statRow:       "text-[16px] tracking-[0.1em] uppercase text-ink-3",
  iconBox:       "w-8 h-8 rounded-lg flex items-center justify-center",
  iconBoxLarge:  "w-16 h-16 rounded-2xl flex items-center justify-center",
} as const;
