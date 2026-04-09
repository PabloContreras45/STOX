import { T, S } from "../../theme.js";
import { PotencialBadge } from "./PotencialBadge.jsx";
import { RangoBadge } from "./RangoBadge.jsx";
import { InvestedVsTarget } from "./InvestedVsTarget.jsx";

export function CoreCandidateRow({ s, invested, target, tx }) {
  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: T.paper, gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 0 }}>
          <span style={{ ...S.mono, fontSize: 14, fontWeight: 500, color: T.ink, minWidth: 44, flexShrink: 0 }}>{s.ticker}</span>
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
          <span style={{ ...S.label, background: T.bg, border: `1px solid ${T.border}`, color: T.inkFaint, padding: "1px 7px", borderRadius: 20, fontSize: 9, flexShrink: 0 }}>{s.sector}</span>
          {s.rotate && <span style={{ ...S.label, background: T.blueLight, color: T.blue, border: `1px solid ${T.blueBorder}`, padding: "1px 7px", borderRadius: 20, fontSize: 9, flexShrink: 0 }}>Rota</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <PotencialBadge potencial={s.potencial} />
          <RangoBadge rango={s.rango} />
          <InvestedVsTarget tx={tx} invested={invested} target={target} />
        </div>
      </div>
    </div>
  );
}
