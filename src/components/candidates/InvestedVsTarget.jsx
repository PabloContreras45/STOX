import { T, S } from "../../theme.js";
import { fmt } from "../../utils/format.js";

export function InvestedVsTarget({ invested, target, tx }) {
  const pct = target > 0 ? Math.min(1, invested / target) : 0;
  const done = target > 0 && invested >= target;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 130 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ ...S.label, fontSize: 9, color: T.inkFaint }}>{tx.invested}</span>
        <span style={{ ...S.mono, fontSize: 11, color: invested > 0 ? T.gold : T.inkFaint }}>
          {invested > 0 ? `€${fmt(invested, 0)}` : "—"}
        </span>
      </div>
      <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: 4, borderRadius: 2, background: done ? T.positive : T.gold, width: `${(pct * 100).toFixed(0)}%`, transition: "width 0.4s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ ...S.label, fontSize: 9, color: T.inkFaint }}>{tx.target}</span>
        <span style={{ ...S.mono, fontSize: 11, color: target > 0 ? T.inkMuted : T.inkFaint }}>
          {target > 0 ? `€${fmt(target, 0)}` : "—"}
        </span>
      </div>
    </div>
  );
}
