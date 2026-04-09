import { useState } from "react";
import { T, S } from "../../theme.js";
import { parseRangePct } from "../../utils/analysis.js";

export function AnalysisRow({ c, a, accent, accentLight, accentBorder, tx, isHeld }) {
  const [open, setOpen] = useState(false);

  const potencial = a?.potencial;

  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
      <div
        onClick={() => a && setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 12, padding: "12px 18px",
          background: open ? accentLight : T.paper,
          cursor: a ? "pointer" : "default",
          transition: "background 0.15s",
        }}
      >
        <span style={{ ...S.mono, fontSize: 14, fontWeight: 500, color: T.ink, minWidth: 48, flexShrink: 0 }}>{c.ticker}</span>
        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.inkMuted, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
        <span style={{ ...S.label, background: T.bg, border: `1px solid ${T.border}`, color: T.inkFaint, padding: "1px 8px", borderRadius: 20, fontSize: 9, flexShrink: 0 }}>{c.sector}</span>
        {isHeld && (
          <span style={{ ...S.label, background: T.tealLight, color: T.teal, border: `1px solid ${T.tealBorder}`, padding: "1px 8px", borderRadius: 20, fontSize: 9, flexShrink: 0 }}>En cartera</span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {a ? (() => {
            const up   = a.rango?.subida_max ? Math.abs(parseRangePct(a.rango.subida_max)) : null;
            const down = a.rango?.bajada_max ? Math.abs(parseRangePct(a.rango.bajada_max)) : null;
            const rr   = up && down && down > 0 ? (up / down).toFixed(1) : null;
            const rrColor = rr ? (rr >= 2.5 ? "#15803D" : rr >= 1.5 ? "#D97706" : "#DC2626") : T.inkFaint;
            const rrBg    = rr ? (rr >= 2.5 ? "#F0FDF4" : rr >= 1.5 ? "#FFFBEB" : "#FEF2F2") : T.bg;
            const rrBd    = rr ? (rr >= 2.5 ? "#86efac" : rr >= 1.5 ? "#FDE68A" : "#FECACA") : T.border;
            return rr ? (
              <span style={{ ...S.mono, fontSize: 11, fontWeight: 500, background: rrBg, color: rrColor, border: `1px solid ${rrBd}`, padding: "2px 10px", borderRadius: 20 }}>
                R/R {rr}x
              </span>
            ) : (
              <span style={{ ...S.label, background: T.bg, color: T.inkFaint, border: `1px solid ${T.border}`, padding: "2px 9px", borderRadius: 20, fontSize: 9 }}>Sin R/R</span>
            );
          })() : (
            <span style={{ ...S.label, background: T.bg, color: T.inkFaint, border: `1px solid ${T.border}`, padding: "2px 9px", borderRadius: 20, fontSize: 9 }}>Pendiente</span>
          )}
          {a && <span style={{ color: T.inkFaint, fontSize: 12 }}>{open ? "▲" : "▼"}</span>}
        </div>
      </div>

      {open && a && (
        <div style={{ padding: "16px 18px 18px", background: T.paper, borderTop: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { key: "descripcion",    label: "Qué hace",              icon: "◎" },
            { key: "ventaja",        label: tx ? tx.advantage : "Ventaja competitiva",    icon: "◆" },
            { key: "por_que_ahora",  label: "Por qué invertir ahora", icon: "▶" },
          ].map(field => a[field.key] ? (
            <div key={field.key} style={{ display: "flex", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ ...S.mono, fontSize: 12, color: accent, flexShrink: 0, marginTop: 2 }}>{field.icon}</span>
                <div style={{ flex: 1, width: 1, background: `${accent}30`, margin: "5px 0 0" }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ ...S.label, margin: "0 0 6px", fontSize: 9, color: T.inkFaint }}>{field.label}</p>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.ink, margin: 0, lineHeight: 1.75 }}>{a[field.key]}</p>
              </div>
            </div>
          ) : null)}

          {a.consenso && (
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ ...S.mono, fontSize: 12, color: accent, flexShrink: 0, marginTop: 2 }}>◈</span>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ ...S.label, margin: "0 0 6px", fontSize: 9, color: T.inkFaint }}>Consenso de analistas</p>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.ink, margin: 0, lineHeight: 1.75 }}>{a.consenso}</p>
              </div>
            </div>
          )}

          {(a.bear || a.rango?.bajada_max) && (
            <div style={{ display: "flex", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ ...S.mono, fontSize: 12, color: "#DC2626", flexShrink: 0, marginTop: 2 }}>⚠</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <p style={{ ...S.label, margin: 0, fontSize: 9, color: T.inkFaint }}>Riesgo principal</p>
                  {a.rango?.bajada_max && (
                    <span style={{ ...S.mono, fontSize: 9, fontWeight: 500, color: "#DC2626", background: "#FEF2F2", border: "1px solid #FECACA", padding: "1px 7px", borderRadius: 20 }}>
                      {a.rango.bajada_max}
                    </span>
                  )}
                </div>
                {a.bear && (
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted, margin: 0, lineHeight: 1.6,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {a.bear}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
