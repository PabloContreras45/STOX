import { T, S } from "../../theme.js";
import { PotencialBadge } from "./PotencialBadge.jsx";
import { RangoBadge } from "./RangoBadge.jsx";
import { InvestedVsTarget } from "./InvestedVsTarget.jsx";
import { ConvictionDots } from "./ConvictionDots.jsx";
import { RiskBadge } from "./RiskBadge.jsx";

export function WildshotCandidateRow({ s, invested, target, tx }) {
  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: T.paper, gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 0 }}>
          <span style={{ ...S.mono, fontSize: 14, fontWeight: 500, color: T.ink, minWidth: 44, flexShrink: 0 }}>{s.ticker}</span>
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, background: s.tagColor + "18", color: s.tagColor, border: `1px solid ${s.tagColor}40`, padding: "1px 9px", borderRadius: 20, fontWeight: 500, flexShrink: 0 }}>{s.tag}</span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexShrink: 0 }}>
          <PotencialBadge potencial={s.potencial} />
          <RangoBadge rango={s.rango} />
          <InvestedVsTarget tx={tx} invested={invested} target={target} />
          <ConvictionDots value={s.conviction} />
          <RiskBadge risk={s.risk} />
        </div>
      </div>
    </div>
  );
}
