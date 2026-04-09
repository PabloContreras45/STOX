import { T, S } from "../../theme.js";

export function RiskBadge({ risk }) {
  const map = {
    "Very High":  { bg: T.redLight,  color: T.red,     text: "Very High" },
    "High":       { bg: "#FFF7ED",   color: "#C2410C",  text: "High"      },
    "Medium-High":{ bg: T.goldLight, color: T.neutral,  text: "Med-High"  },
    "Medium":     { bg: T.tealLight, color: T.teal,     text: "Medium"    },
  };
  const s = map[risk] || map["Medium"];
  return <span style={{ ...S.label, background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 20, fontSize: 9 }}>{s.text}</span>;
}
