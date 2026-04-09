import { extractPotLabel } from "../../utils/analysis.js";

export function PotencialBadge({ potencial }) {
  const label = extractPotLabel(potencial);
  if (!label) return null;
  return (
    <span title="Upside al precio objetivo de consenso de analistas" style={{
      fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 600,
      background: "#EFF6FF", color: "#1D4ED8",
      border: "1px solid #BFDBFE",
      padding: "2px 8px", borderRadius: 20, flexShrink: 0,
    }}>{label}</span>
  );
}
