export const T = {
  bg: "#FAFAF8", paper: "#FFFFFF", ink: "#0A0A0A", inkMuted: "#6B6B6B",
  inkFaint: "#B0B0B0", gold: "#C5973A", goldLight: "#F5EDD3", goldBorder: "#E8D5A3",
  border: "#E4E4E0", borderDark: "#C8C8C4",
  red: "#B91C1C", redLight: "#FEF2F2",
  teal: "#006E7F", tealLight: "#E0F4F7", tealBorder: "#A8D8E0",
  cyan: "#00e5e5",
  positive: "#166534", neutral: "#92400E",
  blue: "#1D4ED8", blueLight: "#EFF6FF", blueBorder: "#BFDBFE",
};

export const S = {
  label:  { fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: T.inkFaint },
  mono:   { fontFamily: "'DM Mono', monospace" },
  serif:  { fontFamily: "'Cormorant Garamond', serif" },
};

export const BASE_RETURNS = { Core: 0.14, Satellite: 0.20, Wildshots: 0.30 };
export const BUCKET_COLOR = { Core: T.gold, Satellite: T.ink, Wildshots: T.teal };
