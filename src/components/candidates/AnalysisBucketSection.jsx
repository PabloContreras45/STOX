import { useState } from "react";
import { T, S } from "../../theme.js";
import { AnalysisRow } from "./AnalysisRow.jsx";

export function AnalysisBucketSection({ bucket, tickers, analysis, defaultOpen = false, tx, heldTickers }) {
  const [open, setOpen] = useState(defaultOpen);
  const accent       = bucket === "Core" ? T.gold  : bucket === "Satellite" ? T.teal  : T.ink;
  const accentLight  = bucket === "Core" ? T.goldLight : bucket === "Satellite" ? T.tealLight : T.bg;
  const accentBorder = bucket === "Core" ? T.goldBorder : bucket === "Satellite" ? T.tealBorder : T.borderDark;
  const analyzed     = tickers.filter(t => t.descripcion || t.ventaja).length;
  const heldCount    = heldTickers ? tickers.filter(t => heldTickers.has(t.ticker)).length : 0;

  return (
    <div style={{ background: T.paper, border: `1px solid ${accentBorder}`, borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "14px 20px", background: open ? accentLight : T.paper,
          border: "none", cursor: "pointer", transition: "background 0.15s",
        }}
      >
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: accent, flexShrink: 0 }} />
          <span style={{ ...S.serif, fontSize: 18, fontWeight: 600, color: T.ink }}>{bucket}</span>
          <span style={{ ...S.label, background: accentLight, color: accent, border: `1px solid ${accentBorder}`, padding: "2px 10px", borderRadius: 20, fontSize: 9 }}>
            {analyzed}/{tickers.length} {tx ? tx.analyzed_label : "analizados"}
          </span>
          {heldCount > 0 && (
            <span style={{ ...S.label, background: T.tealLight, color: T.teal, border: `1px solid ${T.tealBorder}`, padding: "2px 10px", borderRadius: 20, fontSize: 9 }}>
              {heldCount} en cartera
            </span>
          )}
        </div>
        <span style={{ ...S.mono, fontSize: 18, color: accent }}>{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div style={{ borderTop: `1px solid ${accentBorder}` }}>
          {tickers.map(c => (
            <AnalysisRow tx={tx}
              key={c.ticker}
              c={c}
              a={c.descripcion || c.ventaja ? c : null}
              accent={accent}
              accentLight={accentLight}
              accentBorder={accentBorder}
              isHeld={heldTickers ? heldTickers.has(c.ticker) : false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
