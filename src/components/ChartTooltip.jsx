import { T, S } from "../theme.js";
import { fmt } from "../utils/format.js";

export function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, padding: "10px 14px" }}>
      <p style={{ ...S.label, margin: "0 0 6px", color: T.inkMuted }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ ...S.mono, margin: "2px 0", fontSize: 13, color: p.color || T.ink }}>
          {p.name}: {p.value > 100 ? `€${fmt(p.value)}` : `${p.value}%`}
        </p>
      ))}
    </div>
  );
}
