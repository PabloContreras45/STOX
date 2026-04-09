import { useRef } from "react";
import { T, S } from "../theme.js";
import { fmt } from "../utils/format.js";

export function ConfigSidebar({ open, onClose, desiredInvestment, setDesiredInvestment, desiredSplit, onSplitChange, tx }) {
  const inputRef = useRef(null);
  const total = Object.values(desiredSplit).reduce((s, v) => s + v, 0);
  const off = total !== 100;

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.25)", zIndex: 40, backdropFilter: "blur(2px)" }}
        />
      )}
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: 300, zIndex: 50,
        background: T.paper, borderLeft: `1px solid ${T.border}`,
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column", overflowY: "auto",
        boxShadow: open ? "-8px 0 32px rgba(0,0,0,0.12)" : "none",
      }}>
        <div style={{ padding: "18px 20px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: T.ink }}>
          <div>
            <p style={{ ...S.serif, margin: 0, fontSize: 17, fontWeight: 600, color: T.goldLight }}>{tx.configTitle}</p>
            <p style={{ ...S.label, margin: "3px 0 0", color: "#555", fontSize: 9 }}>{tx ? (tx.configTitle === "Settings" ? "Investment & split settings" : "Inversión y split deseado") : "Inversión y split deseado"}</p>
          </div>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: "50%", border: `1px solid #333`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M1.5 1.5L10.5 10.5M10.5 1.5L1.5 10.5" stroke="#999" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          <div style={{ marginBottom: 28 }}>
            <p style={{ ...S.label, margin: "0 0 8px" }}>Inversión deseada</p>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkMuted, margin: "0 0 10px", lineHeight: 1.5 }}>
              Capital total objetivo para tu portfolio.
            </p>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <span style={{ ...S.mono, position: "absolute", left: 12, fontSize: 14, color: T.gold, fontWeight: 500 }}>€</span>
              <input
                ref={inputRef}
                type="number"
                min={0}
                step={100}
                value={desiredInvestment === 0 ? "" : desiredInvestment}
                placeholder="5.000"
                onChange={e => {
                  const v = parseFloat(e.target.value);
                  setDesiredInvestment(isNaN(v) ? 0 : v);
                }}
                style={{
                  width: "100%", padding: "10px 12px 10px 28px",
                  border: `1.5px solid ${T.goldBorder}`, borderRadius: 2,
                  fontFamily: "'DM Mono', monospace", fontSize: 16, fontWeight: 500,
                  color: T.ink, background: T.goldLight, outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            {desiredInvestment > 0 && (
              <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                {["Core", "Satellite", "Wildshots"].map(b => (
                  <div key={b} style={{ display: "flex", justifyContent: "space-between", padding: "4px 8px", background: T.bg, borderRadius: 2 }}>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkMuted }}>{b}</span>
                    <span style={{ ...S.mono, fontSize: 12, color: T.ink }}>€{fmt(desiredInvestment * desiredSplit[b] / 100)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <p style={{ ...S.label, margin: 0 }}>Split deseado</p>
              <span style={{
                ...S.mono, fontSize: 11,
                color: off ? T.red : T.positive,
                background: off ? T.redLight : "#F0FDF4",
                padding: "2px 8px", borderRadius: 20,
              }}>{total}%</span>
            </div>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkMuted, margin: "0 0 14px", lineHeight: 1.5 }}>
              Al mover un slider, los otros dos se ajustan para mantener el 100%.
            </p>

            {[
              { bucket: "Core",      color: T.gold,     light: T.goldLight  },
              { bucket: "Satellite", color: T.teal,     light: T.tealLight  },
              { bucket: "Wildshots", color: T.ink,      light: T.bg         },
            ].map(({ bucket, color, light }) => (
              <div key={bucket} style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, color: T.ink }}>{bucket}</span>
                  </div>
                  <span style={{ ...S.mono, fontSize: 14, fontWeight: 500, color: color }}>{desiredSplit[bucket]}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={desiredSplit[bucket]}
                  onChange={e => onSplitChange(bucket, parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: color, height: 4, cursor: "pointer" }}
                />
                {desiredInvestment > 0 && (
                  <p style={{ ...S.mono, fontSize: 11, color: T.inkMuted, margin: "4px 0 0", textAlign: "right" }}>
                    → €{fmt(desiredInvestment * desiredSplit[bucket] / 100)} objetivo
                  </p>
                )}
              </div>
            ))}

            {off && (
              <div style={{ padding: "8px 12px", background: T.redLight, border: `1px solid #FECACA`, borderRadius: 2, marginBottom: 12 }}>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.red, margin: 0 }}>
                  El split suma {total}%. Ajusta los sliders para llegar al 100%.
                </p>
              </div>
            )}

            <p style={{ ...S.label, margin: "0 0 8px", fontSize: 9 }}>Presets rápidos</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[
                { label: "50/25/25", core: 50, sat: 25, ws: 25 },
                { label: "60/20/20", core: 60, sat: 20, ws: 20 },
                { label: "40/30/30", core: 40, sat: 30, ws: 30 },
                { label: "70/20/10", core: 70, sat: 20, ws: 10 },
              ].map(p => {
                const active = desiredSplit.Core === p.core && desiredSplit.Satellite === p.sat && desiredSplit.Wildshots === p.ws;
                return (
                  <button
                    key={p.label}
                    onClick={() => onSplitChange("__preset__", { Core: p.core, Satellite: p.sat, Wildshots: p.ws })}
                    style={{
                      ...S.label, fontSize: 9,
                      padding: "5px 10px", borderRadius: 2, cursor: "pointer",
                      background: active ? T.ink : T.bg,
                      color: active ? T.goldLight : T.inkMuted,
                      border: `1px solid ${active ? T.ink : T.border}`,
                    }}
                  >{p.label}</button>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop: "auto", padding: "14px 20px", borderTop: `1px solid ${T.border}` }}>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkFaint, margin: 0, fontStyle: "italic" }}>
            No es asesoramiento financiero · Referencia personal
          </p>
        </div>
      </div>
    </>
  );
}
