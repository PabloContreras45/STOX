import { useState, useCallback, useRef, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Area, AreaChart, PieChart, Pie, Cell, Legend,
} from "recharts";

/* --- Fonts ---------------------------------------------------------------- */
const FONT_LINK = document.createElement("link");
FONT_LINK.rel = "stylesheet";
FONT_LINK.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Mono:wght@400;500&family=Inter:wght@300;400;500;600;800;900&display=swap";
document.head.appendChild(FONT_LINK);

const ANIM_STYLE = document.createElement("style");
ANIM_STYLE.textContent = `@keyframes tabFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`;
document.head.appendChild(ANIM_STYLE);

/* --- Design tokens -------------------------------------------------------- */
const T = {
  bg: "#FAFAF8", paper: "#FFFFFF", ink: "#0A0A0A", inkMuted: "#6B6B6B",
  inkFaint: "#B0B0B0", gold: "#C5973A", goldLight: "#F5EDD3", goldBorder: "#E8D5A3",
  border: "#E4E4E0", borderDark: "#C8C8C4",
  red: "#B91C1C", redLight: "#FEF2F2",
  teal: "#006E7F", tealLight: "#E0F4F7", tealBorder: "#A8D8E0",
  cyan: "#00e5e5",
  positive: "#166534", neutral: "#92400E",
  blue: "#1D4ED8", blueLight: "#EFF6FF", blueBorder: "#BFDBFE",
};
const S = {
  label:  { fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: T.inkFaint },
  mono:   { fontFamily: "'DM Mono', monospace" },
  serif:  { fontFamily: "'Cormorant Garamond', serif" },
};

const BASE_RETURNS = { Core: 0.14, Satellite: 0.20, Wildshots: 0.30 };
const BUCKET_COLOR = { Core: T.gold, Satellite: T.ink, Wildshots: T.teal };

/* --- Candidates data is now fully driven by analysis.json (see ⚙ {tx.configTitle}) --- */

/* --- Parsers -------------------------------------------------------------- */
function parseAmount(str) {
  if (!str) return 0;
  const s = String(str).replace(/[€$£\s]/g, "").trim();
  let clean;
  if (s.includes(",") && s.includes(".")) {
    clean = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    clean = s.replace(",", ".");
  } else { clean = s; }
  const n = parseFloat(clean);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}
function normBucket(raw) {
  if (!raw) return "Core";
  const r = raw.trim().toLowerCase();
  if (r.startsWith("wild"))      return "Wildshots";
  if (r.startsWith("satellite")) return "Satellite";
  if (r.startsWith("core"))      return "Core";
  return raw.trim();
}
function extractTicker(company) {
  if (!company) return "";
  const m = String(company).match(/\(([^)]+)\)/);
  return m ? m[1] : String(company).trim();
}
function splitLine(line, delim) {
  const fields = []; let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ; }
    else if (ch === delim && !inQ) { fields.push(cur.trim()); cur = ""; }
    else { cur += ch; }
  }
  fields.push(cur.trim()); return fields;
}
function detectDelim(header) {
  const c = {"\t":0, ";":0, ",":0}; let inQ = false;
  for (const ch of header) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (!inQ && c[ch] !== undefined) c[ch]++;
  }
  return Object.entries(c).sort((a,b) => b[1]-a[1])[0][0];
}
function parseCSV(text) {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g,"\n").replace(/\r/g,"\n");
  const rows = clean.split("\n").filter(l => l.trim());
  if (!rows.length) return [];
  const delim = detectDelim(rows[0]);
  const headers = splitLine(rows[0], delim);
  return rows.slice(1).map(line => {
    const vals = splitLine(line, delim); const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] !== undefined ? vals[i] : ""; });
    return obj;
  }).filter(r => Object.values(r).some(v => v));
}
function aggregateTransactions(rows) {
  const map = {};
  rows.forEach(r => {
    const company  = (r.Company  || r.company  || "").trim();
    const ticker   = extractTicker(company) || company;
    const bucket   = normBucket(r.Bucket || r.bucket || "Core");
    const industry = (r.Industry || r.industry || "").trim();
    const action   = (r.Action   || r.action   || "Buy").trim();
    const amount   = parseAmount(r.Quantity || r.quantity || "0");
    const delta    = action.toLowerCase() === "sell" ? -amount : amount;
    if (!map[ticker]) map[ticker] = { Company: company, Ticker: ticker, Industry: industry, Bucket: bucket, Invertido: 0, Trades: 0 };
    map[ticker].Invertido += delta; map[ticker].Trades += 1;
  });
  return Object.values(map).filter(p => p.Invertido > 0.01);
}
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsText(file, "UTF-8");
  });
}

/* --- Demo data ------------------------------------------------------------ */
const DEMO_TRANSACTIONS = [
  { Action: "Buy", Date: "20/02/2026", Quantity: "530,85 EUR", Company: "TakeTwo (TTWO)",                  Industry: "Entertainment", Bucket: "Wildshot"  },
  { Action: "Buy", Date: "21/02/2026", Quantity: "85,60 EUR",  Company: "TakeTwo (TTWO)",                  Industry: "Entertainment", Bucket: "Wildshot"  },
  { Action: "Buy", Date: "23/02/2026", Quantity: "248,00 EUR", Company: "Constellation Energy Corp (CEG)", Industry: "Energy",        Bucket: "Wildshot"  },
  { Action: "Buy", Date: "01/03/2026", Quantity: "90,00 EUR",  Company: "Vanguard S&P 500 (VOO)",          Industry: "ETF",           Bucket: "Core"      },
  { Action: "Buy", Date: "01/03/2026", Quantity: "80,00 EUR",  Company: "Microsoft (MSFT)",                Industry: "Technology",    Bucket: "Core"      },
  { Action: "Buy", Date: "01/03/2026", Quantity: "125,00 EUR", Company: "NVIDIA (NVDA)",                   Industry: "Technology",    Bucket: "Satellite" },
  { Action: "Buy", Date: "01/03/2026", Quantity: "125,00 EUR", Company: "Vertiv (VRT)",                    Industry: "Industrials",   Bucket: "Satellite" },
];
const DEMO_HISTORY = [
  { Fecha: "Mar 2026", Valor: 1283 },
  { Fecha: "Abr 2026", Valor: 1750 },
];

/* --- Helpers -------------------------------------------------------------- */
const fmt    = (n, dec = 0) => Math.abs(+n).toLocaleString("es-ES", { maximumFractionDigits: dec });
const pctFmt = n => { const s = +n >= 0 ? "+" : ""; return `${s}${(+n * 100).toFixed(1)}%`; };
const pctBar = n => `${Math.min(100, Math.max(0, +n * 100)).toFixed(0)}%`;

/* --- Stat card ------------------------------------------------------------ */
function parseRangePct(str) {
  if (!str) return null;
  const m = str.match(/([+-]?\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const val = parseFloat(m[1].replace(",", "."));
  return isNaN(val) ? null : val;
}

function StatCard({ label, value, sub, accent = T.ink, border = T.border }) {
  return (
    <div style={{ background: T.paper, border: `1px solid ${border}`, borderRadius: 2, padding: "16px 20px", flex: "1 1 160px", minWidth: 0 }}>
      <p style={{ ...S.label, margin: "0 0 6px" }}>{label}</p>
      <p style={{ ...S.mono, margin: "0 0 4px", fontSize: 22, fontWeight: 500, color: accent }}>{value}</p>
      {sub && <p style={{ fontFamily: "'Inter',sans-serif", margin: 0, fontSize: 11, color: T.inkMuted }}>{sub}</p>}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
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

/* --- Config Sidebar ------------------------------------------------------- */
function ConfigSidebar({ open, onClose, desiredInvestment, setDesiredInvestment, desiredSplit, onSplitChange, tx }) {
  const inputRef = useRef(null);
  const total = Object.values(desiredSplit).reduce((s, v) => s + v, 0);
  const off = total !== 100;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, background: "rgba(10,10,10,0.25)", zIndex: 40, backdropFilter: "blur(2px)" }}
        />
      )}
      {/* Sidebar panel */}
      <div style={{
        position: "fixed", top: 0, right: 0, height: "100vh", width: 300, zIndex: 50,
        background: T.paper, borderLeft: `1px solid ${T.border}`,
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column", overflowY: "auto",
        boxShadow: open ? "-8px 0 32px rgba(0,0,0,0.12)" : "none",
      }}>
        {/* Header */}
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
          {/* Inversión deseada */}
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

          {/* Split deseado */}
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
                  style={{
                    width: "100%", accentColor: color, height: 4,
                    cursor: "pointer",
                  }}
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

            {/* Preset buttons */}
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
                    onClick={() => {
                      // direct set via calling onSplitChange three times would cause issues
                      // we'll use a special "preset" handler below — pass null to signal preset
                      onSplitChange("__preset__", { Core: p.core, Satellite: p.sat, Wildshots: p.ws });
                    }}
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

        {/* Footer note */}
        <div style={{ marginTop: "auto", padding: "14px 20px", borderTop: `1px solid ${T.border}` }}>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkFaint, margin: 0, fontStyle: "italic" }}>
            No es asesoramiento financiero · Referencia personal
          </p>
        </div>
      </div>
    </>
  );
}

/* --- Candidates sub-components -------------------------------------------- */
function ConvictionDots({ value, max = 5 }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: i < value ? T.gold : T.border,
          border: `1px solid ${i < value ? T.goldBorder : T.borderDark}`,
        }} />
      ))}
    </div>
  );
}
function RiskBadge({ risk }) {
  const map = {
    "Very High":  { bg: T.redLight,  color: T.red,     text: "Very High" },
    "High":       { bg: "#FFF7ED",   color: "#C2410C",  text: "High"      },
    "Medium-High":{ bg: T.goldLight, color: T.neutral,  text: "Med-High"  },
    "Medium":     { bg: T.tealLight, color: T.teal,     text: "Medium"    },
  };
  const s = map[risk] || map["Medium"];
  return <span style={{ ...S.label, background: s.bg, color: s.color, padding: "2px 8px", borderRadius: 20, fontSize: 9 }}>{s.text}</span>;
}

// Extracts the "+X%" label from a potencial string for compact display
function extractPotLabel(str) {
  if (!str) return null;
  const m = str.match(/[+](\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const num = parseFloat(m[1].replace(",", "."));
  if (isNaN(num)) return null;
  // If it's a range like "+13-21%" show "+13-21%", otherwise "+X%"
  const rangeM = str.match(/[+](\d+(?:[.,]\d+)?-\d+(?:[.,]\d+)?)\s*%/);
  return rangeM ? `+${rangeM[1]}%` : `+${num}%`;
}

function PotencialBadge({ potencial }) {
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

function RangoBadge({ rango }) {
  if (!rango?.bajada_max && !rango?.subida_max) return null;
  return (
    <span style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
      {rango?.subida_max && (
        <span title="Subida máxima estimada (bull case)" style={{
          fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 500,
          background: "#F0FDF4", color: "#15803D",
          border: "1px solid #86efac",
          padding: "2px 8px", borderRadius: 20,
        }}>{rango.subida_max}</span>
      )}
      {rango?.bajada_max && (
        <span title="Bajada máxima estimada (bear case)" style={{
          fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 500,
          background: "#FEF2F2", color: "#DC2626",
          border: "1px solid #FECACA",
          padding: "2px 8px", borderRadius: 20,
        }}>{rango.bajada_max}</span>
      )}
    </span>
  );
}

function InvestedVsTarget({ invested, target, tx }) {
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

function CoreCandidateRow({ s, invested, target, tx }) {
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

function SatelliteCandidateRow({ s, invested, target, tx }) {
  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: T.paper, gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flex: 1, minWidth: 0 }}>
          <span style={{ ...S.mono, fontSize: 11, color: T.teal, minWidth: 18, flexShrink: 0 }}>#{s.priority}</span>
          <span style={{ ...S.mono, fontSize: 14, fontWeight: 500, color: T.ink, minWidth: 44, flexShrink: 0 }}>{s.ticker}</span>
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</span>
          <span style={{ ...S.label, background: T.bg, border: `1px solid ${T.border}`, color: T.inkFaint, padding: "1px 7px", borderRadius: 20, fontSize: 9, flexShrink: 0 }}>{s.sector}</span>
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

function WildshotCandidateRow({ s, invested, target, tx }) {
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

function BucketAccordion({ title, accent, accentLight, accentBorder, count, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: T.paper, border: `1px solid ${accentBorder}`, borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", background: open ? accentLight : T.paper, border: "none", cursor: "pointer", transition: "background 0.15s" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: accent, flexShrink: 0 }} />
          <span style={{ ...S.serif, fontSize: 18, fontWeight: 600, color: T.ink }}>{title}</span>
          <span style={{ ...S.label, background: accentLight, color: accent, border: `1px solid ${accentBorder}`, padding: "2px 10px", borderRadius: 20, fontSize: 9 }}>{count} candidatos</span>
        </div>
        <span style={{ ...S.mono, fontSize: 18, color: accent }}>{open ? "−" : "+"}</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

/* --- Analysis tab components ---------------------------------------------- */
function AnalysisRow({ c, a, accent, accentLight, accentBorder, tx, isHeld }) {
  const [open, setOpen] = useState(false);

  // Extract potencial badge
  const potencial = a?.potencial;
  const isPositive = potencial && (potencial.startsWith("+") || /^\d/.test(potencial));

  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
      {/* Row header — always visible, click to toggle */}
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

      {/* Expandable analysis body */}
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

          {/* Consenso */}
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

          {/* Risk summary — max 2 lines */}
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

function AnalysisBucketSection({ bucket, tickers, analysis, defaultOpen = false, tx, heldTickers }) {
  const [open, setOpen] = useState(defaultOpen);
  const accent       = bucket === "Core" ? T.gold  : bucket === "Satellite" ? T.teal  : T.ink;
  const accentLight  = bucket === "Core" ? T.goldLight : bucket === "Satellite" ? T.tealLight : T.bg;
  const accentBorder = bucket === "Core" ? T.goldBorder : bucket === "Satellite" ? T.tealBorder : T.borderDark;
  const analyzed     = tickers.filter(t => t.descripcion || t.ventaja).length;
  const heldCount    = heldTickers ? tickers.filter(t => heldTickers.has(t.ticker)).length : 0;

  return (
    <div style={{ background: T.paper, border: `1px solid ${accentBorder}`, borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
      {/* Bucket header */}
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

      {/* Company rows */}
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


/* --- Save template to disk ------------------------------------------------ */
function SaveTemplateButton({ filename, content, color, border, textColor, label: idleLabel = "↓ Descargar plantilla" }) {
  const [state, setState] = useState("idle"); // idle | saving | ok | error

  const handleSave = async () => {
    setState("saving");
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, content }),
      });
      if (!res.ok) throw new Error("Error del servidor");
      setState("ok");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  const label = state === "saving" ? "Guardando…" : state === "ok" ? "✓ Guardado" : state === "error" ? "✗ Error" : idleLabel;
  const bg    = state === "ok" ? "#F0FDF4" : state === "error" ? "#FEF2F2" : "white";
  const bd    = state === "ok" ? "#86efac" : state === "error" ? "#FECACA" : border;
  const tc    = state === "ok" ? "#15803D" : state === "error" ? "#DC2626" : textColor;

  return (
    <button
      onClick={handleSave}
      disabled={state === "saving"}
      style={{ ...S.label, fontSize: 9, padding: "3px 10px", borderRadius: 2, background: bg, border: `1px solid ${bd}`, color: tc, cursor: state === "saving" ? "default" : "pointer", transition: "all 0.2s" }}
    >{label}</button>
  );
}

/* --- Tutorial ------------------------------------------------------------ */
const TUTORIAL_TAB_ORDER = ["proyecto", "evolucion", "distribucion", "candidates", "movimientos", "analisis", "config"];

const TUTORIAL_STEPS = {
  proyecto: [
    { section: "Pantalla de inicio",    selector: null,
      title: "Bienvenido a STOX",
      text: "Esta es tu pantalla de inicio. Aquí defines los parámetros base de tu estrategia. Todo el dashboard —proyecciones, sugerencias y análisis— se alimenta de lo que configures aquí." },
    { section: "Modo de inversión",     selector: '[data-tut="modo-inversion"]',
      title: "¿Puntual o periódica?",
      text: "El bloque negro de arriba. Elige si invertirás una cantidad total de una sola vez (Puntual) o irás aportando de forma regular (Periódica). Esto cambia cómo se calculan todas las proyecciones." },
    { section: "Importe",               selector: '[data-tut="importe"]',
      title: "Tu capital de inversión",
      text: "El panel de la izquierda. Introduce el capital que destinas a esta estrategia. Si es periódica, indica cuánto aportas cada mes o trimestre. El dashboard derivará la inversión anual total automáticamente." },
    { section: "Análisis con Claude",   selector: '[data-tut="claude-analysis"]',
      title: "Informes con IA",
      text: "El bloque oscuro con el logotipo de Claude. Escribe un evento geopolítico o de mercado y genera un informe en profundidad. El análisis revisa tu portfolio y busca nuevas oportunidades relacionadas." },
    { section: "Split deseado",         selector: '[data-tut="split"]',
      title: "Distribución por bucket",
      text: "El panel con los tres sliders. Define qué porcentaje de tu capital va a Core (estable), Satellite (crecimiento) y Wildshots (especulativo). Deben sumar 100%. Usa los presets como punto de partida." },
    { section: "Retorno y horizonte",   selector: '[data-tut="importe"]',
      title: "Proyección a futuro",
      text: "El panel de la derecha. Fija tu retorno anual objetivo y el número de años. El dashboard calculará a cuánto llegaría tu capital al final del plazo con esos parámetros." },
  ],
  evolucion: [
    { section: "Inversión vs objetivo", selector: '[data-tut="evo-inversion"]',
      title: "¿Cómo vas respecto al plan?",
      text: "El panel de la izquierda. Compara lo que llevas invertido con tu objetivo anual o puntual. La barra de progreso te indica el porcentaje alcanzado de tu meta." },
    { section: "Retorno potencial",     selector: '[data-tut="evo-retorno"]',
      title: "Cuánto puede crecer tu cartera",
      text: "El panel verde. Muestra el retorno esperado ponderado según el campo 'potencial' de tu analysis.json. Solo se calcula para posiciones que tengan ese dato cubierto." },
    { section: "Proyección histórica",  selector: '[data-tut="evo-grafico"]',
      title: "El gráfico de evolución",
      text: "La línea sólida negra es lo que has invertido históricamente. La línea dorada muestra el capital acumulado planificado y la azul punteada es la proyección aplicando el retorno esperado." },
  ],
  distribucion: [
    { section: "Métricas clave",        selector: '[data-tut="portfolio-metricas"]',
      title: "Resumen del portfolio",
      text: "Las tres tarjetas superiores. De izquierda a derecha: capital total invertido, ratio riesgo/recompensa promedio de la cartera (R/R) y retorno potencial total en euros." },
    { section: "Distribución real vs objetivo", selector: '[data-tut="portfolio-split"]',
      title: "¿Estás en el split correcto?",
      text: "Las barras de cada bucket. Comparan el peso real de cada tipo de activo en tu cartera con el objetivo que fijaste en Inicio. Las barras rojas indican desviación respecto al plan." },
    { section: "Posiciones actuales",   selector: '[data-tut="portfolio-split"]',
      title: "Detalle de cada posición",
      text: "La tabla de abajo lista todas tus posiciones con su bucket, importe invertido, peso en la cartera y datos de análisis si los hay. Puedes expandir cada una para ver la tesis." },
  ],
  candidates: [
    { section: "Lista de candidatos",   selector: '[data-tut="candidates-header"]',
      title: "Empresas bajo seguimiento",
      text: "Todos los tickers de tu analysis.json aparecen aquí agrupados por bucket. Muestra la tesis de inversión, la ventaja competitiva y el rango de precios esperado." },
    { section: "Rango de precios",      selector: '[data-tut="candidates-header"]',
      title: "Bajada máxima y subida máxima",
      text: "El badge rojo/verde en cada candidato. Viene del campo 'rango' de tu JSON y refleja el escenario bajista y alcista estimado. El ratio R/R resume la asimetría riesgo/recompensa." },
    { section: "Tesis de inversión",    selector: '[data-tut="candidates-header"]',
      title: "Despliega para leer más",
      text: "Haz clic en cualquier empresa para expandir su ficha completa: descripción del negocio, ventaja competitiva, motivo de inversión, estimaciones y escenarios." },
  ],
  movimientos: [
    { section: "Next Move",             selector: '[data-tut="next-move"]',
      title: "Qué hacer ahora",
      text: "El bloque de cabecera. Resume la acción más urgente según el estado actual de tu cartera: si hay posiciones a rotar, oportunidades de compra claras o si el portfolio está en orden." },
    { section: "Ventas recomendadas",   selector: '[data-tut="mov-ventas"]',
      title: "Posiciones a reconsiderar",
      text: "Posiciones de tu portfolio cuyo R/R es inferior a 1 (la bajada potencial supera la subida) o que tienen marcado 'rotate: true' en el análisis. Aparecen ordenadas de peor a mejor." },
    { section: "Compras recomendadas",  selector: '[data-tut="mov-compras"]',
      title: "Candidatos con mejor R/R",
      text: "Tickers de tu analysis.json que aún no tienes en cartera, ordenados por ratio R/R descendente. Son las entradas con mejor asimetría riesgo/recompensa disponibles." },
    { section: "Todos los candidatos",  selector: '[data-tut="mov-todos"]',
      title: "Vista completa por bucket",
      text: "La sección inferior. Muestra todos los candidatos del análisis agrupados por bucket, con indicador de cuáles ya tienes en cartera. Útil para comparar antes de actuar." },
  ],
  analisis: [
    { section: "Candidatos por bucket", selector: '[data-tut="analisis-buckets"]',
      title: "Análisis agrupado",
      text: "Los candidatos del JSON aparecen agrupados por tipo: Core, Satellite y Wildshots. El badge 'En cartera' (azul) indica qué empresas ya tienes en tu portfolio." },
    { section: "Indicadores por empresa", selector: '[data-tut="analisis-buckets"]',
      title: "R/R, potencial y estimaciones",
      text: "Cada fila muestra el ratio R/R, el upside potencial y las estimaciones de precio. Los colores indican calidad: verde para R/R ≥ 2.5, ámbar para ≥ 1.5 y rojo para < 1.5." },
    { section: "Riesgo del portfolio",  selector: '[data-tut="analisis-riesgo"]',
      title: "Escenarios por bucket",
      text: "La sección inferior muestra la exposición máxima a pérdida de cada bucket según los rangos bajistas de tu análisis. Te ayuda a calibrar cuánto puedes perder en el peor escenario." },
  ],
  config: [
    { section: "Datos de posiciones (CSV)", selector: '[data-tut="config-csv"]',
      title: "Importa tu historial de eToro",
      text: "El panel izquierdo. Arrastra o selecciona el CSV exportado de tu Google Sheets con las operaciones de eToro. La app lo procesa íntegramente en local, sin enviar datos a ningún servidor." },
    { section: "Análisis (JSON)",       selector: '[data-tut="config-json"]',
      title: "Tu base de conocimiento",
      text: "El panel derecho. Sube el analysis.json con las tesis, rangos y estimaciones por ticker. Este archivo alimenta Candidates, Análisis, Movimientos y el retorno esperado del header." },
    { section: "Plantillas",            selector: '[data-tut="config-csv"]',
      title: "Descarga los formatos base",
      text: "Los botones 'Descargar plantilla' de cada panel guardan directamente en la carpeta Templates/ de STOX el CSV o JSON vacío con la estructura exacta que espera la aplicación." },
  ],
};

function TutorialCard({ steps, step, onNext, onPrev, onClose, onSkip, tabLabel, hasNextTab }) {
  const current = steps[step];
  const total   = steps.length;
  const isLast  = step === total - 1;
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      zIndex: 300, width: "min(440px, calc(100vw - 160px))",
      background: T.ink, border: `1px solid ${T.gold}`,
      borderRadius: 4, boxShadow: "0 8px 40px rgba(0,0,0,0.45)",
      overflow: "hidden",
      animation: "tutSlideUp 0.22s ease",
    }}>
      <style>{`@keyframes tutSlideUp { from { opacity: 0; transform: translateX(-50%) translateY(18px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
      {/* Header bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderBottom: `1px solid #222`, background: "#111" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ ...S.label, fontSize: 9, color: T.gold }}>{tabLabel}</span>
          <span style={{ ...S.label, fontSize: 9, color: "#333" }}>·</span>
          {/* Section indicator */}
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: "#777", background: "#1a1a1a", border: "1px solid #2a2a2a", padding: "1px 8px", borderRadius: 20 }}>
            📍 {current.section}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ ...S.label, fontSize: 9, color: "#444" }}>{step + 1}/{total}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 16, lineHeight: 1, padding: "0 2px" }}>×</button>
        </div>
      </div>
      {/* Body */}
      <div style={{ padding: "16px 18px 12px" }}>
        <p style={{ ...S.serif, margin: "0 0 8px", fontSize: 17, fontWeight: 600, color: T.goldLight }}>{current.title}</p>
        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#aaa", margin: 0, lineHeight: 1.7 }}>{current.text}</p>
      </div>
      {/* Step dots + nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 14px" }}>
        {/* Dots */}
        <div style={{ display: "flex", gap: 5 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ width: i === step ? 16 : 6, height: 6, borderRadius: 3, background: i === step ? T.gold : "#333", transition: "width 0.2s, background 0.2s" }} />
          ))}
        </div>
        {/* Buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          {step > 0 && (
            <button onClick={onPrev} style={{ ...S.label, fontSize: 9, padding: "5px 12px", borderRadius: 2, background: "transparent", border: `1px solid #333`, color: "#666", cursor: "pointer" }}>
              ← Anterior
            </button>
          )}
          {/* Skip tab button — only if there's a next tab and we're not on the last step going to close */}
          {hasNextTab && (
            <button onClick={onSkip} style={{ ...S.label, fontSize: 9, padding: "5px 12px", borderRadius: 2, background: "transparent", border: `1px solid #2a2a2a`, color: "#555", cursor: "pointer" }}>
              Saltar pestaña ↷
            </button>
          )}
          {!isLast ? (
            <button onClick={onNext} style={{ ...S.label, fontSize: 9, padding: "5px 14px", borderRadius: 2, background: T.gold, border: `1px solid ${T.gold}`, color: T.ink, cursor: "pointer" }}>
              Siguiente →
            </button>
          ) : hasNextTab ? (
            <button onClick={onSkip} style={{ ...S.label, fontSize: 9, padding: "5px 14px", borderRadius: 2, background: T.gold, border: `1px solid ${T.gold}`, color: T.ink, cursor: "pointer" }}>
              Siguiente pestaña →
            </button>
          ) : (
            <button onClick={onClose} style={{ ...S.label, fontSize: 9, padding: "5px 14px", borderRadius: 2, background: T.gold, border: `1px solid ${T.gold}`, color: T.ink, cursor: "pointer" }}>
              ✓ Listo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* --- Risk tab shared components ------------------------------------------- */
function EstCell({ val }) {
  if (val === null || val === undefined) return <span style={{ ...S.mono, fontSize: 12, color: T.inkFaint }}>—</span>;
  const pos = val >= 0;
  return <span style={{ ...S.mono, fontSize: 12, fontWeight: 500, color: pos ? "#15803D" : "#DC2626" }}>{pos ? "+" : ""}{val}%</span>;
}

function RiskAccordion({ title, count, children, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen ?? true);
  return (
    <div style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", cursor: "pointer", userSelect: "none" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <p style={{ ...S.serif, margin: 0, fontSize: 17, fontWeight: 600, color: T.ink }}>{title}</p>
          <span style={{ ...S.label, fontSize: 9, background: T.bg, border: `1px solid ${T.border}`, color: T.inkFaint, padding: "1px 8px", borderRadius: 20 }}>{count}</span>
        </div>
        <span style={{ color: T.inkFaint, fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && <div style={{ borderTop: `1px solid ${T.border}` }}>{children}</div>}
    </div>
  );
}

function BucketRiskAccordion({ bucket, count, accent, accentLight, accentBorder, children }) {
  const [open, setBOpen] = useState(true);
  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
      <div
        onClick={() => setBOpen(o => !o)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 20px", background: accentLight, borderBottom: open ? `1px solid ${accentBorder}` : "none", cursor: "pointer", userSelect: "none" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: accent }} />
          <span style={{ ...S.label, fontSize: 9, color: accent }}>{bucket}</span>
          <span style={{ ...S.label, fontSize: 9, color: T.inkFaint }}>{count}</span>
        </div>
        <span style={{ color: T.inkFaint, fontSize: 11 }}>{open ? "▲" : "▼"}</span>
      </div>
      {open && children}
    </div>
  );
}

/* ========================================================================== */
/* --- i18n translations ---------------------------------------------------- */
const I18N = {
  es: {
    modeDemo: "MODO DEMO — sube tu CSV en ⚙ Configuración",
    invested: "Invertido",
    target: "Objetivo",
    tabProyecto: "Inicio",
    tabEvolucion: "Evolución",
    tabPortfolio: "Mi portfolio",
    tabCandidates: "Candidates",
    tabAnalisis: "Análisis",
    tabVolatilidad: "Volatilidad",
    tabConfig: "⚙ Configuración",
    demoBanner: "Datos de ejemplo. Ve a",
    demoConfig: "Configuración",
    demoSuffix: "para actualizar el estado de tu proyecto.",
    goToConfig: "Ir a Configuración →",
    cardPortfolio: "Portfolio",
    cardCapital: "Capital desplegado",
    cardRealCapital: "Capital real desplegado",
    cardPositions: "Posiciones",
    cardPotReturn: "Retorno potencial",
    cardPotReturnSub: "Media ponderada sobre capital",
    cardExpected: "Valor esperado",
    noPotData: "Sin datos de potencial en el análisis",
    loadCsvConfig: "Carga tu CSV en Configuración para ver la distribución real de tu cartera.",
    loadAnalysisConfig: "Carga tu analysis.json en ⚙ Configuración",
    proyectoTitle: "Configuración del proyecto",
    proyectoDesc: "Define tu estrategia de inversión, distribución por bucket y objetivos.",
    investMode: "Modo de inversión",
    modeOnce: "Inversión puntual",
    modeOnceSub: "Un único desembolso de capital",
    modePeriodic: "Inversión periódica",
    modePeriodicSub: "Aportaciones regulares programadas",
    periodicity: "Periodicidad",
    monthly: "Mensual",
    quarterly: "Trimestral",
    monthlyAmount: "Aportación mensual",
    quarterlyAmount: "Aportación trimestral",
    annualPlanned: "Inversión anual planeada",
    targetAmount: "Importe a invertir",
    targetAmountDesc: "Capital total disponible para esta inversión",
    presets: "Distribución por bucket",
    conservative: "Conservador",
    balanced: "Equilibrado",
    aggressive: "Agresivo",
    coreAlloc: "Core · ETFs / Dividendos estables",
    satelliteAlloc: "Satellite · Crecimiento selectivo",
    wildshotsAlloc: "Wildshots · Alta convicción / alto riesgo",
    evolucionTitle: "Evolución del portfolio",
    currentInvest: "Inversión actual",
    objective: "Objetivo",
    remaining: "Faltan",
    completed: "completado",
    projectedGrowth: "Crecimiento proyectado",
    potReturn: "Retorno potencial",
    potReturnPct: "Retorno potencial (%)",
    distTitle: "Distribución real vs objetivo",
    real: "Real",
    bucketBreakdown: "Desglose por bucket",
    capital: "Capital (€)",
    distribution: "Distribución (%)",
    progress: "Progreso",
    retPotential: "Ret. potencial",
    rrWeighted: "R/R ponderado",
    inObjective: "✓ En objetivo",
    vsObjective: "pp vs objetivo",
    nextMoveSub_once: "despliegue del capital total",
    nextMoveSub_monthly: "compra sugerida este mes",
    buyNow: "Invertir ahora",
    buyThisMonth: "Comprar este mes",
    buyThisQuarter: "Comprar este trimestre",
    closePlan: "Cerrar plan ▲",
    openPlanOnce: "Ver plan de despliegue ▼",
    openPlan: "Ver plan completo ▼",
    planTotal: "Plan de despliegue total",
    planQuarterly: "Plan trimestral — saldo restante",
    planMonthly: "Plan mensual completo",
    budgetExhausted: " · presupuesto agotado este trimestre",
    deployed: "desplegados",
    surplus: "restantes",
    accumulate: "Acumular",
    accumulateNext_monthly: "mes que viene",
    accumulateNext_quarterly: "próximo trimestre",
    accumulatePrefix: "Acumular el",
    accumulateSuffix: "(no llegan a",
    accumulateInsuf: "Importe insuficiente (mínimo",
    candidatesTitle: "Investment Candidates",
    candidatesDesc: "Universo de candidatos por bucket. Haz clic para ver thesis, catalizadores y escenarios.",
    noCandidates: "Sin candidatos cargados",
    noCandidatesDesc: "Carga tu analysis.json en Configuración para ver los candidatos, tesis y sugerencias de compra.",
    rrRatio: "R/R ratio",
    riskTitle: "Análisis de riesgos",
    riskDesc: "Vulnerabilidades del portfolio y estimaciones de bajada por posición.",
    noAnalysisData: "Sin datos de análisis",
    noAnalysisDesc: "Carga tu analysis.json con los campos rango y estimacion en Configuración.",
    maxLoss: "Pérdida máxima estimada",
    maxLossScenario: "Escenario adverso",
    positionsCovered: "posiciones cubiertas",
    candWithRisk: "Candidates con datos de riesgo",
    candWithRiskDesc: "Del universo de candidatos analizados",
    currentPortfolio: "Portfolio actual",
    positions: "posiciones",
    position: "posición",
    candidates_label: "Candidates",
    analyzed: "analizados",
    ticker: "Ticker",
    name: "Nombre",
    maxDown: "Bajada máx.",
    maxUp: "Subida máx.",
    bearScenarios: "Escenarios bajistas",
    analysisTitle: "Análisis de empresas",
    analysisDesc: "Descripción del negocio, ventaja competitiva y motivo de inversión por candidato. Haz clic en una empresa para leer su análisis.",
    noAnalysis: "Sin análisis cargado",
    noAnalysisSubDesc: "Carga tu analysis.json en Configuración para ver las tesis, candidatos y escenarios por empresa.",
    analyzed_label: "analizados",
    pending: "pendientes",
    thesis: "Tesis",
    advantage: "Ventaja competitiva",
    whyNow: "¿Por qué ahora?",
    mainRisk: "Riesgo principal",
    consensus: "Consenso",
    bearScenario: "Escenario bajista",
    bullScenario: "Escenario alcista",
    configTitle: "Configuración",
    configDesc: "Importa tus datos de eToro y el análisis de empresas. Todo se procesa localmente en tu navegador.",
    positionsData: "Datos de posiciones",
    csvLoaded: "CSV cargado",
    dragCsv: "Arrastra tu CSV aquí",
    clickSelect: "o haz clic para seleccionar",
    expectedCols: "Columnas esperadas",
    hideCsvTemplate: "Ocultar plantilla",
    showCsvTemplate: "Ver plantilla CSV",
    analysisData: "Datos de análisis",
    dragJson: "Arrastra tu analysis.json aquí",
    analysisLoaded: "Analysis cargado",
    claudeAnalysisTitle: "Análisis geopolítico con Claude",
    claudeAnalysisDesc: "Abre un nuevo chat de Claude con el análisis completo pre-configurado. La fecha de hoy y tu portfolio actual se rellenan automáticamente.",
    eventoLabel: "Evento geopolítico a analizar",
    eventoPlaceholder: "Ej: \"Aranceles de Trump a la UE\", \"Crisis en Taiwán\"",
    sectoresLabel: "Sectores nuevos a explorar",
    sectoresPlaceholder: "Ej: \"Defensa, Energía\" o \"Déjalo en tu criterio\"",
    dateAuto: "Fecha (auto)",
    portfolioAuto: "Portfolio (auto",
    openClaude: "Abrir análisis en Claude →",
    deepResearchNote: "Activa Deep Research manualmente en el chat antes de enviar para mejores resultados",
    noFinancialAdvice: "No es asesoramiento financiero · Referencia personal",
    processing: "Procesando...",
    error: "Error",
    copy: "Copiar",
    positions_label: "posiciones",
  },
  en: {
    modeDemo: "DEMO MODE — upload your CSV in ⚙ Settings",
    invested: "Invested",
    target: "Target",
    tabProyecto: "Home",
    tabEvolucion: "Evolution",
    tabPortfolio: "My Portfolio",
    tabCandidates: "Candidates",
    tabAnalisis: "Analysis",
    tabVolatilidad: "Volatility",
    tabConfig: "⚙ Settings",
    demoBanner: "Sample data. Go to",
    demoConfig: "Settings",
    demoSuffix: "to update your project status.",
    goToConfig: "Go to Settings →",
    cardPortfolio: "Portfolio",
    cardCapital: "Deployed capital",
    cardRealCapital: "Real deployed capital",
    cardPositions: "Positions",
    cardPotReturn: "Potential return",
    cardPotReturnSub: "Weighted avg over capital",
    cardExpected: "Expected value",
    noPotData: "No potential data in analysis",
    loadCsvConfig: "Load your CSV in Settings to see your portfolio distribution.",
    loadAnalysisConfig: "Load your analysis.json in ⚙ Settings",
    proyectoTitle: "Project setup",
    proyectoDesc: "Define your investment strategy, bucket allocation and targets.",
    investMode: "Investment mode",
    modeOnce: "One-time investment",
    modeOnceSub: "Single capital deployment",
    modePeriodic: "Periodic investment",
    modePeriodicSub: "Regular scheduled contributions",
    periodicity: "Frequency",
    monthly: "Monthly",
    quarterly: "Quarterly",
    monthlyAmount: "Monthly contribution",
    quarterlyAmount: "Quarterly contribution",
    annualPlanned: "Planned annual investment",
    targetAmount: "Amount to invest",
    targetAmountDesc: "Total capital available for this investment",
    presets: "Bucket allocation",
    conservative: "Conservative",
    balanced: "Balanced",
    aggressive: "Aggressive",
    coreAlloc: "Core · ETFs / Stable dividends",
    satelliteAlloc: "Satellite · Selective growth",
    wildshotsAlloc: "Wildshots · High conviction / high risk",
    evolucionTitle: "Portfolio evolution",
    currentInvest: "Current investment",
    objective: "Target",
    remaining: "Remaining",
    completed: "completed",
    projectedGrowth: "Projected growth",
    potReturn: "Potential return",
    potReturnPct: "Potential return (%)",
    distTitle: "Actual vs target distribution",
    real: "Actual",
    bucketBreakdown: "Bucket breakdown",
    capital: "Capital (€)",
    distribution: "Distribution (%)",
    progress: "Progress",
    retPotential: "Pot. return",
    rrWeighted: "Weighted R/R",
    inObjective: "✓ On target",
    vsObjective: "pp vs target",
    nextMoveSub_once: "total capital deployment",
    nextMoveSub_monthly: "suggested buy this month",
    buyNow: "Invest now",
    buyThisMonth: "Buy this month",
    buyThisQuarter: "Buy this quarter",
    closePlan: "Close plan ▲",
    openPlanOnce: "View deployment plan ▼",
    openPlan: "View full plan ▼",
    planTotal: "Total deployment plan",
    planQuarterly: "Quarterly plan — remaining budget",
    planMonthly: "Full monthly plan",
    budgetExhausted: " · quarterly budget exhausted",
    deployed: "deployed",
    surplus: "remaining",
    accumulate: "Accumulate",
    accumulateNext_monthly: "next month",
    accumulateNext_quarterly: "next quarter",
    accumulatePrefix: "Accumulate",
    accumulateSuffix: "(below",
    accumulateInsuf: "Insufficient amount (min",
    candidatesTitle: "Investment Candidates",
    candidatesDesc: "Candidate universe by bucket. Click to see thesis, catalysts and scenarios.",
    noCandidates: "No candidates loaded",
    noCandidatesDesc: "Load your analysis.json in Settings to see candidates, thesis and buy suggestions.",
    rrRatio: "R/R ratio",
    riskTitle: "Risk analysis",
    riskDesc: "Portfolio vulnerabilities and downside estimates by position.",
    noAnalysisData: "No analysis data",
    noAnalysisDesc: "Load your analysis.json with rango and estimacion fields in Settings.",
    maxLoss: "Estimated max loss",
    maxLossScenario: "Adverse scenario",
    positionsCovered: "positions covered",
    candWithRisk: "Candidates with risk data",
    candWithRiskDesc: "From the analyzed candidate universe",
    currentPortfolio: "Current portfolio",
    positions: "positions",
    position: "position",
    candidates_label: "Candidates",
    analyzed: "analyzed",
    ticker: "Ticker",
    name: "Name",
    maxDown: "Max. drawdown",
    maxUp: "Max. upside",
    bearScenarios: "Bear scenarios",
    analysisTitle: "Company analysis",
    analysisDesc: "Business description, competitive advantage and investment rationale per candidate. Click a company to read its analysis.",
    noAnalysis: "No analysis loaded",
    noAnalysisSubDesc: "Load your analysis.json in Settings to see thesis, candidates and scenarios per company.",
    analyzed_label: "analyzed",
    pending: "pending",
    thesis: "Thesis",
    advantage: "Competitive advantage",
    whyNow: "Why now?",
    mainRisk: "Main risk",
    consensus: "Consensus",
    bearScenario: "Bear scenario",
    bullScenario: "Bull scenario",
    configTitle: "Settings",
    configDesc: "Import your eToro data and company analysis. Everything is processed locally in your browser.",
    positionsData: "Positions data",
    csvLoaded: "CSV loaded",
    dragCsv: "Drag your CSV here",
    clickSelect: "or click to select",
    expectedCols: "Expected columns",
    hideCsvTemplate: "Hide template",
    showCsvTemplate: "View CSV template",
    analysisData: "Analysis data",
    dragJson: "Drag your analysis.json here",
    analysisLoaded: "Analysis loaded",
    claudeAnalysisTitle: "Geopolitical analysis with Claude",
    claudeAnalysisDesc: "Opens a new Claude chat with the full analysis pre-configured. Today\'s date and your current portfolio are filled in automatically.",
    eventoLabel: "Geopolitical event to analyze",
    eventoPlaceholder: "E.g. \"Trump tariffs on the EU\", \"Taiwan crisis\"",
    sectoresLabel: "New sectors to explore",
    sectoresPlaceholder: "E.g. \"Defense, Energy\" or \"Leave it to your discretion\"",
    dateAuto: "Date (auto)",
    portfolioAuto: "Portfolio (auto",
    openClaude: "Open analysis in Claude →",
    deepResearchNote: "Enable Deep Research manually in the chat before sending for best results",
    noFinancialAdvice: "Not financial advice · Personal reference",
    processing: "Processing...",
    error: "Error",
    copy: "Copy",
    positions_label: "positions",
  }
};

/* --- AddMovementModal ----------------------------------------------------- */
function AddMovementModal({ rawTransactions, onSave, onClose }) {
  const today = new Date().toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" });
  const [action,     setAction]     = useState("Buy");
  const [date,       setDate]       = useState(today);
  const [quantity,   setQuantity]   = useState("");
  const [shareValue, setShareValue] = useState("");
  const [company,    setCompany]    = useState("");
  const [industry,   setIndustry]   = useState("");
  const [bucket,     setBucket]     = useState("Core");
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

  // Derive unique known companies, industries from existing transactions
  const knownCompanies = [...new Set(rawTransactions.map(t => t.Company).filter(Boolean))];
  const knownIndustries = [...new Set(rawTransactions.map(t => t.Industry).filter(Boolean))];

  const handleCompanySelect = (val) => {
    setCompany(val);
    const match = rawTransactions.find(t => t.Company === val);
    if (match) { setIndustry(match.Industry); setBucket(match.Bucket); }
  };

  const valid = company.trim() && quantity && date;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      await onSave({ action, date, quantity: quantity.replace("€","").trim(), shareValue: shareValue.replace("€","").trim(), company: company.trim(), industry: industry.trim(), bucket });
      setSaved(true);
      setTimeout(() => { setSaved(false); onClose(); }, 1200);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: "100%", padding: "10px 12px", background: "#111", border: `1px solid #333`, borderRadius: 2, fontFamily: "'DM Mono',monospace", fontSize: 13, color: "#e5e5e5", outline: "none", boxSizing: "border-box" };
  const labelStyle = { ...S.label, fontSize: 9, color: "#666", display: "block", marginBottom: 5 };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 100, backdropFilter: "blur(3px)" }} />
      <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 101, background: "#0a0a0a", border: `1px solid ${T.gold}`, borderRadius: 2, width: "min(520px, 95vw)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ ...S.serif, margin: 0, fontSize: 18, fontWeight: 600, color: T.goldLight }}>Añadir movimiento</p>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: "#555", margin: "2px 0 0" }}>Se guardará directamente en tu CSV</p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#555", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        {/* Form */}
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Action + Date */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <span style={labelStyle}>ACCIÓN</span>
              <select value={action} onChange={e => setAction(e.target.value)} style={{ ...inputStyle }}>
                <option value="Buy">Buy — Compra</option>
                <option value="Sell">Sell — Venta</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <span style={labelStyle}>FECHA</span>
              <input value={date} onChange={e => setDate(e.target.value)} placeholder="DD/MM/YYYY" style={inputStyle} />
            </div>
          </div>

          {/* Quantity + Share value */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <span style={labelStyle}>CANTIDAD (€)</span>
              <input type="number" min="0" step="1" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="250" style={inputStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <span style={labelStyle}>PRECIO POR ACCIÓN (€)</span>
              <input type="number" min="0" step="0.01" value={shareValue} onChange={e => setShareValue(e.target.value)} placeholder="168" style={inputStyle} />
            </div>
          </div>

          {/* Company */}
          <div>
            <span style={labelStyle}>EMPRESA</span>
            <input
              list="company-list"
              value={company}
              onChange={e => handleCompanySelect(e.target.value)}
              placeholder='Ej: "Broadcom Inc. (AVGO)"'
              style={inputStyle}
            />
            <datalist id="company-list">
              {knownCompanies.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>

          {/* Industry + Bucket */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <span style={labelStyle}>SECTOR</span>
              <input list="industry-list" value={industry} onChange={e => setIndustry(e.target.value)} placeholder="Technology" style={inputStyle} />
              <datalist id="industry-list">
                {knownIndustries.map(i => <option key={i} value={i} />)}
              </datalist>
            </div>
            <div style={{ flex: 1 }}>
              <span style={labelStyle}>BUCKET</span>
              <select value={bucket} onChange={e => setBucket(e.target.value)} style={inputStyle}>
                <option value="Core">Core</option>
                <option value="Satellite">Satellite</option>
                <option value="Wildshot">Wildshot</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 24px 20px", borderTop: "1px solid #1a1a1a", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", background: "transparent", color: "#666", border: "1px solid #333", borderRadius: 2, fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!valid || saving}
            style={{ padding: "10px 24px", background: valid ? (saved ? T.positive : T.gold) : "#1a1a1a", color: valid ? T.neutral : "#444", border: `1px solid ${valid ? T.gold : "#333"}`, borderRadius: 2, fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, cursor: valid ? "pointer" : "not-allowed", transition: "all 0.15s", minWidth: 120 }}
          >
            {saved ? "✓ Guardado" : saving ? "Guardando…" : "Guardar movimiento"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ========================================================================== */
export default function App() {
  const [tab,              setTab]              = useState("proyecto");
  const [planOpen,         setPlanOpen]         = useState(false);
  const [positions,        setPositions]        = useState(() => aggregateTransactions(DEMO_TRANSACTIONS));
  const [rawTransactions,  setRawTransactions]  = useState(DEMO_TRANSACTIONS);
  const [history]                               = useState(DEMO_HISTORY);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState("");
  const [isDemo,           setIsDemo]           = useState(true);
  const [fileName,         setFileName]         = useState("");
  const [dragOver,         setDragOver]         = useState(false);
  const [desiredInvestment,setDesiredInvestment]= useState(5000);
  const [desiredReturn,    setDesiredReturn]    = useState(15);
  const [desiredSplit,     setDesiredSplit]     = useState({ Core: 50, Satellite: 25, Wildshots: 25 });
  const [investmentMode,   setInvestmentMode]   = useState("periodica"); // "puntual" | "periodica"
  const [lang,             setLang]             = useState("es"); // "es" | "en"
  const tx = I18N[lang];
  const [periodicity,      setPeriodicity]      = useState("mensual");   // "mensual" | "trimestral"
  const [periodicAmount,   setPeriodicAmount]   = useState(417);

  const [analysis,         setAnalysis]         = useState({});
  const [analysisFile,     setAnalysisFile]     = useState("");
  const [analysisDrag,     setAnalysisDrag]     = useState(false);
  const jsonInputRef = useRef(null);
  const [showCsvTemplate,  setShowCsvTemplate]  = useState(false);
  const [showJsonTemplate, setShowJsonTemplate] = useState(false);
  const [analysisError,    setAnalysisError]    = useState("");
  const [csvDragOver,      setCsvDragOver]      = useState(false);
  const [eventoInput,      setEventoInput]      = useState("");
  const [sectoresInput,    setSectoresInput]    = useState("Déjalo en tu criterio");
  const csvInputRef = useRef(null);
  const [csvFileHandle,    setCsvFileHandle]    = useState(null);
  const [showAddMovement,  setShowAddMovement]  = useState(false);
  const [movementSaved,    setMovementSaved]    = useState(false);
  const [tutorialActive,   setTutorialActive]   = useState(false);
  const [tutorialStep,     setTutorialStep]     = useState(0);
  const [snapshotState,    setSnapshotState]    = useState("idle"); // idle|saving|ok|error
  const [snapshotError,    setSnapshotError]    = useState("");
  // Derive monthly contribution based on investment mode
  const annualInvestment = investmentMode === "puntual"
    ? 0
    : periodicity === "mensual" ? periodicAmount * 12 : periodicAmount * 4;
  const monthlyContribDerived = investmentMode === "puntual" ? 0
    : periodicity === "mensual" ? periodicAmount
    : Math.round(periodicAmount / 3);

  // Current quarter bounds (Q1=0-2, Q2=3-5, Q3=6-8, Q4=9-11)
  const _now = new Date();
  const _currentQuarter = Math.floor(_now.getMonth() / 3);
  const _qStartMonth = _currentQuarter * 3; // 0-indexed month
  const _qStartYear  = _now.getFullYear();

  // Sum of Buy transactions within the current quarter from rawTransactions
  const investedThisQuarter = (() => {
    if (investmentMode !== "periodica" || periodicity !== "trimestral") return 0;
    return rawTransactions.reduce((sum, r) => {
      const action = (r.Action || r.action || "").trim().toLowerCase();
      if (action !== "buy") return sum;
      // Parse date: supports DD/MM/YYYY or YYYY-MM-DD
      const dateStr = (r.Date || r.date || "").trim();
      let d = null;
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
        const [dd, mm, yyyy] = dateStr.split("/");
        d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
      } else if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
        d = new Date(dateStr);
      }
      if (!d || isNaN(d.getTime())) return sum;
      const txQuarter = Math.floor(d.getMonth() / 3);
      const txYear    = d.getFullYear();
      if (txYear !== _qStartYear || txQuarter !== _currentQuarter) return sum;
      return sum + parseAmount(r.Quantity || r.quantity || "0");
    }, 0);
  })();

  // Budget available for next deployment
  const dcaBudget = (() => {
    if (investmentMode === "puntual") {
      return desiredInvestment > 0 ? desiredInvestment : 0;
    }
    if (periodicity === "trimestral") {
      return Math.max(0, periodicAmount - investedThisQuarter);
    }
    // mensual
    return monthlyContribDerived > 0 ? monthlyContribDerived : 500;
  })();
  const DCA_MIN = dcaBudget >= 300 ? 150 : 75;

  const handleAnalysisFile = useCallback(async (file) => {
    if (!file) return;
    setAnalysisError("");
    try {
      const text = await readFileAsText(file);
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("El archivo debe ser un objeto JSON con tickers como claves.");
      setAnalysis(parsed);
      setAnalysisFile(file.name);
    } catch (e) {
      setAnalysisError(e.message.includes("JSON") ? "JSON inválido. Revisa el formato del archivo." : e.message);
    }
  }, []);

  /* --- Slider handler: change one, redistribute others proportionally ----- */
  const handleSplitChange = useCallback((bucket, value) => {
    if (bucket === "__preset__") {
      setDesiredSplit(value);
      return;
    }
    setDesiredSplit(prev => {
      const clamped = Math.max(0, Math.min(100, value));
      const others = Object.keys(prev).filter(k => k !== bucket);
      const othersSum = others.reduce((s, k) => s + prev[k], 0);
      const remaining = 100 - clamped;
      const newSplit = { ...prev, [bucket]: clamped };
      if (othersSum > 0) {
        // redistribute proportionally using floor + give remainder to last bucket
        const shares = others.map(k => Math.floor(remaining * prev[k] / othersSum));
        const distributed = shares.reduce((s, v) => s + v, 0);
        const leftover = remaining - distributed; // always 0 or 1 due to floor
        others.forEach((k, i) => {
          newSplit[k] = Math.max(0, shares[i] + (i === others.length - 1 ? leftover : 0));
        });
      } else {
        // distribute evenly using floor + give remainder to first bucket
        const each = Math.floor(remaining / others.length);
        const leftover = remaining - each * others.length;
        others.forEach((k, i) => {
          newSplit[k] = each + (i === 0 ? leftover : 0);
        });
      }
      return newSplit;
    });
  }, []);

  /* --- File handler ------------------------------------------------------- */
  // Auto-load CSV from server on mount
  const loadFromAPI = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/portfolio");
      if (!res.ok) throw new Error("No se encontró el CSV en la carpeta Portfolio");
      const text = await res.text();
      const filename = res.headers.get("X-CSV-Filename") || "portfolio.csv";
      const transactions = parseCSV(text);
      if (!transactions.length) throw new Error("El CSV está vacío o sin el formato correcto.");
      const pos = aggregateTransactions(transactions);
      if (!pos.length) throw new Error("No se encontraron operaciones Buy válidas.");
      setPositions(pos);
      setRawTransactions(transactions);
      setFileName(filename);
      setIsDemo(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-load analysis JSON from server on mount
  const loadAnalysisFromAPI = useCallback(async () => {
    try {
      const res = await fetch("/api/analysis");
      if (!res.ok) return; // silencioso si no hay JSON todavía
      const text = await res.text();
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || Array.isArray(parsed)) return;
      const filename = res.headers.get("X-JSON-Filename") || "analysis.json";
      setAnalysis(parsed);
      setAnalysisFile(filename);
    } catch (_) {}
  }, []);

  // Load both on startup
  useEffect(() => {
    loadFromAPI();
    loadAnalysisFromAPI();
    // Load persisted config
    fetch('/api/config').then(r => r.json()).then(cfg => {
      if (!cfg || typeof cfg !== 'object') return;
      if (cfg.investmentMode)  setInvestmentMode(cfg.investmentMode);
      if (cfg.periodicity)     setPeriodicity(cfg.periodicity);
      if (typeof cfg.periodicAmount === 'number')   setPeriodicAmount(cfg.periodicAmount);
      if (typeof cfg.desiredInvestment === 'number') setDesiredInvestment(cfg.desiredInvestment);
      if (cfg.desiredSplit && typeof cfg.desiredSplit === 'object') setDesiredSplit(cfg.desiredSplit);
      if (typeof cfg.desiredReturn === 'number')    setDesiredReturn(cfg.desiredReturn);
      if (cfg.lang) setLang(cfg.lang);
    }).catch(() => {});
  }, []);

  // Auto-save config whenever key params change (debounced 800 ms)
  useEffect(() => {
    const t = setTimeout(() => {
      fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investmentMode, periodicity, periodicAmount,
                               desiredInvestment, desiredSplit, desiredReturn, lang }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [investmentMode, periodicity, periodicAmount, desiredInvestment, desiredSplit, desiredReturn, lang]);

  // Reset tutorial step when the tab changes
  useEffect(() => {
    setTutorialStep(0);
  }, [tab]);

  // Highlight the target element when tutorial step changes
  useEffect(() => {
    // Clean up any previous highlight
    const prev = document.querySelector('[data-tut-active]');
    if (prev) {
      prev.removeAttribute('data-tut-active');
      prev.style.outline      = '';
      prev.style.outlineOffset = '';
      prev.style.transition   = '';
    }
    if (!tutorialActive) return;
    const steps   = TUTORIAL_STEPS[tab] || [];
    const current = steps[tutorialStep];
    if (!current?.selector) return;
    const el = document.querySelector(current.selector);
    if (!el) return;
    el.setAttribute('data-tut-active', 'true');
    el.style.outline       = '2px solid #C5973A';
    el.style.outlineOffset = '4px';
    el.style.transition    = 'outline 0.2s, outline-offset 0.2s';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return () => {
      el.removeAttribute('data-tut-active');
      el.style.outline      = '';
      el.style.outlineOffset = '';
      el.style.transition   = '';
    };
  }, [tutorialActive, tutorialStep, tab]);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setLoading(true); setError("");
    try {
      const text = await readFileAsText(file);
      const transactions = parseCSV(text);
      if (!transactions.length) throw new Error("El CSV está vacío o sin el formato correcto.");
      const pos = aggregateTransactions(transactions);
      if (!pos.length) throw new Error("No se encontraron operaciones de compra (Action = Buy) válidas.");
      setPositions(pos);
      setRawTransactions(transactions);
      setFileName(file.name);
      setIsDemo(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop        = useCallback((e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }, [handleFile]);
  const handleInputChange = useCallback((e) => handleFile(e.target.files[0]), [handleFile]);
  const handleCSVOpen     = useCallback(() => csvInputRef.current?.click(), []);

  const addMovement = useCallback(async (row) => {
    const line = `${row.action},${row.date},${row.quantity} €,${row.shareValue} €,${row.company},${row.industry},${row.bucket}`;
    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: line,
    });
    if (!res.ok) throw new Error("Error al guardar el movimiento");
    await loadFromAPI();
    setMovementSaved(true);
    setTimeout(() => setMovementSaved(false), 2500);
  }, [loadFromAPI]);

  const clearFile         = useCallback(() => {
    setPositions(aggregateTransactions(DEMO_TRANSACTIONS));
    setRawTransactions(DEMO_TRANSACTIONS);
    setIsDemo(true); setFileName(""); setError("");
  }, []);

  /* --- Derived stats ------------------------------------------------------ */
  const totalInvertido = positions.reduce((s, p) => s + p.Invertido, 0);
  const splitTotal = Object.values(desiredSplit).reduce((s, v) => s + v, 0);
  const normalizedSplit = splitTotal === 100
    ? desiredSplit
    : { Core: desiredSplit.Core / splitTotal * 100, Satellite: desiredSplit.Satellite / splitTotal * 100, Wildshots: desiredSplit.Wildshots / splitTotal * 100 };

  /* --- Retorno potencial (from analysis.potencial, weighted by invested) --- */
  const parsePotencial = (str) => {
    if (!str) return null;
    // Match first "+X%" or "+X,Y%" or "+X-Y%" (take lower bound of range)
    const m = str.match(/[+](\d+(?:[.,]\d+)?)/); // find the +N part
    if (!m) return null;
    const val = parseFloat(m[1].replace(",", "."));
    return isNaN(val) ? null : val;
  };

  const potencialEntries = positions.map(p => {
    const a = analysis[p.Ticker];
    const pct = a ? parsePotencial(a.potencial) : null;
    return { ticker: p.Ticker, inv: p.Invertido, pct };
  }).filter(e => e.pct !== null && !isNaN(e.pct) && e.inv > 0);
  const coveredInv = potencialEntries.reduce((s, e) => s + e.inv, 0);
  const potentialReturn = coveredInv > 0
    ? (() => {
        const v = potencialEntries.reduce((s, e) => s + e.pct * (e.inv / coveredInv), 0);
        return isNaN(v) ? null : v.toFixed(1);
      })()
    : null;
  const potentialCoverage = totalInvertido > 0 ? Math.round(coveredInv / totalInvertido * 100) : 0;

  // En modo puntual los €X son incrementales: el target es "cartera actual + nueva aportación"
  // En otros modos desiredInvestment ya es el objetivo total del período
  const portfolioTarget = (investmentMode === "puntual" && totalInvertido > 0)
    ? totalInvertido + (desiredInvestment || 0)
    : (desiredInvestment || 0);

  const byBucket = ["Core", "Satellite", "Wildshots"].map(b => {
    const stocks    = positions.filter(p => p.Bucket === b);
    const inv       = stocks.reduce((s, p) => s + p.Invertido, 0);
    const realPct   = totalInvertido > 0 ? inv / totalInvertido : 0;
    const targetPct = (normalizedSplit[b] || 0) / 100;
    const targetAmt = portfolioTarget * (normalizedSplit[b] || 0) / 100;
    // Per-bucket potential: weighted avg of analysis.potencial for stocks in this bucket
    const bucketPotEntries = stocks.map(p => {
      const a = analysis[p.Ticker];
      const pct = a ? parsePotencial(a.potencial) : null;
      return { inv: p.Invertido, pct };
    }).filter(e => e.pct !== null && e.inv > 0);
    const bucketCoveredInv = bucketPotEntries.reduce((s, e) => s + e.inv, 0);
    const bucketPotReturn  = bucketCoveredInv > 0
      ? bucketPotEntries.reduce((s, e) => s + e.pct * (e.inv / bucketCoveredInv), 0)
      : null;
    const bucketPotEuros   = bucketPotReturn !== null ? inv * bucketPotReturn / 100 : null;

    // Weighted R/R for this bucket (investment-weighted avg)
    const bucketRREntries = stocks.map(p => {
      const a = analysis[p.Ticker];
      const up   = a?.rango?.subida_max ? Math.abs(parseRangePct(a.rango.subida_max)) : null;
      const down = a?.rango?.bajada_max ? Math.abs(parseRangePct(a.rango.bajada_max)) : null;
      const rr   = up && down && down > 0 ? up / down : null;
      return { inv: p.Invertido, rr };
    }).filter(e => e.rr !== null && e.inv > 0);
    const bucketRRCoveredInv = bucketRREntries.reduce((s, e) => s + e.inv, 0);
    const bucketWeightedRR   = bucketRRCoveredInv > 0
      ? bucketRREntries.reduce((s, e) => s + e.rr * (e.inv / bucketRRCoveredInv), 0)
      : null;

    return { bucket: b, inv, realPct, targetPct, targetAmt, diff: realPct - targetPct, stocks, bucketPotReturn, bucketPotEuros, bucketWeightedRR };
  });

  const totalPotEuros = byBucket.reduce((s, b) => s + (b.bucketPotEuros || 0), 0);
  const expectedFinal = totalInvertido + totalPotEuros;
  const activeBuckets = ["Core", "Satellite", "Wildshots"].filter(b => positions.some(p => p.Bucket === b));

  const distData = byBucket.map(b => ({
    name: b.bucket,
    Real:     +(b.realPct   * 100).toFixed(1),
    [tx.target]: +(b.targetPct * 100).toFixed(1),
  }));

  const blendedPotPct = potentialReturn ? parseFloat(potentialReturn) : 15;
  const monthlyGrowth = (blendedPotPct / 100) / 12;
  const monthlyContrib = monthlyContribDerived;
  const monthNames = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const currentMonth = new Date().getMonth();

  // Build evoData from actual transaction history + future projection
  const evoData = (() => {
    const now = new Date();
    const nowYear  = now.getFullYear();
    const nowMonth = now.getMonth(); // 0-indexed

    // Parse each raw transaction into { date, delta }
    const parsedTx = rawTransactions
      .map(r => {
        const dateStr = (r.Date || r.date || "").trim();
        const parts   = dateStr.split("/");
        if (parts.length !== 3) return null;
        const d = new Date(+parts[2], +parts[1] - 1, +parts[0]);
        if (isNaN(d.getTime())) return null;
        const action = (r.Action || r.action || "Buy").trim().toLowerCase();
        const amount = parseAmount(r.Quantity || r.quantity || "0");
        const delta  = action === "sell" ? -amount : amount;
        return { date: d, delta };
      })
      .filter(Boolean)
      .sort((a, b) => a.date - b.date);

    // Fallback if no parseable dates
    if (!parsedTx.length) {
      return Array.from({ length: Math.max(1, 12 - nowMonth) }, (_, i) => ({
        Fecha: monthNames[nowMonth + i],
        "Capital invertido": +(totalInvertido + monthlyContrib * i).toFixed(0),
      }));
    }

    const firstDate      = parsedTx[0].date;
    const firstYear      = firstDate.getFullYear();
    const firstMonthIdx  = firstDate.getMonth();

    // Aggregate transactions by year-month
    const monthlyDelta = {};
    parsedTx.forEach(({ date, delta }) => {
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      monthlyDelta[key] = (monthlyDelta[key] || 0) + delta;
    });

    // PAST: one point per month from first transaction to current month (inclusive)
    const histMonths = (nowYear - firstYear) * 12 + (nowMonth - firstMonthIdx) + 1;
    let cumulative = 0;
    const histPoints = Array.from({ length: histMonths }, (_, i) => {
      const absMonth = firstMonthIdx + i;
      const year  = firstYear + Math.floor(absMonth / 12);
      const month = absMonth % 12;
      cumulative += monthlyDelta[`${year}-${month}`] || 0;
      return {
        Fecha: `${monthNames[month]} ${String(year).slice(2)}`,
        "Capital invertido": +cumulative.toFixed(0),
      };
    });

    // FUTURE: project up to 6 months ahead with monthly contrib + blended return
    const projCount = Math.min(6, 12);
    const futurePoints = Array.from({ length: projCount }, (_, i) => {
      const absMonth = firstMonthIdx + histMonths + i;
      const year  = firstYear + Math.floor(absMonth / 12);
      const month = absMonth % 12;
      let proyeccion = cumulative;
      for (let m = 0; m <= i; m++) {
        proyeccion = proyeccion * (1 + monthlyGrowth) + monthlyContrib;
      }
      return {
        Fecha: `${monthNames[month]} ${String(year).slice(2)}`,
        "Proyección": +proyeccion.toFixed(0),
      };
    });

    return [...histPoints, ...futurePoints];
  })();

  /* --- Candidates: compute objetivo per ticker and look up invested -------- */
  // Derive candidatesByBucket from analysis JSON — source of truth
  const candidatesByBucket = (() => {
    const acc = { Core: [], Satellite: [], Wildshots: [] };
    Object.entries(analysis)
      .filter(([k]) => !k.startsWith("_"))
      .forEach(([ticker, d]) => {
        if (d.bucket && acc[d.bucket]) {
          acc[d.bucket].push({ ticker, ...d });
        }
      });
    // Sort: Core by weight desc, Satellite by priority asc, Wildshots by conviction desc
    acc.Core.sort((a, b) => (b.weight || 0) - (a.weight || 0));
    acc.Satellite.sort((a, b) => (a.priority || 99) - (b.priority || 99));
    acc.Wildshots.sort((a, b) => (b.conviction || 0) - (a.conviction || 0));
    return acc;
  })();

  // En modo puntual los €X son incrementales: el target es "cartera actual + nueva aportación"
  const coreTargetTotal = portfolioTarget * (normalizedSplit.Core || 0) / 100;
  const satTargetTotal  = portfolioTarget * (normalizedSplit.Satellite || 0) / 100;
  const wsTargetTotal   = portfolioTarget * (normalizedSplit.Wildshots || 0) / 100;

  const coreWeightTotal     = candidatesByBucket.Core.reduce((s, c) => s + (c.weight || 1), 0) || 1;
  const wsConvictionTotal   = candidatesByBucket.Wildshots.reduce((s, c) => s + (c.conviction || 1), 0) || 1;
  const satCount            = candidatesByBucket.Satellite.length || 1;

  const getCoreTarget = (c) => coreTargetTotal > 0 ? coreTargetTotal * (c.weight || 1) / coreWeightTotal : 0;
  const getSatTarget  = ()  => satTargetTotal  > 0 ? satTargetTotal  / satCount : 0;
  const getWsTarget   = (c) => wsTargetTotal   > 0 ? wsTargetTotal   * (c.conviction || 1) / wsConvictionTotal : 0;

  const getInvested = (ticker) => {
    const pos = positions.find(p => p.Ticker === ticker);
    return pos ? pos.Invertido : 0;
  };

  /* ======================================================================== */
  /* --- DCA Plan computation — greedy, priority-ordered -------------------- */
  const computeDCAPlan = (budget) => {
    const MIN = DCA_MIN;

    // 1. Composite scoring: R/R 50% | Deficit relativo 50%
    const RR_EXCEPTION_THRESHOLD = 1.9; // buy over-allocated bucket only if R/R >= this

    const scoreCandidate = (c, bucket) => {
      const invested = getInvested(c.ticker);
      let target = 0;
      if (bucket === "Core")           target = getCoreTarget(c);
      else if (bucket === "Satellite") target = getSatTarget();
      else                             target = getWsTarget(c);

      const deficit = Math.max(0, target - invested);
      if (deficit <= 0) return null; // individual target met, skip

      const deficitRelative = target > 0 ? deficit / target : 0;

      const a = analysis[c.ticker];
      const up   = a?.rango?.subida_max ? Math.abs(parseRangePct(a.rango.subida_max)) : null;
      const down = a?.rango?.bajada_max ? Math.abs(parseRangePct(a.rango.bajada_max)) : null;
      const rr   = up && down && down > 0 ? up / down : null;

      // Bucket-level over-allocation check (based on current real % vs desired %)
      // Tolerance of 2pp to avoid false positives from minor fluctuations
      const bucketRealPct  = (byBucket.find(b => b.bucket === bucket)?.realPct || 0) * 100;
      const bucketTargetPct = normalizedSplit[bucket] || 0;
      const bucketIsOver   = totalInvertido > 0 && bucketRealPct > bucketTargetPct + 2;
      if (bucketIsOver && (!rr || rr < RR_EXCEPTION_THRESHOLD)) {
        // Bucket over-represented and R/R not exceptional enough — skip
        return null;
      }

      const rrScore = rr !== null ? Math.min(rr / 5, 1) : 0.3;

      // Flag if this candidate is from an over-allocated bucket (but passed R/R check)
      const composite = (0.50 * rrScore) + (0.50 * deficitRelative);
      return { ...c, bucket, invested, target, deficit, deficitRelative, rr, rrScore, composite, bucketIsOver };
    };

    // 3. Score ALL candidates across all buckets, globally ranked
    const allScored = [];
    ["Core", "Satellite", "Wildshots"].forEach(bucket => {
      const maxPos = bucket === "Wildshots" ? 2 : 4;
      const scored = (candidatesByBucket[bucket] || [])
        .map(c => scoreCandidate(c, bucket))
        .filter(Boolean)
        .sort((a, b) => b.composite - a.composite)
        .slice(0, maxPos);
      allScored.push(...scored);
    });

    // Sort globally by composite score
    allScored.sort((a, b) => b.composite - a.composite);

    // 4. Greedy allocation: assign ideal share, guarantee MIN per pick
    // Pass 1: compute ideal proportional amounts
    const totalComposite = allScored.reduce((s, c) => s + c.composite, 0) || 1;
    let remaining = budget;
    const recommendations = [];

    // Greedy pass: iterate in score order, allocate at least MIN if budget allows
    for (const c of allScored) {
      if (remaining < MIN) break;

      // Ideal share proportional to score, but floor to MIN
      const idealShare = budget * (c.composite / totalComposite);
      const rawAmount  = Math.max(MIN, Math.floor(idealShare / 5) * 5);
      // If deficit < MIN, still allow up to MIN — avoids blocking all recs when
      // individual targets are small (e.g. deploying €500 across many candidates)
      const effectiveCap = Math.max(c.deficit, MIN);
      const amount     = Math.min(rawAmount, effectiveCap, remaining);
      const rounded    = Math.floor(amount / 5) * 5;

      if (rounded >= MIN) {
        recommendations.push({ ...c, amount: rounded, accumulate: false });
        remaining -= rounded;
      } else {
        // Can't afford MIN for this candidate right now — mark accumulate
        recommendations.push({ ...c, amount: 0, accumulate: true, accumulateTarget: MIN });
      }
    }

    // 5. Totals
    const bucketAlloc = {};
    recommendations.filter(r => !r.accumulate).forEach(r => {
      bucketAlloc[r.bucket] = (bucketAlloc[r.bucket] || 0) + r.amount;
    });

    const totalDeployed = recommendations.filter(r => !r.accumulate).reduce((s, r) => s + r.amount, 0);
    const surplus = budget - totalDeployed;

    return { recommendations, totalDeployed, surplus, bucketAlloc };
  };
  const dcaPlan = computeDCAPlan(dcaBudget);
  const dcaActionable    = dcaPlan.recommendations.filter(r => !r.accumulate && r.amount > 0);
  const dcaToAccumulate  = dcaPlan.recommendations.filter(r => r.accumulate);

  // Next Move: the single most impactful buy right now
  const nextMove = (() => {
    const actionable = dcaPlan.recommendations.filter(r => !r.accumulate && r.amount >= DCA_MIN);
    if (!actionable.length) return null;
    // Pick the one with highest deficit relative to target
    return actionable.sort((a, b) => (b.deficit / b.target) - (a.deficit / a.target))[0];
  })();

  /* ======================================================================== */
  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>

      {/* TOP BAR */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: T.ink, padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="28" height="26" viewBox="0 0 28 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Three horizontal bars */}
              <rect x="0" y="0"  width="28" height="4" fill="#C5973A"/>
              <rect x="0" y="11" width="28" height="4" fill="#C5973A"/>
              <rect x="0" y="22" width="28" height="4" fill="#C5973A"/>
              {/* Ghost verticals — the "disappeared" strokes of the S */}
              <rect x="0"  y="4"  width="4" height="7" fill="#C5973A" fillOpacity="0.3"/>
              <rect x="24" y="15" width="4" height="7" fill="#C5973A" fillOpacity="0.3"/>
            </svg>
            <p style={{ fontFamily: "'Bebas Neue', sans-serif", margin: 0, fontSize: 22, fontWeight: 400, color: T.goldLight, letterSpacing: "0.06em", display: "inline-block", transform: "scaleX(1.4)", transformOrigin: "left center" }}>STOX</p>
          </div>
          <p style={{ ...S.label, margin: "3px 0 0", color: "#555" }}>
            {isDemo ? tx.modeDemo : `${fileName} · ${new Date().toLocaleDateString("es-ES")}`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 5, alignItems: "center", background: "#1a1a1a", borderRadius: 20, padding: "6px 14px", border: "1px solid #333" }}>
            <span style={{ ...S.label, color: "#555", fontSize: 9 }}>Split</span>
            <span style={{ ...S.mono, fontSize: 12, color: T.gold }}>{desiredSplit.Core}/{desiredSplit.Satellite}/{desiredSplit.Wildshots}</span>
            <span style={{ ...S.label, color: "#333", fontSize: 9, margin: "0 2px" }}>·</span>
            <span style={{ ...S.label, color: "#555", fontSize: 9 }}>Obj.</span>
            <span style={{ ...S.mono, fontSize: 12, color: T.goldLight }}>€{fmt(desiredInvestment)}</span>
            <span style={{ ...S.label, color: "#333", fontSize: 9, margin: "0 2px" }}>·</span>
            <span style={{ ...S.label, color: "#555", fontSize: 9 }}>Ret. esp.</span>
            <span style={{ ...S.mono, fontSize: 12, color: potentialReturn !== null ? T.gold : "#444" }}>
              {potentialReturn !== null ? `+${potentialReturn}%` : "—"}
            </span>
          </div>
          <div style={{ textAlign: "center" }}>
            <p style={{ ...S.label, margin: 0, color: "#555" }}>{tx.invested}</p>
            <p style={{ ...S.mono, margin: "2px 0 0", fontSize: 15, fontWeight: 500, color: T.goldLight }}>€{fmt(totalInvertido)}</p>
          </div>

          {/* Language toggle */}
          <button
            onClick={() => setLang(l => l === "es" ? "en" : "es")}
            style={{ ...S.label, fontSize: 10, background: "transparent", color: lang === "en" ? T.gold : "#555", border: `1px solid ${lang === "en" ? T.gold : "#333"}`, borderRadius: 20, padding: "4px 12px", cursor: "pointer", letterSpacing: "0.08em", transition: "all 0.15s" }}
          >{lang === "es" ? "EN" : "ES"}</button>

        </div>
      </div>

      {/* NAV */}
      <div style={{ position: "sticky", top: 62, zIndex: 29, background: T.paper, borderBottom: `1px solid ${T.border}`, display: "flex", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        {[
          { id: "proyecto",     label: tx.tabProyecto },
          { id: "evolucion",    label: tx.tabEvolucion },
          { id: "distribucion", label: tx.tabPortfolio },
          { id: "candidates",   label: "Candidates" },
          { id: "movimientos",  label: "Movimientos" },
          { id: "analisis",     label: tx.tabAnalisis },
          { id: "config",       label: tx.tabConfig },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "14px 8px", background: "transparent", border: "none", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            borderBottom: tab === t.id ? `2px solid ${T.gold}` : "2px solid transparent",
            color: tab === t.id ? T.ink : T.inkMuted,
            fontWeight: tab === t.id ? 600 : 400, fontSize: 12, cursor: "pointer",
          }}>{t.label}</button>
        ))}
      </div>

      {/* DEMO BANNER */}
      {isDemo && (
        <div style={{ background: T.goldLight, borderBottom: `1px solid ${T.goldBorder}`, padding: "10px 28px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.neutral }}>
            {tx.demoBanner} <strong>{tx.demoConfig}</strong> {tx.demoSuffix}
          </span>
          <button onClick={() => setTab("config")} style={{ ...S.label, background: T.gold, color: T.paper, border: "none", padding: "6px 14px", borderRadius: 2, cursor: "pointer" }}>
            SUBIR CSV
          </button>
        </div>
      )}

      <div key={tab} style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 32px", animation: "tabFadeIn 0.45s ease" }}>

        {/* ====== DISTRIBUCION ====== */}
        {tab === "distribucion" && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
              <div data-tut="portfolio-metricas" style={{ display: "flex", gap: 10, flexWrap: "wrap", flex: 1 }}>
              <StatCard label="Total invertido"
                value={positions.length > 0 ? `€${fmt(totalInvertido)}` : "€0"}
                sub={positions.length > 0 ? tx.cardRealCapital : tx.loadCsvConfig}
                border={T.goldBorder} accent={T.gold} />
              {(() => {
                // Portfolio R/R: weighted average of held positions with rango data
                const heldRR = positions.map(p => {
                  const a = analysis[p.Ticker];
                  if (!a?.rango) return null;
                  const up   = a.rango.subida_max ? Math.abs(parseRangePct(a.rango.subida_max)) : null;
                  const down = a.rango.bajada_max ? Math.abs(parseRangePct(a.rango.bajada_max)) : null;
                  if (!up || !down || down === 0) return null;
                  return { rr: up / down, weight: p.Invertido };
                }).filter(Boolean);
                const totalW = heldRR.reduce((s, x) => s + x.weight, 0);
                const avgRR  = totalW > 0 ? heldRR.reduce((s, x) => s + x.rr * x.weight, 0) / totalW : null;
                const rrStr  = avgRR ? avgRR.toFixed(2) + "x" : "—";
                const rrColor = avgRR ? (avgRR >= 2.5 ? T.positive : avgRR >= 1.5 ? "#D97706" : T.red) : T.inkMuted;
                const rrBorder = avgRR ? (avgRR >= 2.5 ? "#86efac" : avgRR >= 1.5 ? "#FDE68A" : "#FECACA") : "#E4E4E0";
                const covered = heldRR.length;
                return (
                  <StatCard
                    label="R/R cartera"
                    value={rrStr}
                    sub={covered > 0 ? `${lang === "es" ? "Media ponderada" : "Weighted avg"} · ${covered}/${positions.length} ${lang === "es" ? "posiciones con datos" : "positions with data"}` : tx.noPotData}
                    border={rrBorder} accent={rrColor} />
                );
              })()}
              <StatCard label="Retorno potencial"
                value={positions.length === 0 ? "—" : potentialReturn ? `+€${fmt(totalPotEuros)}` : "—"}
                sub={positions.length === 0
                  ? "Sin posiciones cargadas"
                  : potentialReturn
                    ? `→ €${fmt(expectedFinal)} · ${potentialReturn}% blend`
                    : Object.keys(analysis).length > 0
                      ? "Sin datos de potencial en posiciones actuales"
                      : tx.loadAnalysisConfig}
                border="#86efac" accent={T.positive} />
              </div>
            </div>
            {positions.length === 0 && (
              <div style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, padding: "32px 24px", textAlign: "center", marginBottom: 16 }}>
                <p style={{ ...S.serif, fontSize: 18, color: T.inkMuted, margin: "0 0 8px" }}>Sin posiciones cargadas</p>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.inkFaint, margin: "0 0 16px" }}>
                  {tx.loadCsvConfig}
                </p>
                <button onClick={() => setTab("config")} style={{ ...S.label, fontSize: 10, background: T.goldLight, color: T.neutral, border: `1px solid ${T.goldBorder}`, borderRadius: 2, padding: "8px 16px", cursor: "pointer" }}>
                  {tx.goToConfig}
                </button>
              </div>
            )}
            {positions.length > 0 && (
            <><div style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, padding: "20px 24px", marginBottom: 16 }}>
              <p style={{ ...S.serif, margin: "0 0 4px", fontSize: 19, fontWeight: 600, color: T.ink }}>Distribución real vs objetivo</p>
              <div style={{ display: "flex", gap: 16, marginBottom: 16, alignItems: "center" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: T.gold }} />
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkMuted }}>{tx.real}</span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ width: 12, height: 12, borderRadius: 2, background: T.borderDark }} />
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkMuted }}>{tx.target} ({desiredSplit.Core}/{desiredSplit.Satellite}/{desiredSplit.Wildshots})</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={distData} barCategoryGap="30%">
                  <CartesianGrid vertical={false} stroke={T.border} />
                  <XAxis dataKey="name" tick={{ fontFamily: "'Inter',sans-serif", fontSize: 12, fill: T.inkMuted }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `${v}%`} tick={{ fontFamily: "'DM Mono',monospace", fontSize: 11, fill: T.inkFaint }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Real"     fill={T.gold}       radius={[2,2,0,0]} name={tx.real} />
                  <Bar dataKey={tx.target} fill={T.borderDark} radius={[2,2,0,0]} name={tx.target} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div data-tut="portfolio-split" style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2 }}>
              <div style={{ padding: "14px 20px", borderBottom: `1px solid ${T.border}` }}>
                <p style={{ ...S.serif, margin: 0, fontSize: 18, fontWeight: 600, color: T.ink }}>Desglose por bucket</p>
              </div>
              {byBucket.map((b, i) => {
                const accent      = BUCKET_COLOR[b.bucket];
                const accentLight = b.bucket === "Core" ? T.goldLight : b.bucket === "Satellite" ? T.tealLight : T.bg;
                const accentBdr   = b.bucket === "Core" ? T.goldBorder : b.bucket === "Satellite" ? T.tealBorder : T.borderDark;
                return (
                <div key={b.bucket} style={{ borderBottom: i < 2 ? `1px solid ${T.border}` : "none" }}>
                  {/* Bucket header */}
                  <div style={{ padding: "16px 20px 12px", background: accentLight, borderBottom: `1px solid ${accentBdr}`, display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 10, height: 10, borderRadius: "50%", background: accent, flexShrink: 0 }} />
                    <span style={{ ...S.serif, fontSize: 18, fontWeight: 600, color: T.ink }}>{b.bucket}</span>
                    {Math.abs(b.diff) > 0.03 ? (
                      <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 500, padding: "2px 9px", borderRadius: 20, background: b.diff > 0 ? T.goldLight : T.redLight, border: `1px solid ${b.diff > 0 ? T.goldBorder : "#fca5a5"}`, color: b.diff > 0 ? T.neutral : T.red }}>
                        {b.diff > 0 ? "▲" : "▼"} {(Math.abs(b.diff) * 100).toFixed(0)} {tx.vsObjective}
                      </span>
                    ) : (
                      <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 500, padding: "2px 9px", borderRadius: 20, background: "#F0FDF4", border: "1px solid #86efac", color: T.positive }}>✓ En objetivo</span>
                    )}
                  </div>

                  {/* Two-panel body */}
                  <div style={{ display: "flex", flexWrap: "wrap", background: i % 2 === 0 ? T.bg : T.paper }}>

                    {/* LEFT — Euros */}
                    <div style={{ padding: "16px 20px 16px", borderRight: `1px solid ${T.border}`, flex: "1 1 220px", minWidth: 0 }}>
                      <p style={{ ...S.label, margin: "0 0 14px", fontSize: 9 }}>Capital (€)</p>
                      <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
                        <div>
                          <p style={{ ...S.label, margin: "0 0 3px", fontSize: 9 }}>{tx.invested}</p>
                          <p style={{ ...S.mono, margin: 0, fontSize: 18, fontWeight: 500, color: T.ink }}>€{fmt(b.inv)}</p>
                        </div>
                        {desiredInvestment > 0 && (
                          <div>
                            <p style={{ ...S.label, margin: "0 0 3px", fontSize: 9 }}>{tx.target}</p>
                            <p style={{ ...S.mono, margin: 0, fontSize: 18, fontWeight: 500, color: T.inkMuted }}>€{fmt(b.targetAmt)}</p>
                          </div>
                        )}
                        <div>
                          <p style={{ ...S.label, margin: "0 0 3px", fontSize: 9 }}>{tx.retPotential}</p>
                          <p style={{ ...S.mono, margin: 0, fontSize: 18, fontWeight: 500, color: b.bucketPotEuros !== null ? T.positive : T.inkFaint }}>
                            {b.bucketPotEuros !== null ? `+€${fmt(b.bucketPotEuros)}` : "—"}
                          </p>
                        </div>
                      </div>
                      {/* Invertido vs Objetivo bar */}
                      {desiredInvestment > 0 && (
                        <div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ ...S.label, fontSize: 9 }}>Progreso</span>
                            <span style={{ ...S.mono, fontSize: 10, color: T.inkFaint }}>{b.targetAmt > 0 ? ((b.inv / b.targetAmt) * 100).toFixed(0) : 0}%</span>
                          </div>
                          <div style={{ height: 6, background: T.border, borderRadius: 3, overflow: "hidden" }}>
                            <div style={{ height: 6, borderRadius: 3, background: b.inv >= b.targetAmt ? T.positive : accent, width: b.targetAmt > 0 ? `${Math.min(100, (b.inv / b.targetAmt) * 100).toFixed(0)}%` : "0%", transition: "width 0.4s" }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* RIGHT — 4 metrics + bars */}
                    <div style={{ padding: "16px 20px 16px", flex: "1 1 260px", minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 8 }}>
                        {/* Left: distribución */}
                        <div style={{ display: "flex", gap: 16 }}>
                          <div>
                            <p style={{ ...S.label, margin: "0 0 3px", fontSize: 9 }}>{tx.real}</p>
                            <p style={{ ...S.mono, margin: 0, fontSize: 18, fontWeight: 500, color: accent }}>{(b.realPct * 100).toFixed(1)}%</p>
                          </div>
                          <div>
                            <p style={{ ...S.label, margin: "0 0 3px", fontSize: 9 }}>{tx.target}</p>
                            <p style={{ ...S.mono, margin: 0, fontSize: 18, fontWeight: 500, color: T.inkMuted }}>{(b.targetPct * 100).toFixed(0)}%</p>
                          </div>
                        </div>
                        {/* Right: retorno y R/R */}
                        <div style={{ display: "flex", gap: 16, textAlign: "right" }}>
                          <div>
                            <p style={{ ...S.label, margin: "0 0 3px", fontSize: 9 }}>{tx.retPotential}</p>
                            <p style={{ ...S.mono, margin: 0, fontSize: 18, fontWeight: 500, color: b.bucketPotReturn !== null ? T.positive : T.inkFaint }}>
                              {b.bucketPotReturn !== null ? `+${b.bucketPotReturn.toFixed(1)}%` : "—"}
                            </p>
                          </div>
                          <div>
                            <p style={{ ...S.label, margin: "0 0 3px", fontSize: 9 }}>{tx.rrWeighted}</p>
                            <p style={{ ...S.mono, margin: 0, fontSize: 18, fontWeight: 500, color:
                              b.bucketWeightedRR === null ? T.inkFaint :
                              b.bucketWeightedRR >= 2.5 ? T.positive :
                              b.bucketWeightedRR >= 1.5 ? T.neutral : T.red
                            }}>
                              {b.bucketWeightedRR !== null ? `${b.bucketWeightedRR.toFixed(1)}x` : "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                      {[
                        { lbl: "Real", w: pctBar(b.realPct),   bg: accent,       h: 7 },
                        { lbl: "Obj.", w: pctBar(b.targetPct), bg: T.borderDark, h: 5 },
                      ].map(bar => (
                        <div key={bar.lbl} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                          <span style={{ ...S.label, width: 28, flexShrink: 0, fontSize: 9 }}>{bar.lbl}</span>
                          <div style={{ flex: 1, height: bar.h, background: T.border, borderRadius: 2 }}>
                            <div style={{ height: bar.h, borderRadius: 2, background: bar.bg, width: bar.w, transition: "width 0.4s" }} />
                          </div>
                          <span style={{ ...S.mono, fontSize: 10, color: T.inkFaint, minWidth: 34, textAlign: "right" }}>
                            {bar.lbl === "Real" ? `${(b.realPct * 100).toFixed(0)}%` : `${(b.targetPct * 100).toFixed(0)}%`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Stock pills */}
                  <div style={{ padding: "10px 20px 14px", background: i % 2 === 0 ? T.bg : T.paper, borderTop: `1px solid ${T.border}`, display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {b.stocks.map(s => {
                      const sAnalysis = analysis[s.Ticker];
                      const sPot = sAnalysis ? parsePotencial(sAnalysis.potencial) : null;
                      return (
                        <div key={s.Ticker} style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, padding: "5px 12px", display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ ...S.mono, fontSize: 12, fontWeight: 500, color: T.ink }}>{s.Ticker}</span>
                          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkMuted }}>€{fmt(s.Invertido)}</span>
                          {sPot !== null && (
                            <span style={{ ...S.label, fontSize: 9, background: "#F0FDF4", color: T.positive, border: "1px solid #86efac", padding: "1px 7px", borderRadius: 20 }}>+{sPot}%</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </div>
            </>
            )}

            {/* ── Industry breakdown pie chart ─────────────────────────── */}
            {positions.length > 0 && (() => {
              // Aggregate invested by industry
              const byIndustry = {};
              positions.forEach(p => {
                const ind = p.Industry || "Otros";
                byIndustry[ind] = (byIndustry[ind] || 0) + p.Invertido;
              });
              const industryData = Object.entries(byIndustry)
                .map(([name, value]) => ({ name, value: +value.toFixed(0) }))
                .sort((a, b) => b.value - a.value);

              // Elegant muted palette — distinct hues, well-separated
              const PALETTE = [
                "#C9A96E", // gold (theme)
                "#7B9E87", // sage green
                "#8B7BA8", // muted violet
                "#B07A6E", // terracotta
                "#5F8FA8", // steel blue
                "#A8956E", // warm bronze
                "#6E8FA8", // slate
                "#A87B8B", // dusty rose
                "#7A9E6E", // olive green
                "#9E7A5F", // sienna
              ];

              const total = industryData.reduce((s, d) => s + d.value, 0);

              const CustomPieTooltip = ({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0];
                return (
                  <div style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, padding: "10px 14px" }}>
                    <p style={{ ...S.label, margin: "0 0 4px" }}>{d.name}</p>
                    <p style={{ ...S.mono, margin: 0, fontSize: 15, color: T.ink }}>€{fmt(d.value)}</p>
                    <p style={{ ...S.label, margin: "3px 0 0", fontSize: 9, color: T.inkFaint }}>{((d.value / total) * 100).toFixed(1)}% del portfolio</p>
                  </div>
                );
              };

              return (
                <div style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, padding: "20px 24px", marginTop: 16 }}>
                  <p style={{ ...S.serif, margin: "0 0 4px", fontSize: 19, fontWeight: 600, color: T.ink }}>Distribución por industria</p>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted, margin: "0 0 20px" }}>Capital invertido por sector</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
                    <ResponsiveContainer width={220} height={220} style={{ flexShrink: 0 }}>
                      <PieChart>
                        <Pie
                          data={industryData}
                          cx="50%" cy="50%"
                          innerRadius={60} outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          stroke="none"
                        >
                          {industryData.map((_, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>

                    {/* Legend — manual, for elegance */}
                    <div style={{ flex: 1, minWidth: 160 }}>
                      {industryData.map((d, i) => (
                        <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <div style={{ width: 10, height: 10, borderRadius: 2, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</span>
                              <span style={{ ...S.mono, fontSize: 11, color: T.inkMuted, flexShrink: 0 }}>€{fmt(d.value)}</span>
                            </div>
                            <div style={{ height: 2, background: T.border, borderRadius: 1, marginTop: 4 }}>
                              <div style={{ height: 2, borderRadius: 1, background: PALETTE[i % PALETTE.length], width: `${((d.value / total) * 100).toFixed(0)}%` }} />
                            </div>
                          </div>
                          <span style={{ ...S.label, fontSize: 9, color: T.inkFaint, flexShrink: 0, minWidth: 34, textAlign: "right" }}>{((d.value / total) * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}



          </div>
        )}

        {/* ====== EVOLUCION ====== */}
        {tab === "evolucion" && (
          <div>
            {/* Comparativa objetivo vs real */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 20 }}>

              {/* Inversión actual */}
              <div data-tut="evo-inversion" style={{ background: T.paper, border: `1px solid ${T.goldBorder}`, borderRadius: 2, padding: "18px 22px", flex: "1 1 240px" }}>
                <p style={{ ...S.label, margin: "0 0 14px", color: T.inkFaint }}>Inversión</p>
                {investmentMode === "puntual" ? (
                  /* Inversión puntual: solo mostrar el importe actual, sin objetivo ni barra */
                  <div>
                    <p style={{ ...S.label, margin: "0 0 4px", fontSize: 9 }}>Inversión actual</p>
                    <p style={{ ...S.mono, margin: 0, fontSize: 26, fontWeight: 500, color: T.ink }}>€{fmt(totalInvertido)}</p>
                  </div>
                ) : (
                  /* Inversión periódica: objetivo vs actual + barra de progreso */
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
                      <div>
                        <p style={{ ...S.label, margin: "0 0 4px", fontSize: 9 }}>{tx.target}</p>
                        <p style={{ ...S.mono, margin: 0, fontSize: 26, fontWeight: 500, color: T.gold }}>€{fmt(annualInvestment || desiredInvestment)}</p>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <p style={{ ...S.label, margin: "0 0 4px", fontSize: 9 }}>Inversión actual</p>
                        <p style={{ ...S.mono, margin: 0, fontSize: 26, fontWeight: 500, color: T.ink }}>€{fmt(totalInvertido)}</p>
                      </div>
                    </div>
                    <div style={{ height: 6, background: T.border, borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: 6, borderRadius: 3, background: totalInvertido >= (annualInvestment || desiredInvestment) ? T.positive : T.gold, width: (annualInvestment || desiredInvestment) > 0 ? `${Math.min(100, (totalInvertido / (annualInvestment || desiredInvestment)) * 100).toFixed(0)}%` : "0%", transition: "width 0.4s" }} />
                    </div>
                    <p style={{ ...S.label, margin: "8px 0 0", fontSize: 9, color: T.inkFaint }}>
                      {(annualInvestment || desiredInvestment) > 0
                        ? totalInvertido >= (annualInvestment || desiredInvestment)
                          ? lang === "es" ? "✓ Objetivo alcanzado" : "✓ Target reached"
                          : `${tx.remaining} €${fmt((annualInvestment || desiredInvestment) - totalInvertido)} · ${((totalInvertido / (annualInvestment || desiredInvestment)) * 100).toFixed(0)}% ${tx.completed}`
                        : "Define tu inversión en Inicio"}
                    </p>
                  </>
                )}
              </div>

              {/* Retorno potencial */}
              <div data-tut="evo-retorno" style={{ background: T.paper, border: `1px solid #86efac`, borderRadius: 2, padding: "18px 22px", flex: "1 1 240px" }}>
                <p style={{ ...S.label, margin: "0 0 14px", color: T.inkFaint }}>Retorno potencial{potentialCoverage < 100 && potentialReturn ? ` · ${potentialCoverage}% cartera cubierta` : ""}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 }}>
                  <div>
                    <p style={{ ...S.label, margin: "0 0 4px", fontSize: 9 }}>Sobre invertido</p>
                    <p style={{ ...S.mono, margin: 0, fontSize: 26, fontWeight: 500, color: potentialReturn ? T.positive : T.inkFaint }}>
                      {potentialReturn ? `+${potentialReturn}%` : "—"}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ ...S.label, margin: "0 0 4px", fontSize: 9 }}>En euros</p>
                    <p style={{ ...S.mono, margin: 0, fontSize: 26, fontWeight: 500, color: potentialReturn ? T.positive : T.inkFaint }}>
                      {potentialReturn ? `+€${fmt(totalPotEuros)}` : "—"}
                    </p>
                  </div>
                </div>
                {potentialReturn && (
                  <>
                    <div style={{ height: 6, background: T.border, borderRadius: 3, overflow: "hidden", marginBottom: 8 }}>
                      <div style={{ height: 6, borderRadius: 3, background: T.positive, width: `${Math.min(100, parseFloat(potentialReturn))}%`, transition: "width 0.4s" }} />
                    </div>
                    <p style={{ ...S.label, margin: 0, fontSize: 9, color: T.inkFaint }}>
                      €{fmt(totalInvertido)} invertido → €{fmt(expectedFinal)} esperado
                    </p>
                  </>
                )}
                {!potentialReturn && (
                  <p style={{ ...S.label, margin: "8px 0 0", fontSize: 9, color: T.inkFaint }}>
                    {Object.keys(analysis).filter(k => !k.startsWith("_")).length === 0
                      ? tx.loadAnalysisConfig
                      : positions.length === 0
                        ? tx.loadCsvConfig
                        : "Añade el campo potencial en el JSON para tus posiciones actuales"}
                  </p>
                )}
              </div>
            </div>

            <div data-tut="evo-grafico" style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, padding: "20px 24px" }}>
              <p style={{ ...S.serif, margin: "0 0 4px", fontSize: 19, fontWeight: 600, color: T.ink }}>{tx.evolucionTitle}</p>
              <div style={{ display: "flex", gap: 20, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ width: 20, height: 2, background: T.gold }} />
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkMuted }}>Capital invertido</span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <div style={{ width: 20, height: 0, borderTop: "2px dashed #60a5fa" }} />
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkMuted }}>Proyección con retorno</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={evoData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <defs>
                    <linearGradient id="gCap" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={T.gold} stopOpacity={0.12} />
                      <stop offset="95%" stopColor={T.gold} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gProj" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#60a5fa" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={T.border} />
                  <XAxis dataKey="Fecha" tick={{ fontFamily: "'Inter',sans-serif", fontSize: 11, fill: T.inkMuted }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => `€${fmt(v)}`} tick={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fill: T.inkFaint }} axisLine={false} tickLine={false} width={74} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="Capital invertido" stroke={T.gold}  strokeWidth={2} fill="url(#gCap)"  name="Capital invertido"     connectNulls dot={{ r: 3, fill: T.gold,   stroke: T.paper, strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="Proyección"        stroke="#60a5fa" strokeWidth={2} fill="url(#gProj)" name="Proyección con retorno" connectNulls strokeDasharray="5 4" dot={{ r: 3, fill: "#60a5fa", stroke: T.paper, strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ====== CANDIDATES ====== */}
        {tab === "candidates" && (
          <div>


            <div data-tut="candidates-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
              <div>
                <p style={{ ...S.serif, margin: "0 0 6px", fontSize: 22, fontWeight: 600, color: T.ink }}>Investment Candidates</p>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.inkMuted, margin: 0, lineHeight: 1.6 }}>
                  {tx.candidatesDesc}
                </p>
              </div>
              {desiredInvestment === 0 && (
                <button
                  onClick={() => setTab("proyecto")}
                  style={{ ...S.label, background: T.goldLight, color: T.neutral, border: `1px solid ${T.goldBorder}`, padding: "8px 14px", borderRadius: 2, cursor: "pointer", whiteSpace: "nowrap" }}
                >
                  ↗ Ajusta inversión obj.
                </button>
              )}
            </div>

            {/* Summary pill */}
            {desiredInvestment > 0 && (
              <div style={{ background: T.goldLight, border: `1px solid ${T.goldBorder}`, borderRadius: 2, padding: "10px 16px", marginBottom: 16, display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                <span style={{ ...S.label, color: T.neutral, fontSize: 9 }}>Inversión deseada</span>
                <span style={{ ...S.mono, fontSize: 14, color: T.gold, fontWeight: 500 }}>€{fmt(desiredInvestment)}</span>
                <span style={{ ...S.label, color: T.neutral, fontSize: 9 }}>Split</span>
                <span style={{ ...S.mono, fontSize: 13, color: T.ink }}>{desiredSplit.Core}/{desiredSplit.Satellite}/{desiredSplit.Wildshots}</span>
                {["Core","Satellite","Wildshots"].map(b => (
                  <div key={b} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: BUCKET_COLOR[b] }} />
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkMuted }}>{b}</span>
                    <span style={{ ...S.mono, fontSize: 11, color: T.ink }}>€{fmt(desiredInvestment * (normalizedSplit[b]||0) / 100)}</span>
                  </div>
                ))}
                <button onClick={() => setTab("proyecto")} style={{ ...S.label, fontSize: 9, background: "transparent", color: T.gold, border: `1px solid ${T.goldBorder}`, padding: "3px 10px", borderRadius: 2, cursor: "pointer", marginLeft: "auto" }}>Editar en Inicio</button>
              </div>
            )}

            {Object.keys(analysis).filter(k => !k.startsWith("_")).length === 0 && (
              <div style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, padding: "32px 24px", textAlign: "center", marginBottom: 16 }}>
                <p style={{ ...S.serif, fontSize: 18, color: T.inkMuted, margin: "0 0 8px" }}>Sin datos de análisis</p>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.inkFaint, margin: "0 0 16px" }}>
                  {tx.noCandidatesDesc}
                </p>
                <button onClick={() => setTab("config")} style={{ ...S.label, fontSize: 10, background: T.goldLight, color: T.neutral, border: `1px solid ${T.goldBorder}`, borderRadius: 2, padding: "8px 16px", cursor: "pointer" }}>
                  {tx.goToConfig}
                </button>
              </div>
            )}

            {/* Core */}
            {candidatesByBucket.Core.length > 0 && (
              <BucketAccordion title="Core" accent={T.gold} accentLight={T.goldLight} accentBorder={T.goldBorder} count={candidatesByBucket.Core.filter(s => getInvested(s.ticker) < getCoreTarget(s)).length}>
                {candidatesByBucket.Core.filter(s => getInvested(s.ticker) < getCoreTarget(s)).map(s => (
                  <CoreCandidateRow key={s.ticker} s={s} invested={getInvested(s.ticker)} target={getCoreTarget(s)} tx={tx} />
                ))}
              </BucketAccordion>
            )}

            {/* Satellite */}
            {candidatesByBucket.Satellite.length > 0 && (
              <BucketAccordion title="Satellite" accent={T.teal} accentLight={T.tealLight} accentBorder={T.tealBorder} count={candidatesByBucket.Satellite.filter(s => getInvested(s.ticker) < getSatTarget()).length}>
                {candidatesByBucket.Satellite.filter(s => getInvested(s.ticker) < getSatTarget()).map(s => (
                  <SatelliteCandidateRow key={s.ticker} s={s} invested={getInvested(s.ticker)} target={getSatTarget()} tx={tx} />
                ))}
              </BucketAccordion>
            )}

            {/* Wildshots */}
            {candidatesByBucket.Wildshots.length > 0 && (
              <BucketAccordion title="Wildshots" accent={T.ink} accentLight={T.bg} accentBorder={T.borderDark} count={candidatesByBucket.Wildshots.filter(s => getInvested(s.ticker) < getWsTarget(s)).length}>
                {candidatesByBucket.Wildshots.filter(s => getInvested(s.ticker) < getWsTarget(s)).map(s => (
                  <WildshotCandidateRow key={s.ticker} s={s} invested={getInvested(s.ticker)} target={getWsTarget(s)} tx={tx} />
                ))}
              </BucketAccordion>
            )}

            {/* Legend */}
            {candidatesByBucket.Wildshots.length > 0 && (
              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginTop: 8, padding: "12px 16px", background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, alignItems: "center" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <ConvictionDots value={5} />
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkMuted }}>Convicción máx.</span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <ConvictionDots value={3} />
                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkMuted }}>Convicción media</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["Very High","High","Medium-High","Medium"].map(r => <span key={r}><RiskBadge risk={r} /></span>)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====== ANÁLISIS ====== */}
        {tab === "analisis" && (() => {
          const heldTickers  = new Set(positions.map(p => p.Ticker));
          const analysisKeys = Object.keys(analysis).filter(k => !k.startsWith("_"));
          const hasAnalysis  = analysisKeys.length > 0;

          // Risk section data
          const heldWithRisk = positions.map(p => {
            const a = analysis[p.Ticker];
            const bajada = a?.rango?.bajada_max ? parseRangePct(a.rango.bajada_max) : null;
            const subida = a?.rango?.subida_max ? parseRangePct(a.rango.subida_max) : null;
            const m3  = a?.estimacion?.m3  ?? null;
            const m6  = a?.estimacion?.m6  ?? null;
            const m12 = a?.estimacion?.m12 ?? null;
            const maxLoss = bajada !== null ? (p.Invertido * bajada / 100) : null;
            return { ...p, a, bajada, subida, m3, m6, m12, maxLoss };
          });
          const allCandidates = [
            ...candidatesByBucket.Core,
            ...candidatesByBucket.Satellite,
            ...candidatesByBucket.Wildshots,
          ].filter(c => c.rango?.bajada_max || c.estimacion || c.bear);
          const totalMaxLoss = heldWithRisk.reduce((s, p) => s + (p.maxLoss || 0), 0);
          const coveredCount = heldWithRisk.filter(p => p.bajada !== null).length;

          // ── Snapshot helper ─────────────────────────────────────────────
          const saveSnapshot = async () => {
            if (!hasAnalysis) return;
            setSnapshotState("saving");
            const today = new Date().toISOString().split("T")[0];
            const rows = analysisKeys.map(ticker => {
              const a    = analysis[ticker];
              const up   = a?.rango?.subida_max ? Math.abs(parseRangePct(a.rango.subida_max)) : null;
              const down = a?.rango?.bajada_max ? Math.abs(parseRangePct(a.rango.bajada_max)) : null;
              const rr   = up && down && down > 0 ? parseFloat((up / down).toFixed(2)) : null;
              const pot  = a?.potencial ? (() => {
                const m = a.potencial.match(/[+](\d+(?:[.,]\d+)?)/);
                return m ? parseFloat(m[1].replace(",", ".")) : null;
              })() : null;
              const bucket = positions.find(p => p.Ticker === ticker)?.Bucket
                          || a?.bucket || "—";
              return {
                fecha_snapshot: today,
                ticker,
                bucket,
                potencial_pct:  pot,
                rr,
                subida_max_pct: up,
                bajada_max_pct: down ? -Math.abs(down) : null,
                precio_ref: null,
              };
            });
            try {
              const res = await fetch("/api/snapshots", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(rows),
              });
              const data = await res.json();
              if (!data.ok) throw new Error(data.error || "Error del servidor");
              setSnapshotState("ok");
              setSnapshotError("");
              setTimeout(() => setSnapshotState("idle"), 3000);
            } catch (err) {
              console.error("[STOX snapshot]", err.message);
              setSnapshotError(err.message);
              setSnapshotState("error");
              setTimeout(() => setSnapshotState("idle"), 5000);
            }
          };

          const snapBtnLabel = snapshotState === "saving" ? "Guardando…"
                             : snapshotState === "ok"     ? `✓ ${analysisKeys.length} tickers guardados`
                             : snapshotState === "error"  ? "✗ Error al guardar"
                             : `Guardar snapshot (${analysisKeys.length})`;
          const snapBtnColor = snapshotState === "ok"    ? T.positive
                             : snapshotState === "error" ? T.red
                             : T.blue;
          const snapBtnBg    = snapshotState === "ok"    ? "#F0FDF4"
                             : snapshotState === "error" ? T.redLight
                             : T.blueLight;
          const snapBtnBdr   = snapshotState === "ok"    ? "#86efac"
                             : snapshotState === "error" ? "#FECACA"
                             : T.blueBorder;

          return (
            <div>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 12, flexWrap: "wrap" }}>
                <div>
                  <p style={{ ...S.serif, margin: "0 0 6px", fontSize: 22, fontWeight: 600, color: T.ink }}>{tx.analysisTitle}</p>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.inkMuted, margin: 0, lineHeight: 1.6 }}>
                    {tx.analysisDesc}
                  </p>
                </div>
                {hasAnalysis && (
                  <button
                    onClick={saveSnapshot}
                    disabled={snapshotState === "saving"}
                    title={snapshotState === "error" && snapshotError ? `Error: ${snapshotError}` : "Guarda las estimaciones actuales del JSON en tracking.xlsx para contrastarlas con la realidad en el futuro"}
                    style={{
                      ...S.label, fontSize: 9, padding: "7px 14px", borderRadius: 2, flexShrink: 0,
                      background: snapBtnBg, border: `1px solid ${snapBtnBdr}`,
                      color: snapBtnColor, cursor: snapshotState === "saving" ? "default" : "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    📸 {snapBtnLabel}
                  </button>
                )}
              </div>

              {hasAnalysis ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", background: "#F0FDF4", border: "1px solid #86efac", borderRadius: 2, marginBottom: 20 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M2 7.5L5.5 11L12 4" stroke={T.positive} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.positive, fontWeight: 500 }}>
                      {analysisKeys.length} empresas analizadas
                    </span>
                    <span style={{ ...S.mono, fontSize: 11, color: T.inkMuted }}>{analysisFile}</span>
                  </div>

                  {/* Analysis cards per bucket — all tickers, held ones get "En cartera" badge */}
                  <div data-tut="analisis-buckets">
                  {["Core","Satellite","Wildshots"].map(b => (
                    candidatesByBucket[b].length > 0 && (
                      <AnalysisBucketSection
                        key={b}
                        bucket={b}
                        tickers={candidatesByBucket[b]}
                        analysis={analysis}
                        tx={tx}
                        heldTickers={heldTickers}
                      />
                    )
                  ))}
                  </div>

                  {/* ── ANÁLISIS DE RIESGO ─────────────────────────────────── */}
                  <div data-tut="analisis-riesgo" style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
                    <p style={{ ...S.serif, margin: "0 0 4px", fontSize: 19, fontWeight: 600, color: T.ink }}>Análisis de riesgo</p>
                    <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.inkMuted, margin: "0 0 16px" }}>
                      Vulnerabilidades del portfolio y estimaciones de bajada por posición.
                    </p>

                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
                      <div style={{ background: T.paper, border: "1px solid #FECACA", borderRadius: 2, padding: "14px 18px", flex: "1 1 160px" }}>
                        <p style={{ ...S.label, margin: "0 0 4px", color: "#DC2626" }}>Pérdida máxima estimada</p>
                        <p style={{ ...S.mono, margin: "0 0 2px", fontSize: 20, fontWeight: 500, color: "#DC2626" }}>
                          {totalMaxLoss < 0 ? `−€${fmt(Math.abs(totalMaxLoss))}` : "—"}
                        </p>
                        <p style={{ ...S.label, margin: 0, fontSize: 9, color: T.inkFaint }}>
                          Escenario adverso · {coveredCount}/{positions.length} posiciones cubiertas
                        </p>
                      </div>
                      <div style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, padding: "14px 18px", flex: "1 1 160px" }}>
                        <p style={{ ...S.label, margin: "0 0 4px" }}>Empresas con datos de riesgo</p>
                        <p style={{ ...S.mono, margin: "0 0 2px", fontSize: 20, fontWeight: 500, color: T.ink }}>{allCandidates.length}</p>
                        <p style={{ ...S.label, margin: 0, fontSize: 9, color: T.inkFaint }}>Del universo de candidatos analizados</p>
                      </div>
                    </div>

                    <RiskAccordion title="Portfolio actual" count={`${positions.length} posiciones`} defaultOpen={true}>
                      {["Core","Satellite","Wildshots"].map(bucket => {
                        const bucketRows = heldWithRisk.filter(p => p.Bucket === bucket);
                        if (!bucketRows.length) return null;
                        const accent       = bucket === "Core" ? T.gold      : bucket === "Satellite" ? T.teal      : T.ink;
                        const accentLight  = bucket === "Core" ? T.goldLight : bucket === "Satellite" ? T.tealLight : T.bg;
                        const accentBorder = bucket === "Core" ? T.goldBorder: bucket === "Satellite" ? T.tealBorder: T.borderDark;
                        return (
                          <BucketRiskAccordion key={bucket} bucket={bucket} count={`${bucketRows.length} posición${bucketRows.length !== 1 ? "es" : ""}`} accent={accent} accentLight={accentLight} accentBorder={accentBorder}>
                            <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 90px 90px 58px 58px 58px", padding: "6px 20px", background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                              {["Ticker","Nombre","Bajada máx.","Subida máx.","3 m","6 m","12 m"].map(h => (
                                <span key={h} style={{ ...S.label, fontSize: 9, color: T.inkFaint }}>{h}</span>
                              ))}
                            </div>
                            {bucketRows.map((p, i) => (
                              <div key={p.Ticker} style={{ display: "grid", gridTemplateColumns: "110px 1fr 90px 90px 58px 58px 58px", padding: "12px 20px", borderBottom: `1px solid ${T.border}`, alignItems: "center", background: i % 2 === 0 ? T.paper : T.bg }}>
                                <span style={{ ...S.mono, fontSize: 13, fontWeight: 500, color: T.ink }}>{p.Ticker}</span>
                                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkMuted, paddingRight: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.a?.name || p.Company}</span>
                                <span style={{ ...S.mono, fontSize: 12, fontWeight: 500, color: p.bajada ? "#DC2626" : T.inkFaint }}>{p.a?.rango?.bajada_max ?? "—"}</span>
                                <span style={{ ...S.mono, fontSize: 12, fontWeight: 500, color: p.subida ? "#15803D" : T.inkFaint }}>{p.a?.rango?.subida_max ?? "—"}</span>
                                <EstCell val={p.m3} />
                                <EstCell val={p.m6} />
                                <EstCell val={p.m12} />
                              </div>
                            ))}
                            {bucketRows.some(p => p.a?.bear) && (
                              <div style={{ borderTop: `1px solid ${T.border}` }}>
                                <p style={{ ...S.label, margin: 0, padding: "8px 20px", background: T.bg, color: T.inkFaint, fontSize: 9, borderBottom: `1px solid ${T.border}` }}>Escenarios bajistas — {bucket}</p>
                                {bucketRows.filter(p => p.a?.bear).map((p, i, arr) => (
                                  <div key={p.Ticker} style={{ padding: "14px 20px", borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : "none", display: "flex", gap: 16, alignItems: "flex-start", background: i % 2 === 0 ? T.paper : T.bg }}>
                                    <div style={{ flexShrink: 0, minWidth: 52 }}>
                                      <span style={{ ...S.mono, fontSize: 14, fontWeight: 500, color: T.ink }}>{p.Ticker}</span>
                                      {p.a?.rango?.bajada_max && <p style={{ ...S.mono, margin: "3px 0 0", fontSize: 11, color: "#DC2626" }}>{p.a.rango.bajada_max}</p>}
                                    </div>
                                    <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderLeft: "3px solid #DC2626", borderRadius: 2, padding: "10px 14px", flex: 1 }}>
                                      <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted, margin: 0, lineHeight: 1.6 }}>{p.a.bear}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </BucketRiskAccordion>
                        );
                      })}
                    </RiskAccordion>

                    {allCandidates.length > 0 && (
                      <RiskAccordion title="Candidates" count={`${allCandidates.length} analizados`} defaultOpen={false}>
                        {["Core","Satellite","Wildshots"].map(bucket => {
                          const bucketCands = allCandidates.filter(c => c.bucket === bucket);
                          if (!bucketCands.length) return null;
                          const accent       = bucket === "Core" ? T.gold      : bucket === "Satellite" ? T.teal      : T.ink;
                          const accentLight  = bucket === "Core" ? T.goldLight : bucket === "Satellite" ? T.tealLight : T.bg;
                          const accentBorder = bucket === "Core" ? T.goldBorder: bucket === "Satellite" ? T.tealBorder: T.borderDark;
                          return (
                            <BucketRiskAccordion key={bucket} bucket={bucket} count={`${bucketCands.length} candidato${bucketCands.length !== 1 ? "s" : ""}`} accent={accent} accentLight={accentLight} accentBorder={accentBorder}>
                              <div style={{ display: "grid", gridTemplateColumns: "110px 1fr 90px 90px 58px 58px 58px", padding: "6px 20px", background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                                {["Ticker","Nombre","Bajada máx.","Subida máx.","3 m","6 m","12 m"].map(h => (
                                  <span key={h} style={{ ...S.label, fontSize: 9, color: T.inkFaint }}>{h}</span>
                                ))}
                              </div>
                              {bucketCands.map((c, i) => {
                                const bajada = c.rango?.bajada_max ? parseRangePct(c.rango.bajada_max) : null;
                                const subida = c.rango?.subida_max ? parseRangePct(c.rango.subida_max) : null;
                                return (
                                  <div key={c.ticker} style={{ display: "grid", gridTemplateColumns: "110px 1fr 90px 90px 58px 58px 58px", padding: "12px 20px", borderBottom: `1px solid ${T.border}`, alignItems: "center", background: i % 2 === 0 ? T.paper : T.bg }}>
                                    <span style={{ ...S.mono, fontSize: 13, fontWeight: 500, color: T.ink }}>{c.ticker}</span>
                                    <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkMuted, paddingRight: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</span>
                                    <span style={{ ...S.mono, fontSize: 12, fontWeight: 500, color: bajada ? "#DC2626" : T.inkFaint }}>{c.rango?.bajada_max ?? "—"}</span>
                                    <span style={{ ...S.mono, fontSize: 12, fontWeight: 500, color: subida ? "#15803D" : T.inkFaint }}>{c.rango?.subida_max ?? "—"}</span>
                                    <EstCell val={c.estimacion?.m3 ?? null} />
                                    <EstCell val={c.estimacion?.m6 ?? null} />
                                    <EstCell val={c.estimacion?.m12 ?? null} />
                                  </div>
                                );
                              })}
                            </BucketRiskAccordion>
                          );
                        })}
                      </RiskAccordion>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, padding: "32px 24px", textAlign: "center" }}>
                  <p style={{ ...S.serif, fontSize: 18, color: T.inkMuted, margin: "0 0 8px" }}>Sin análisis cargado</p>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.inkFaint, margin: "0 0 16px" }}>
                    {tx.noAnalysisSubDesc}
                  </p>
                  <button onClick={() => setTab("config")} style={{ ...S.label, fontSize: 10, background: T.goldLight, color: T.neutral, border: `1px solid ${T.goldBorder}`, borderRadius: 2, padding: "8px 16px", cursor: "pointer" }}>
                    {tx.goToConfig}
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* ====== PROYECTO ====== */}
        {tab === "proyecto" && (() => {
          const off = Object.values(desiredSplit).reduce((s, v) => s + v, 0) !== 100;
          const proyFinal = desiredInvestment * (1 + desiredReturn / 100);
          const gananciaObj = proyFinal - desiredInvestment;

          return (
            <div>
              <div style={{ marginBottom: 24 }}>
                <p style={{ ...S.serif, margin: "0 0 6px", fontSize: 22, fontWeight: 600, color: T.ink }}>Tu proyecto de inversión</p>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.inkMuted, margin: 0, lineHeight: 1.6 }}>
                  Define tu objetivo. Estos parámetros guían todas las comparativas del dashboard.
                </p>
              </div>

              {/* ¿Cómo quieres invertir? */}
              <div style={{ background: T.ink, border: "1px solid #333", borderRadius: 2, padding: "22px 24px", marginBottom: 16 }} data-tut="modo-inversion">
                <p style={{ ...S.label, margin: "0 0 4px", color: "#888", fontSize: 9 }}>Modo de inversión</p>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 600, color: T.goldLight, margin: "0 0 18px" }}>¿Cómo quieres invertir?</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[
                    { id: "puntual",   label: tx.modeOnce,   desc: tx.modeOnceSub },
                    { id: "periodica", label: tx.modePeriodic,  desc: tx.modePeriodicSub },
                  ].map(opt => {
                    const active = investmentMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setInvestmentMode(opt.id)}
                        style={{
                          flex: "1 1 180px", textAlign: "left", padding: "14px 18px",
                          borderRadius: 2, cursor: "pointer", transition: "all 0.15s",
                          background: active ? T.gold : "#1a1a1a",
                          border: `1.5px solid ${active ? T.gold : "#333"}`,
                        }}
                      >
                        <p style={{ fontFamily: "'Inter',sans-serif", margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: active ? T.ink : T.goldLight }}>{opt.label}</p>
                        <p style={{ fontFamily: "'Inter',sans-serif", margin: 0, fontSize: 11, color: active ? "#4a3800" : "#666" }}>{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Periodicidad — solo si periódica */}
                {investmentMode === "periodica" && (
                  <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid #222" }}>
                    <p style={{ ...S.label, margin: "0 0 10px", color: "#888", fontSize: 9 }}>Periodicidad</p>
                    <div style={{ display: "flex", gap: 8 }}>
                      {[
                        { id: "mensual",     label: tx.monthly },
                        { id: "trimestral",  label: tx.quarterly },
                      ].map(opt => {
                        const active = periodicity === opt.id;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => setPeriodicity(opt.id)}
                            style={{
                              padding: "8px 20px", borderRadius: 2, cursor: "pointer",
                              fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600,
                              background: active ? T.goldLight : "transparent",
                              border: `1.5px solid ${active ? T.goldBorder : "#444"}`,
                              color: active ? T.ink : "#888",
                              transition: "all 0.15s",
                            }}
                          >{opt.label}</button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Importe de inversión */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                <div data-tut="importe" style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, padding: "22px 24px", flex: "1 1 260px" }}>
                  <p style={{ ...S.label, margin: "0 0 8px" }}>
                    {investmentMode === "puntual" ? tx.targetAmount : periodicity === "mensual" ? tx.monthlyAmount : tx.quarterlyAmount}
                  </p>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted, margin: "0 0 14px", lineHeight: 1.5 }}>
                    {investmentMode === "puntual"
                      ? "Capital total que destinas a esta inversión."
                      : periodicity === "mensual"
                        ? "Capital que destinas cada mes a inversión."
                        : "Capital que destinas cada trimestre a inversión."}
                  </p>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span style={{ ...S.mono, position: "absolute", left: 12, fontSize: 16, color: T.gold, fontWeight: 500 }}>€</span>
                    <input
                      type="number" min={0} step={50}
                      value={investmentMode === "puntual"
                        ? (desiredInvestment === 0 ? "" : desiredInvestment)
                        : (periodicAmount === 0 ? "" : periodicAmount)}
                      placeholder={investmentMode === "puntual" ? "5000" : periodicity === "mensual" ? "417" : "1250"}
                      onChange={e => {
                        const v = parseFloat(e.target.value);
                        if (investmentMode === "puntual") {
                          setDesiredInvestment(isNaN(v) ? 0 : v);
                        } else {
                          const amount = isNaN(v) ? 0 : v;
                          setPeriodicAmount(amount);
                          setDesiredInvestment(periodicity === "mensual" ? amount * 12 : amount * 4);
                        }
                      }}
                      style={{ width: "100%", padding: "12px 12px 12px 30px", border: `1.5px solid ${T.goldBorder}`, borderRadius: 2, fontFamily: "'DM Mono',monospace", fontSize: 20, fontWeight: 500, color: T.ink, background: T.goldLight, outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  {((investmentMode === "puntual" && desiredInvestment > 0) || (investmentMode === "periodica" && periodicAmount > 0)) && (
                    <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 4 }}>
                      {["Core","Satellite","Wildshots"].map(b => (
                        <div key={b} style={{ display: "flex", justifyContent: "space-between", padding: "5px 10px", background: T.bg, borderRadius: 2 }}>
                          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted }}>{b}</span>
                          <span style={{ ...S.mono, fontSize: 13, color: T.ink }}>€{fmt(
                            investmentMode === "puntual"
                              ? desiredInvestment * desiredSplit[b] / 100
                              : (periodicity === "mensual" ? periodicAmount : periodicAmount) * desiredSplit[b] / 100
                          )}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Inversión anual derivada — solo para periódica */}
              {investmentMode === "periodica" && periodicAmount > 0 && (
                <div style={{ background: T.ink, border: `1px solid #333`, borderRadius: 2, padding: "18px 24px", marginTop: 16, marginBottom: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ ...S.label, color: "#FFFFFF", fontSize: 10 }}>Inversión anual planeada</span>
                        <span style={{ ...S.serif, fontSize: 11, color: "#666", fontStyle: "italic" }}>
                          {periodicity === "mensual" ? "aportación mensual × 12" : "aportación trimestral × 4"}
                        </span>
                      </div>
                      <div>
                        <span style={{ ...S.mono, fontSize: 28, fontWeight: 500, color: T.gold }}>€{fmt(annualInvestment)}</span>
                        <span style={{ ...S.label, marginLeft: 8, fontSize: 9, color: "#555" }}>/ año</span>
                      </div>
                    </div>
                    <button onClick={() => setTab("candidates")} style={{ ...S.label, fontSize: 9, background: "transparent", color: T.gold, border: `1px solid ${T.gold}`, borderRadius: 2, padding: "6px 14px", cursor: "pointer", flexShrink: 0 }}>
                      Ver dónde invertir →
                    </button>
                  </div>
                </div>
              )}

          {/* === CLAUDE ANALYSIS LAUNCHER === */}
          {(() => {
            const portfolioStr = positions.length > 0
              ? positions.map(p => `${p.Ticker} (${p.Bucket}, €${Math.round(p.Invertido)})`).join(", ")
              : "Sin posiciones cargadas";

            const CLAUDE_BASE = `Eres analista de inversiones senior especializado en impacto geopolítico. Genera un informe completo en español. Fecha: [FECHA_HOY]. Evento: [EVENTO].

FUENTES (prioridad descendente): (1) SEC filings, earnings calls, IR pages — (2) Fed, FMI, EIA, NATO — (3) Goldman/JPMorgan/MS research, Bloomberg, FT, WSJ, StockAnalysis, MarketBeat, Morningstar — (4) Reuters/BBC solo contexto narrativo. Prohibido para datos numéricos: blogs sin autor, Reddit, StockTwits. Siempre citar fuente + fecha. Si no hay datos de las últimas 2 semanas para un activo, indícalo antes de usar datos más antiguos.

BÚSQUEDAS OBLIGATORIAS antes de escribir:
- "[EVENTO] markets impact [FECHA_HOY]" + "[EVENTO] oil gold S&P analyst forecast 2026"
- Brent, WTI, oro, S&P500, Nasdaq, VIX, bono 10Y, DXY, tipo Fed con fecha exacta
- Por cada ticker del portfolio: "[TICKER] earnings 2025 2026" + "[TICKER] stock price [FECHA_HOY]"
- Por cada candidato nuevo: "[TICKER] price target analyst 2026" + "[TICKER] [EVENTO] impact"

PARTE 1 — CONTEXTO Y PRECEDENTES
1.1 Cronología últimos 14 días, actores, estado actual, variables de incertidumbre, probabilidad por escenario (optimista/base/pesimista %)
1.2 3-4 precedentes históricos comparables: impacto en crudo/S&P/Nasdaq (% y días recuperación)/oro/bonos, sectores ganadores y perdedores, lección aplicable
1.3 Máx. 5 patrones accionables extraídos de los precedentes
1.4 Snapshot macro completo con fecha exacta: Brent, WTI, oro, S&P500, Nasdaq, VIX, bono 10Y, DXY, tipo Fed

PARTE 2 — PORTFOLIO ACTUAL
Portfolio: [PORTFOLIO]
Por cada activo (buscar earnings reciente + noticias últimas 2 semanas): precio con fecha, riesgo (Alto/Medio-Alto/Medio/Medio-Bajo/Bajo), dirección esperada (↑/↓/→), exposición al conflicto, catalizadores y riesgos específicos, recomendación AUMENTAR/MANTENER/REDUCIR/VENDER con justificación, estimación 3m/6m/12m/24m en %. Cierra con tabla resumen.

PARTE 3 — NUEVAS OPORTUNIDADES
Sectores: [SECTORES_NUEVOS]. Mínimo 15 candidatos nuevos — al menos 5 por bucket (Core, Satellite, Wildshots) — que NO estén en el portfolio. Filtro obligatorio: R/R = subida_max / |bajada_max| ≥ 1.5; excluir si R/R < 1.0 o si precio actual ya supera el consenso de analistas.
Por cada candidato: ticker, tesis específica al conflicto con fuente+fecha, precio actual, precio objetivo consenso (fuente Nivel 3), upside%, rango bajista/alcista, estimación 3m/6m/12m/24m, convicción 1-5, bucket sugerido, ≥2 factores de riesgo. Cierra con tabla ranking por convicción.

PARTE 4 — PLAN DE ACCIÓN
4.1 Acciones urgentes sobre el portfolio esta semana (orden de prioridad)
4.2 Despliegue de capital: Tier 1 inmediato / Tier 2 (1-2 sem, esperar confirmación) / Tier 3 oportunista
4.3 Por escenario (opt/base/pes): probabilidad %, impacto portfolio, activos más beneficiados, señales de alerta
4.4 5-7 indicadores clave a monitorizar con fechas si aplica

FORMATO: párrafo ejecutivo al inicio (3-4 líneas). Tablas para resúmenes, listas para acciones. Tono analítico y directo. Extensión completa, sin resumir. Al citar analistas: indicar si es consenso, mínimo, máximo o bull/bear case.

Cuando el informe esté listo, avísame para convertirlo al JSON de mi portfolio.`;

            const claudeUrl = eventoInput.trim() ? (() => {
              const today = new Date().toLocaleDateString("es-ES");
              const prompt = CLAUDE_BASE
                .replace(/\[EVENTO\]/g, eventoInput)
                .replace(/\[FECHA_HOY\]/g, today)
                .replace(/\[PORTFOLIO\]/g, portfolioStr)
                .replace(/\[SECTORES_NUEVOS\]/g, sectoresInput || "Déjalo en tu criterio");
              return `https://claude.ai/new?q=${encodeURIComponent(prompt)}`;
            })() : null;

            return (
              <div data-tut="claude-analysis" style={{ marginTop: 24, background: T.ink, border: "1px solid #333", borderRadius: 2, padding: "22px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <p style={{ ...S.serif, margin: 0, fontSize: 18, fontWeight: 600, color: T.goldLight }}>{tx.claudeAnalysisTitle}</p>
                  <span style={{ ...S.label, background: "#1a1a1a", color: T.gold, border: "1px solid #333", padding: "2px 10px", borderRadius: 20, fontSize: 9 }}>PROMPT</span>
                </div>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#666", margin: "0 0 20px", lineHeight: 1.6 }}>
                  {tx.claudeAnalysisDesc}
                </p>

                <div style={{ marginBottom: 14 }}>
                  <p style={{ ...S.label, margin: "0 0 6px", color: "#888", fontSize: 9 }}>Evento geopolítico a analizar <span style={{ color: T.gold }}>*</span></p>
                  <input
                    value={eventoInput}
                    onChange={e => setEventoInput(e.target.value)}
                    placeholder='Ej: "Aranceles de Trump a la UE", "Crisis en Taiwán"'
                    style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.goldLight, background: "#0d0d0d", border: `1px solid ${eventoInput ? T.gold : "#333"}`, borderRadius: 2, outline: "none" }}
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <p style={{ ...S.label, margin: "0 0 6px", color: "#888", fontSize: 9 }}>Sectores nuevos a explorar</p>
                  <input
                    value={sectoresInput}
                    onChange={e => setSectoresInput(e.target.value)}
                    placeholder='Ej: "Defensa, Energía" o "Déjalo en tu criterio"'
                    style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px", fontFamily: "'Inter',sans-serif", fontSize: 13, color: "#999", background: "#0d0d0d", border: "1px solid #333", borderRadius: 2, outline: "none" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
                  <div style={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: 2, padding: "8px 14px", flex: "1 1 180px" }}>
                    <p style={{ ...S.label, margin: "0 0 3px", fontSize: 9, color: "#555" }}>Fecha (auto)</p>
                    <p style={{ ...S.mono, margin: 0, fontSize: 12, color: "#666" }}>{new Date().toLocaleDateString("es-ES")}</p>
                  </div>
                  <div style={{ background: "#0d0d0d", border: "1px solid #222", borderRadius: 2, padding: "8px 14px", flex: "1 1 180px", minWidth: 0 }}>
                    <p style={{ ...S.label, margin: "0 0 3px", fontSize: 9, color: "#555" }}>{tx.portfolioAuto} · {positions.length} {tx.positions_label})</p>
                    <p style={{ ...S.mono, margin: 0, fontSize: 11, color: "#666", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{portfolioStr}</p>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <a
                    href={claudeUrl || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => { if (!claudeUrl) e.preventDefault(); }}
                    style={{ display: "block", textAlign: "center", textDecoration: "none", flex: 1, padding: "13px 16px", background: claudeUrl ? T.gold : "#1a1a1a", color: claudeUrl ? T.neutral : "#444", border: `1px solid ${claudeUrl ? T.gold : "#333"}`, borderRadius: 2, fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, cursor: claudeUrl ? "pointer" : "not-allowed", letterSpacing: "0.04em", transition: "all 0.15s", boxSizing: "border-box" }}
                  >
                    🌐 Navegador
                  </a>
                  <button
                    disabled={!claudeUrl}
                    onClick={() => {
                      if (!claudeUrl) return;
                      const today = new Date().toLocaleDateString("es-ES");
                      const prompt = CLAUDE_BASE
                        .replace(/\[EVENTO\]/g, eventoInput)
                        .replace(/\[FECHA_HOY\]/g, today)
                        .replace(/\[PORTFOLIO\]/g, portfolioStr)
                        .replace(/\[SECTORES_NUEVOS\]/g, sectoresInput || "Déjalo en tu criterio");
                      navigator.clipboard.writeText(prompt).then(() => {
                        window.location.href = "claude://";
                      });
                    }}
                    style={{ flex: 1, padding: "13px 16px", background: claudeUrl ? "#1a1a1a" : "#111", color: claudeUrl ? T.goldLight : "#444", border: `1px solid ${claudeUrl ? T.gold : "#333"}`, borderRadius: 2, fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600, cursor: claudeUrl ? "pointer" : "not-allowed", letterSpacing: "0.04em", transition: "all 0.15s" }}
                  >
                    💻 App
                  </button>
                </div>
                <p style={{ ...S.label, margin: "8px 0 0", fontSize: 9, color: "#444", textAlign: "center" }}>
                  {tx.deepResearchNote}
                </p>
              </div>
            );
          })()}

              <div data-tut="split" style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, padding: "22px 24px", marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <p style={{ ...S.label, margin: 0 }}>Split deseado</p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ ...S.mono, fontSize: 12, color: off ? T.red : T.positive, background: off ? T.redLight : "#F0FDF4", padding: "2px 10px", borderRadius: 20 }}>
                      {Object.values(desiredSplit).reduce((s, v) => s + v, 0)}%
                    </span>
                  </div>
                </div>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted, margin: "0 0 14px", lineHeight: 1.5 }}>
                  Al mover un slider, los otros dos se ajustan para mantener el 100%. Define cuánto riesgo quieres por bucket.
                </p>

                {/* Presets rápidos */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
                  {[
                    { label: `${tx.conservative} · 70/20/10`, core: 70, sat: 20, ws: 10 },
                    { label: `${tx.balanced} · 50/25/25`,  core: 50, sat: 25, ws: 25 },
                    { label: `${tx.aggressive} · 40/30/30`,     core: 40, sat: 30, ws: 30 },
                  ].map(p => {
                    const active = desiredSplit.Core === p.core && desiredSplit.Satellite === p.sat && desiredSplit.Wildshots === p.ws;
                    return (
                      <button key={p.label} onClick={() => handleSplitChange("__preset__", { Core: p.core, Satellite: p.sat, Wildshots: p.ws })}
                        style={{ ...S.label, fontSize: 9, padding: "5px 12px", borderRadius: 2, cursor: "pointer", background: active ? T.ink : T.bg, color: active ? T.goldLight : T.inkMuted, border: `1px solid ${active ? T.ink : T.border}` }}>
                        {p.label}
                      </button>
                    );
                  })}
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
                  {[
                    {
                      bucket: "Core", color: T.gold, light: T.goldLight, border: T.goldBorder,
                      riesgo: "Bajo", volatilidad: "Baja", riskDots: 1,
                      desc: "La base de la cartera. Empresas y fondos consolidados con décadas de historia, que crecen de forma constante y generan rentas regulares. El objetivo es preservar capital y crecer de forma sostenida sin grandes sustos.",
                      ejemplos: "S&P 500, Microsoft, JPMorgan"
                    },
                    {
                      bucket: "Satellite", color: T.teal, light: T.tealLight, border: T.tealBorder,
                      riesgo: "Medio", volatilidad: "Media-Alta", riskDots: 2,
                      desc: "Empresas con alto potencial de crecimiento y una ventaja competitiva clara, pero más sensibles a los ciclos del mercado. Pueden subir mucho más que el mercado general, aunque también bajar más en momentos adversos.",
                      ejemplos: "NVIDIA, Amazon, ASML"
                    },
                    {
                      bucket: "Wildshots", color: T.ink, light: T.bg, border: T.borderDark,
                      riesgo: "Alto", volatilidad: "Alta", riskDots: 3,
                      desc: "Apuestas puntuales con un catalizador concreto: un lanzamiento de producto, un contrato clave o un cambio de tendencia. Son las posiciones con más potencial de revalorización y también las de mayor riesgo. Siempre una parte pequeña de la cartera.",
                      ejemplos: "Take-Two, Palantir, CEG"
                    },
                  ].map(({ bucket, color, light, border: bdr, riesgo, volatilidad, riskDots, desc, ejemplos }) => (
                    <div key={bucket} style={{ background: light, border: `1px solid ${bdr}`, borderRadius: 2, padding: "18px 16px", flex: "1 1 200px", display: "flex", flexDirection: "column", gap: 0 }}>
                      {/* Header: name + % */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 700, color: T.ink }}>{bucket}</span>
                        </div>
                        <span style={{ ...S.mono, fontSize: 24, fontWeight: 500, color: color, lineHeight: 1 }}>{desiredSplit[bucket]}%</span>
                      </div>

                      {/* Risk / volatility badges */}
                      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: riskDots === 1 ? "#F0FDF4" : riskDots === 2 ? "#FFFBEB" : T.redLight, color: riskDots === 1 ? T.positive : riskDots === 2 ? "#92400E" : T.red, border: `1px solid ${riskDots === 1 ? "#86efac" : riskDots === 2 ? "#FDE68A" : "#FECACA"}` }}>
                          Riesgo {riesgo}
                        </span>
                        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 500, padding: "2px 8px", borderRadius: 20, background: T.bg, color: T.inkMuted, border: `1px solid ${T.border}` }}>
                          Volatilidad {volatilidad}
                        </span>
                      </div>

                      {/* Description */}
                      <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkMuted, margin: "0 0 8px", lineHeight: 1.65 }}>{desc}</p>

                      {/* Examples */}
                      <p style={{ ...S.label, fontSize: 9, color: T.inkFaint, margin: "0 0 12px" }}>Ej. {ejemplos}</p>

                      {/* Slider */}
                      <input
                        type="range" min={0} max={100} step={5}
                        value={desiredSplit[bucket]}
                        onChange={e => handleSplitChange(bucket, parseInt(e.target.value))}
                        style={{ width: "100%", accentColor: color, cursor: "pointer" }}
                      />
                      {desiredInvestment > 0 && (
                        <p style={{ ...S.mono, fontSize: 12, color: T.inkMuted, margin: "6px 0 0", textAlign: "right" }}>
                          €{fmt(desiredInvestment * desiredSplit[bucket] / 100)}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {off && (
                  <div style={{ padding: "8px 14px", background: T.redLight, border: "1px solid #FECACA", borderRadius: 2, marginBottom: 12 }}>
                    <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.red, margin: 0 }}>
                      El split suma {Object.values(desiredSplit).reduce((s, v) => s + v, 0)}%. Ajusta los sliders para llegar al 100%.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* ====== MOVIMIENTOS RECOMENDADOS ====== */}
        {tab === "movimientos" && (() => {
          const analysisKeys = Object.keys(analysis).filter(k => !k.startsWith("_"));
          const noAnalysis   = analysisKeys.length === 0;
          const heldTickers  = new Set(positions.map(p => p.Ticker));

          // ── Ventas recomendadas: posiciones con R/R < 1 o rotate===true ────
          const ventas = positions.map(p => {
            const a    = analysis[p.Ticker];
            const up   = a?.rango?.subida_max ? Math.abs(parseRangePct(a.rango.subida_max)) : null;
            const down = a?.rango?.bajada_max ? Math.abs(parseRangePct(a.rango.bajada_max)) : null;
            const rr   = up && down && down > 0 ? up / down : null;
            const rotate = a?.rotate === true;
            const weak   = rr !== null && rr < 1;
            if (!rotate && !weak) return null;
            return { ...p, a, up, down, rr, rotate, weak };
          }).filter(Boolean).sort((a, b) => {
            // rotate primero, luego por R/R ascendente (peores primero)
            if (a.rotate && !b.rotate) return -1;
            if (!a.rotate && b.rotate) return 1;
            return (a.rr ?? 999) - (b.rr ?? 999);
          });

          // ── Compras recomendadas: candidatos del análisis no en portfolio ──
          const compras = analysisKeys
            .filter(tk => !heldTickers.has(tk))
            .map(tk => {
              const a    = analysis[tk];
              const up   = a?.rango?.subida_max ? Math.abs(parseRangePct(a.rango.subida_max)) : null;
              const down = a?.rango?.bajada_max ? Math.abs(parseRangePct(a.rango.bajada_max)) : null;
              const rr   = up && down && down > 0 ? up / down : null;
              return { ticker: tk, a, up, down, rr };
            })
            .filter(c => c.rr !== null)
            .sort((a, b) => (b.rr ?? 0) - (a.rr ?? 0));

          // ── R/R badge helper ────────────────────────────────────────────────
          const rrBadge = (rr) => {
            if (rr === null) return null;
            const val = parseFloat(rr);
            const color  = val >= 2   ? T.positive : val >= 1 ? T.neutral : T.red;
            const bg     = val >= 2   ? "#F0FDF4"  : val >= 1 ? "#FFFBEB" : T.redLight;
            const border = val >= 2   ? "#86efac"  : val >= 1 ? "#FDE68A" : "#FECACA";
            return (
              <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", background: bg, border: `1px solid ${border}`, borderRadius: 4, padding: "4px 10px", minWidth: 52, flexShrink: 0 }}>
                <span style={{ ...S.label, fontSize: 8, color, marginBottom: 1 }}>R/R</span>
                <span style={{ ...S.mono, fontSize: 16, fontWeight: 600, color, lineHeight: 1 }}>{val.toFixed(1)}x</span>
              </div>
            );
          };

          return (
            <div>
              {/* ── NEXT MOVE widget ───────────────────────────────────── */}
              <div data-tut="next-move" style={{ marginBottom: 28 }}>
                <div style={{ background: T.ink, border: `1px solid #333`, borderRadius: planOpen ? "2px 2px 0 0" : 2, padding: "16px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flexShrink: 0 }}>
                    <span style={{ ...S.label, color: "#FFFFFF", fontSize: 10 }}>Next Move</span>
                    <span style={{ ...S.serif, fontSize: 11, color: "#666", fontStyle: "italic" }}>
                      {investmentMode === "puntual"
                        ? tx.nextMoveSub_once
                        : periodicity === "trimestral"
                          ? `Q${Math.floor(new Date().getMonth()/3)+1} · €${Math.round(investedThisQuarter)} invertidos de €${periodicAmount}`
                          : tx.nextMoveSub_monthly}
                    </span>
                  </div>

                  {nextMove && desiredInvestment > 0 && Object.keys(analysis).filter(k => !k.startsWith("_")).length > 0 ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                            <span style={{ ...S.mono, fontSize: 22, fontWeight: 500, color: T.goldLight }}>{nextMove.ticker}</span>
                            <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: nextMove.bucket === "Core" ? T.goldLight : nextMove.bucket === "Satellite" ? T.tealLight : "#1a1a1a", color: nextMove.bucket === "Core" ? T.neutral : nextMove.bucket === "Satellite" ? T.teal : T.goldLight, border: `1px solid ${nextMove.bucket === "Core" ? T.goldBorder : nextMove.bucket === "Satellite" ? T.tealBorder : "#444"}` }}>
                              {nextMove.bucket}
                            </span>
                          </div>
                          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: "#666" }}>{nextMove.name || nextMove.ticker}{nextMove.sector ? ` · ${nextMove.sector}` : ""}</span>
                        </div>

                        {/* R/R ratio */}
                        {(() => {
                          const a = analysis[nextMove.ticker];
                          const up   = a?.rango?.subida_max ? Math.abs(parseRangePct(a.rango.subida_max)) : null;
                          const down = a?.rango?.bajada_max ? Math.abs(parseRangePct(a.rango.bajada_max)) : null;
                          if (!up || !down || down === 0) return null;
                          const rr = (up / down).toFixed(1);
                          const color = rr >= 2.5 ? "#15803D" : rr >= 1.5 ? "#D97706" : "#DC2626";
                          return (
                            <div style={{ borderLeft: "1px solid #333", paddingLeft: 12, flexShrink: 0 }}>
                              <p style={{ ...S.label, margin: "0 0 2px", color: "#555", fontSize: 9 }}>R/R ratio</p>
                              <p style={{ ...S.mono, margin: 0, fontSize: 16, fontWeight: 500, color }}>{rr}x</p>
                              <p style={{ ...S.label, margin: "1px 0 0", fontSize: 8, color: "#444" }}>+{up}% / -{down}%</p>
                            </div>
                          );
                        })()}
                      </div>

                      <div style={{ flexShrink: 0, textAlign: "right" }}>
                        <p style={{ ...S.label, margin: "0 0 2px", color: "#555", fontSize: 9 }}>
                          {investmentMode === "puntual" ? tx.buyNow : periodicity === "trimestral" ? tx.buyThisQuarter : tx.buyThisMonth}
                        </p>
                        <p style={{ ...S.mono, margin: 0, fontSize: 28, fontWeight: 500, color: T.gold }}>€{fmt(nextMove.amount)}</p>
                        <button
                          onClick={() => setPlanOpen(o => !o)}
                          style={{ ...S.label, marginTop: 5, fontSize: 9, background: "transparent", color: planOpen ? T.gold : "#FFFFFF", border: `1px solid ${planOpen ? T.gold : "#FFFFFF"}`, borderRadius: 2, padding: "3px 10px", cursor: "pointer", transition: "all 0.15s" }}
                        >
                          {planOpen ? tx.closePlan : investmentMode === "puntual" ? tx.openPlanOnce : tx.openPlan}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ flex: 1 }}>
                      <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#555" }}>
                        {Object.keys(analysis).filter(k => !k.startsWith("_")).length === 0
                          ? "Sin datos de análisis. Carga un JSON en la carpeta Analysis/ para activar sugerencias."
                          : desiredInvestment === 0 && investmentMode === "puntual"
                            ? "Define el importe a invertir en Inicio para activar sugerencias."
                            : periodicAmount === 0 && investmentMode === "periodica"
                              ? "Define el importe periódico en Inicio para activar sugerencias."
                              : investmentMode === "periodica" && periodicity === "trimestral" && dcaBudget === 0
                                ? `Presupuesto trimestral agotado — €${fmt(investedThisQuarter)} invertidos de €${periodicAmount} en Q${Math.floor(new Date().getMonth()/3)+1}.`
                                : dcaBudget < DCA_MIN
                                  ? `Presupuesto (€${fmt(dcaBudget)}) inferior al mínimo por operación (€${DCA_MIN}). Aumenta el importe en Inicio.`
                                  : (() => {
                                      const allOver = ["Core","Satellite","Wildshots"].every(b => {
                                        const real = (byBucket.find(x => x.bucket === b)?.realPct || 0) * 100;
                                        const target = normalizedSplit[b] || 0;
                                        return totalInvertido > 0 && real > target + 2;
                                      });
                                      if (allOver) return "Todos los buckets están sobre su peso objetivo. Revisa el split en Inicio o espera a que nuevas aportaciones reequilibren la cartera.";
                                      const someCandidates = Object.values(candidatesByBucket).some(arr => arr.length > 0);
                                      if (!someCandidates) return "No hay candidatos en el JSON de análisis. Genera un nuevo análisis con candidatos por bucket.";
                                      return "Todos los candidatos tienen el objetivo cubierto o están en buckets sobre-representados.";
                                    })()}
                      </span>
                      <button onClick={() => setTab("proyecto")} style={{ ...S.label, marginLeft: 12, fontSize: 9, background: "transparent", color: T.gold, border: `1px solid ${T.gold}`, borderRadius: 2, padding: "3px 10px", cursor: "pointer" }}>
                        Ajustar en Inicio →
                      </button>
                    </div>
                  )}
                </div>

                {/* Expandable monthly plan */}
                {planOpen && nextMove && (
                  <div style={{ background: "#0d0d0d", border: "1px solid #333", borderTop: "1px solid #222", borderRadius: "0 0 2px 2px", padding: "16px 22px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                      <p style={{ ...S.label, margin: 0, color: "#888", fontSize: 9 }}>
                        {investmentMode === "puntual"
                          ? tx.planTotal
                          : periodicity === "trimestral"
                            ? tx.planQuarterly
                            : tx.planMonthly}
                        {dcaBudget > 0 ? ` · €${fmt(dcaBudget)} disponibles` : tx.budgetExhausted}
                      </p>
                      <p style={{ ...S.mono, margin: 0, fontSize: 11, color: "#555" }}>
                        €{fmt(dcaPlan.totalDeployed)} {tx.deployed}
                        {dcaPlan.surplus > 0 && <span style={{ color: "#444" }}> · €{fmt(dcaPlan.surplus)} {tx.surplus}</span>}
                      </p>
                    </div>

                    {/* ── Bucket status grid ─────────────────────────────── */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
                      {[
                        { bucket: "Core",      targetEur: coreTargetTotal, accent: T.gold,    accentBorder: T.goldBorder },
                        { bucket: "Satellite", targetEur: satTargetTotal,  accent: T.teal,    accentBorder: T.tealBorder },
                        { bucket: "Wildshots", targetEur: wsTargetTotal,   accent: "#aaaaaa", accentBorder: "#444" },
                      ].map(({ bucket, targetEur, accent, accentBorder }) => {
                        const currentEur  = byBucket.find(b => b.bucket === bucket)?.inv || 0;
                        const gap         = targetEur - currentEur;
                        const isOver      = gap < -5;
                        const isComplete  = Math.abs(gap) <= 5;
                        const allocated   = dcaPlan.bucketAlloc[bucket] || 0;
                        const fillPct     = targetEur > 0 ? Math.min(100, currentEur / targetEur * 100) : 0;
                        const statusLabel = isOver ? "Exceso" : isComplete ? "Completo" : `−€${fmt(Math.abs(gap))}`;
                        const statusColor = isOver ? "#DC2626" : isComplete ? "#15803D" : "#D97706";
                        const statusBg    = isOver ? "#3a1010" : isComplete ? "#0f2a1a" : "#2a1f00";
                        const statusBd    = isOver ? "#7f1d1d" : isComplete ? "#166534" : "#92400E";
                        return (
                          <div key={bucket} style={{ background: "#111", border: `1px solid ${isOver ? "#3a1010" : "#222"}`, borderRadius: 2, padding: "12px 14px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, fontWeight: 600, color: accent }}>{bucket}</span>
                              <span style={{ ...S.label, fontSize: 8, color: statusColor, background: statusBg, border: `1px solid ${statusBd}`, padding: "1px 7px", borderRadius: 20 }}>
                                {statusLabel}
                              </span>
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                              <span style={{ ...S.mono, fontSize: 13, color: "#ccc" }}>€{fmt(currentEur)}</span>
                              <span style={{ ...S.label, fontSize: 8, color: "#444" }}>obj. €{fmt(targetEur)}</span>
                            </div>
                            <div style={{ height: 3, background: "#222", borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
                              <div style={{ height: 3, borderRadius: 2, background: isOver ? "#DC2626" : accent, width: `${fillPct.toFixed(0)}%`, transition: "width 0.4s" }} />
                            </div>
                            <div style={{ borderTop: "1px solid #1a1a1a", paddingTop: 8 }}>
                              {isOver ? (
                                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: "#555", fontStyle: "italic" }}>No añadir este período</span>
                              ) : (
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: "#555" }}>
                                    {investmentMode === "puntual" ? "A desplegar" : periodicity === "trimestral" ? "Este trimestre" : "Este mes"}
                                  </span>
                                  <span style={{ ...S.mono, fontSize: 12, color: allocated > 0 ? accent : "#333", fontWeight: allocated > 0 ? 500 : 400 }}>
                                    {allocated > 0 ? `€${fmt(allocated)}` : "—"}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {dcaActionable.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: dcaToAccumulate.length > 0 ? 14 : 0 }}>
                        {dcaActionable.map((r, i) => {
                          const a = analysis[r.ticker];
                          const up   = a?.rango?.subida_max ? Math.abs(parseRangePct(a.rango.subida_max)) : null;
                          const down = a?.rango?.bajada_max ? Math.abs(parseRangePct(a.rango.bajada_max)) : null;
                          const rr   = up && down && down > 0 ? (up / down).toFixed(1) : null;
                          const rrColor = rr ? (rr >= 2.5 ? "#15803D" : rr >= 1.5 ? "#D97706" : "#DC2626") : "#555";
                          const isTop = i === 0;
                          return (
                            <div key={r.ticker} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 14px", background: isTop ? "#1a1a1a" : "#111", border: `1px solid ${isTop ? "#444" : "#222"}`, borderRadius: 2 }}>
                              {isTop && <div style={{ width: 3, height: 32, background: T.gold, borderRadius: 2, flexShrink: 0 }} />}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <span style={{ ...S.mono, fontSize: 14, fontWeight: 500, color: isTop ? T.goldLight : "#999" }}>{r.ticker}</span>
                                  <span style={{ ...S.label, fontSize: 8, color: "#555", background: "#1a1a1a", border: "1px solid #333", padding: "1px 6px", borderRadius: 20 }}>{r.bucket}</span>
                                  {r.bucketIsOver && <span title="Bucket sobreasignado — incluido por R/R excepcional" style={{ ...S.label, fontSize: 8, color: "#D97706", background: "#2a1f00", border: "1px solid #92400E", padding: "1px 6px", borderRadius: 20 }}>exceso R/R</span>}
                                  {a?.tema && <span style={{ ...S.label, fontSize: 8, color: "#444" }}>{a.tema}</span>}
                                </div>
                                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: "#555" }}>{r.name || r.ticker}</span>
                              </div>
                              {rr && (
                                <div style={{ textAlign: "center", flexShrink: 0 }}>
                                  <p style={{ ...S.label, margin: "0 0 1px", fontSize: 8, color: "#444" }}>R/R</p>
                                  <p style={{ ...S.mono, margin: 0, fontSize: 13, fontWeight: 500, color: rrColor }}>{rr}x</p>
                                </div>
                              )}
                              <div style={{ textAlign: "right", flexShrink: 0 }}>
                                <p style={{ ...S.mono, margin: 0, fontSize: 18, fontWeight: 500, color: isTop ? T.gold : "#777" }}>€{fmt(r.amount)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {dcaToAccumulate.length > 0 && (
                      <>
                        <p style={{ ...S.label, margin: "0 0 8px", fontSize: 9, color: "#444" }}>
                          {investmentMode === "puntual" ? `Importe insuficiente (mínimo €${DCA_MIN})` : `Acumular el ${periodicity === "trimestral" ? "próximo trimestre" : "mes que viene"} (no llegan a €${DCA_MIN})`}
                        </p>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {dcaToAccumulate.map(r => (
                            <span key={r.ticker} style={{ ...S.mono, fontSize: 11, color: "#555", background: "#111", border: "1px solid #222", borderRadius: 2, padding: "4px 10px" }}>
                              {r.ticker}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Header */}
              <div style={{ marginBottom: 28 }}>
                <p style={{ ...S.serif, margin: "0 0 6px", fontSize: 22, fontWeight: 600, color: T.ink }}>Movimientos recomendados</p>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.inkMuted, margin: 0, lineHeight: 1.6 }}>
                  Decisiones sugeridas basadas en el análisis de R/R de cada posición. Un R/R &lt; 1 indica que el riesgo supera el potencial de subida.
                </p>
              </div>

              {noAnalysis ? (
                <div style={{ padding: "32px 24px", background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, textAlign: "center" }}>
                  <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, color: T.inkMuted, margin: 0 }}>
                    Sin datos de análisis. Carga un JSON en la carpeta <span style={{ ...S.mono }}>Analysis/</span> para ver recomendaciones.
                  </p>
                </div>
              ) : (
                <>
                  {/* ── VENTAS ────────────────────────────────────────────── */}
                  <div data-tut="mov-ventas" style={{ marginBottom: 32 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 3, height: 18, background: T.red, borderRadius: 2, flexShrink: 0 }} />
                      <p style={{ ...S.label, margin: 0, fontSize: 11, color: T.red }}>Ventas recomendadas</p>
                      {ventas.length > 0 && (
                        <span style={{ ...S.label, fontSize: 9, background: T.redLight, color: T.red, border: "1px solid #FECACA", padding: "1px 8px", borderRadius: 20 }}>
                          {ventas.length} posición{ventas.length !== 1 ? "es" : ""}
                        </span>
                      )}
                    </div>

                    {ventas.length === 0 ? (
                      <div style={{ padding: "20px 22px", background: "#F0FDF4", border: "1px solid #86efac", borderRadius: 2 }}>
                        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.positive, margin: 0 }}>
                          ✓ Todas tus posiciones tienen un R/R ≥ 1. No hay ventas recomendadas.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {ventas.map((p, i) => (
                          <div key={p.Ticker} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 20px", background: i % 2 === 0 ? T.paper : T.bg, border: `1px solid ${T.border}`, borderRadius: i === 0 ? "2px 2px 0 0" : i === ventas.length - 1 ? "0 0 2px 2px" : 0, borderTop: i > 0 ? "none" : undefined }}>
                            {/* R/R badge */}
                            {rrBadge(p.rr)}

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                                <span style={{ ...S.mono, fontSize: 15, fontWeight: 600, color: T.ink }}>{p.Ticker}</span>
                                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted }}>{p.a?.name || p.Company}</span>
                                <span style={{ ...S.label, fontSize: 8, background: T.bg, border: `1px solid ${T.border}`, color: T.inkFaint, padding: "1px 7px", borderRadius: 20 }}>{p.Bucket}</span>
                                {p.rotate && (
                                  <span style={{ ...S.label, fontSize: 8, background: "#FFF7ED", border: "1px solid #FDE68A", color: "#B45309", padding: "1px 7px", borderRadius: 20 }}>Rotación sugerida</span>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: p.a?.descripcion ? 6 : 0 }}>
                                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted }}>
                                  Invertido: <span style={{ ...S.mono, color: T.ink }}>€{fmt(p.Invertido)}</span>
                                </span>
                                {p.up !== null && p.down !== null && (
                                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted }}>
                                    Rango: <span style={{ ...S.mono, color: "#DC2626" }}>−{p.down}%</span>
                                    <span style={{ color: T.inkFaint }}> / </span>
                                    <span style={{ ...S.mono, color: T.positive }}>+{p.up}%</span>
                                  </span>
                                )}
                              </div>
                              {p.a?.descripcion && (
                                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkFaint, margin: "4px 0 0", lineHeight: 1.5, maxWidth: 680 }}>
                                  {p.a.descripcion.length > 200 ? p.a.descripcion.slice(0, 200) + "…" : p.a.descripcion}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── COMPRAS ───────────────────────────────────────────── */}
                  <div data-tut="mov-compras">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <div style={{ width: 3, height: 18, background: T.positive, borderRadius: 2, flexShrink: 0 }} />
                      <p style={{ ...S.label, margin: 0, fontSize: 11, color: T.positive }}>Compras recomendadas</p>
                      {compras.length > 0 && (
                        <span style={{ ...S.label, fontSize: 9, background: "#F0FDF4", color: T.positive, border: "1px solid #86efac", padding: "1px 8px", borderRadius: 20 }}>
                          {compras.length} candidato{compras.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    {compras.length === 0 ? (
                      <div style={{ padding: "20px 22px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 2 }}>
                        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.inkMuted, margin: 0 }}>
                          Todos los tickers del análisis ya están en tu portfolio.
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {compras.map((c, i) => (
                          <div key={c.ticker} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 20px", background: i % 2 === 0 ? T.paper : T.bg, border: `1px solid ${T.border}`, borderRadius: i === 0 ? "2px 2px 0 0" : i === compras.length - 1 ? "0 0 2px 2px" : 0, borderTop: i > 0 ? "none" : undefined }}>
                            {/* R/R badge */}
                            {rrBadge(c.rr)}

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                                <span style={{ ...S.mono, fontSize: 15, fontWeight: 600, color: T.ink }}>{c.ticker}</span>
                                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted }}>{c.a?.name}</span>
                                {c.a?.sector && (
                                  <span style={{ ...S.label, fontSize: 8, background: T.bg, border: `1px solid ${T.border}`, color: T.inkFaint, padding: "1px 7px", borderRadius: 20 }}>{c.a.sector}</span>
                                )}
                                {c.a?.bucket && (
                                  <span style={{ ...S.label, fontSize: 8, background: c.a.bucket === "Core" ? T.goldLight : c.a.bucket === "Satellite" ? T.tealLight : T.bg, border: `1px solid ${c.a.bucket === "Core" ? T.goldBorder : c.a.bucket === "Satellite" ? T.tealBorder : T.border}`, color: c.a.bucket === "Core" ? T.neutral : c.a.bucket === "Satellite" ? T.teal : T.inkFaint, padding: "1px 7px", borderRadius: 20 }}>{c.a.bucket}</span>
                                )}
                              </div>
                              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: c.a?.ventaja ? 6 : 0 }}>
                                {c.up !== null && c.down !== null && (
                                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted }}>
                                    Rango: <span style={{ ...S.mono, color: "#DC2626" }}>−{c.down}%</span>
                                    <span style={{ color: T.inkFaint }}> / </span>
                                    <span style={{ ...S.mono, color: T.positive }}>+{c.up}%</span>
                                  </span>
                                )}
                                {c.a?.potencial && (
                                  <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted }}>
                                    Potencial: <span style={{ ...S.mono, color: T.positive, fontSize: 11 }}>{c.a.potencial.split("(")[0].trim()}</span>
                                  </span>
                                )}
                              </div>
                              {c.a?.ventaja && (
                                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.inkFaint, margin: "4px 0 0", lineHeight: 1.5, maxWidth: 680 }}>
                                  {c.a.ventaja.length > 200 ? c.a.ventaja.slice(0, 200) + "…" : c.a.ventaja}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── TODOS LOS CANDIDATOS ──────────────────────────────── */}
                  {!noAnalysis && (
                    <div data-tut="mov-todos" style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${T.border}` }}>
                      <p style={{ ...S.serif, margin: "0 0 4px", fontSize: 19, fontWeight: 600, color: T.ink }}>Todos los candidatos</p>
                      <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.inkMuted, margin: "0 0 16px" }}>
                        Universo completo del análisis — thesis, catalizadores y escenarios por empresa.
                      </p>
                      {["Core","Satellite","Wildshots"].map(b => (
                        candidatesByBucket[b].length > 0 && (
                          <AnalysisBucketSection
                            key={b}
                            bucket={b}
                            tickers={candidatesByBucket[b]}
                            analysis={analysis}
                            tx={tx}
                            heldTickers={heldTickers}
                          />
                        )
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}

        {/* ====== CONFIGURACION ====== */}
        {tab === "config" && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <p style={{ ...S.serif, margin: "0 0 6px", fontSize: 22, fontWeight: 600, color: T.ink }}>{tx.configTitle}</p>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: T.inkMuted, margin: 0, lineHeight: 1.6 }}>
                {tx.configDesc}
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 16, alignItems: "start", width: "100%" }}>

              {/* === CSV UPLOAD === */}
              <div data-tut="config-csv" style={{ background: T.paper, border: `1px solid ${!isDemo ? "#86efac" : T.border}`, borderRadius: 2, padding: "22px 24px", flex: "1 1 280px", minWidth: 0, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <p style={{ ...S.serif, margin: 0, fontSize: 18, fontWeight: 600, color: T.ink }}>Datos de posiciones</p>
                  <span style={{ ...S.label, background: T.goldLight, color: T.neutral, border: `1px solid ${T.goldBorder}`, padding: "2px 10px", borderRadius: 20, fontSize: 9 }}>CSV</span>
                </div>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted, margin: "0 0 16px", lineHeight: 1.6 }}>
                  {lang === "es" ? "Exporta desde Google Sheets tu historial de operaciones de eToro. La app lo procesa localmente." : "Export from Google Sheets your eToro operation history. The app processes it locally."}
                </p>

                {!isDemo ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#F0FDF4", border: "1px solid #86efac", borderRadius: 2 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.positive, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7.5L5.5 11L12 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Inter',sans-serif", margin: "0 0 1px", fontSize: 13, fontWeight: 600, color: T.positive }}>CSV cargado</p>
                      <p style={{ ...S.mono, margin: "0 0 2px", fontSize: 11, color: T.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fileName}</p>
                      <p style={{ fontFamily: "'Inter',sans-serif", margin: 0, fontSize: 11, color: T.inkMuted }}>{positions.length} {tx.positions_label} · {activeBuckets.join(" / ")}</p>
                    </div>
                    <button onClick={clearFile} style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${T.borderDark}`, background: T.paper, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.redLight}
                      onMouseLeave={e => e.currentTarget.style.background = T.paper}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1 1L9 9M9 1L1 9" stroke={T.red} strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={handleCSVOpen}
                    onDragOver={e => { e.preventDefault(); setCsvDragOver(true); }}
                    onDragLeave={() => setCsvDragOver(false)}
                    onDrop={e => { e.preventDefault(); setCsvDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "28px 20px", borderRadius: 2, cursor: "pointer", border: `2px dashed ${csvDragOver ? T.gold : T.borderDark}`, background: csvDragOver ? T.goldLight : T.bg, transition: "all 0.15s" }}
                  >
                    <input ref={csvInputRef} type="file" accept=".csv,.tsv" onChange={handleInputChange} style={{ display: "none" }} />
                    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                      <rect x="4" y="2" width="20" height="26" rx="2" stroke={csvDragOver ? T.gold : T.borderDark} strokeWidth="2"/>
                      <path d="M20 2v8h8" stroke={csvDragOver ? T.gold : T.borderDark} strokeWidth="2" strokeLinejoin="round"/>
                      <path d="M10 20l6-6 6 6M16 14v10" stroke={csvDragOver ? T.gold : T.inkFaint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p style={{ ...S.serif, margin: 0, fontSize: 15, fontWeight: 600, color: T.ink }}>{loading ? tx.processing : tx.dragCsv}</p>
                    <p style={{ fontFamily: "'Inter',sans-serif", margin: 0, fontSize: 11, color: T.inkMuted }}>o haz clic para seleccionar</p>
                  </div>
                )}
                {error && (
                  <div style={{ marginTop: 10, padding: "9px 13px", background: T.redLight, border: "1px solid #fca5a5", borderRadius: 2, fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.red }}>
                    <strong>{tx.error}:</strong> {error}
                  </div>
                )}

                {/* Format guide */}
                {(() => {
                  const csvText = `Action,Date,Quantity,Company,Industry,Bucket
Buy,01/03/2026,90.00 EUR,Vanguard S&P 500 (VOO),ETF,Core
Buy,01/03/2026,80.00 EUR,Microsoft (MSFT),Technology,Core
Buy,01/03/2026,125.00 EUR,NVIDIA (NVDA),Technology,Satellite
Buy,01/03/2026,248.00 EUR,Constellation Energy Corp (CEG),Energy,Wildshots
Sell,15/03/2026,50.00 EUR,Microsoft (MSFT),Technology,Core`;
                  return (
                    <div style={{ marginTop: 14, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ padding: "6px 12px", borderBottom: `1px solid ${T.border}`, background: T.goldLight, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ ...S.label, color: T.neutral, fontSize: 9 }}>Columnas esperadas</span>
                        <SaveTemplateButton filename="portfolio_template.csv" content={csvText} color={T.gold} border={T.goldBorder} textColor={T.neutral} label="↓ Descargar plantilla" />
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "auto" }}>
                          <thead>
                            <tr style={{ background: T.ink }}>
                              {["Action","Qty","Price","Company","Industry","Bucket"].map(h => (
                                <th key={h} style={{ padding: "6px 10px", ...S.label, color: T.goldLight, textAlign: "left", fontSize: 8, whiteSpace: "nowrap" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              ["Buy",  "530€","168€","TakeTwo (TTWO)",     "Entertainment","Wildshot"],
                              ["Buy",  "248€","250€","Const. Energy (CEG)","Energy",       "Wildshot"],
                              ["Sell", "85€", "175€","TakeTwo (TTWO)",     "Entertainment","Wildshot"],
                            ].map((r, i) => (
                              <tr key={i} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.paper : T.bg }}>
                                {r.map((v, j) => (
                                  <td key={j} style={{ padding: "5px 10px", ...S.mono, fontSize: 10, color: j === 0 ? (v === "Sell" ? T.red : T.positive) : T.ink, whiteSpace: "nowrap" }}>{v}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* === ANALYSIS JSON UPLOAD === */}
              <div data-tut="config-json" style={{ background: T.paper, border: `1px solid ${Object.keys(analysis).length > 0 ? "#86efac" : T.border}`, borderRadius: 2, padding: "22px 24px", flex: "1 1 280px", minWidth: 0, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <p style={{ ...S.serif, margin: 0, fontSize: 18, fontWeight: 600, color: T.ink }}>{tx.analysisTitle}</p>
                  <span style={{ ...S.label, background: T.blueLight, color: T.blue, border: `1px solid ${T.blueBorder}`, padding: "2px 10px", borderRadius: 20, fontSize: 9 }}>JSON</span>
                </div>
                <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted, margin: "0 0 16px", lineHeight: 1.6 }}>
                  Archivo con descripción, ventaja competitiva y motivo de inversión por ticker. Ve a la pestaña Análisis para leerlo.
                </p>

                {Object.keys(analysis).length > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#F0FDF4", border: "1px solid #86efac", borderRadius: 2 }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.positive, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M2 7.5L5.5 11L12 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'Inter',sans-serif", margin: "0 0 1px", fontSize: 13, fontWeight: 600, color: T.positive }}>
                        JSON cargado · {Object.keys(analysis).filter(k => !k.startsWith("_")).length} tickers
                      </p>
                      <p style={{ ...S.mono, margin: 0, fontSize: 11, color: T.inkMuted }}>{analysisFile}</p>
                    </div>
                    <button
                      onClick={() => { setAnalysis({}); setAnalysisFile(""); setAnalysisError(""); }}
                      style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${T.borderDark}`, background: T.paper, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      onMouseEnter={e => e.currentTarget.style.background = T.redLight}
                      onMouseLeave={e => e.currentTarget.style.background = T.paper}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M1 1L9 9M9 1L1 9" stroke={T.red} strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => jsonInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setAnalysisDrag(true); }}
                    onDragLeave={() => setAnalysisDrag(false)}
                    onDrop={e => { e.preventDefault(); setAnalysisDrag(false); handleAnalysisFile(e.dataTransfer.files[0]); }}
                    style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "28px 20px", borderRadius: 2, cursor: "pointer", border: `2px dashed ${analysisDrag ? T.blue : T.borderDark}`, background: analysisDrag ? T.blueLight : T.bg, transition: "all 0.15s" }}
                  >
                    <input ref={jsonInputRef} type="file" accept=".json" onChange={e => handleAnalysisFile(e.target.files[0])} style={{ display: "none" }} />
                    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                      <rect x="3" y="1" width="17" height="23" rx="2" stroke={analysisDrag ? T.blue : T.borderDark} strokeWidth="1.8"/>
                      <path d="M17 1v7h7" stroke={analysisDrag ? T.blue : T.borderDark} strokeWidth="1.8" strokeLinejoin="round"/>
                      <path d="M8 17l5-5 5 5M13 12v9" stroke={analysisDrag ? T.blue : T.inkFaint} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p style={{ ...S.serif, margin: 0, fontSize: 15, fontWeight: 600, color: T.ink }}>Arrastra tu analysis.json aquí</p>
                    <p style={{ fontFamily: "'Inter',sans-serif", margin: 0, fontSize: 11, color: T.inkMuted }}>o haz clic para seleccionar</p>
                  </div>
                )}
                {analysisError && (
                  <div style={{ marginTop: 10, padding: "9px 13px", background: T.redLight, border: "1px solid #fca5a5", borderRadius: 2, fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.red }}>
                    <strong>{tx.error}:</strong> {analysisError}
                  </div>
                )}

                {/* Format hint + download template */}
                {(() => {
                  const jsonText = JSON.stringify({
                    "_meta": "Campos comunes (todos los buckets): bucket, name, sector, potencial, descripcion, ventaja, por_que_ahora, rango {bajada_max, subida_max}, estimacion {m3, m6, m12}. Core: weight (0-100), rotate (bool). Satellite: priority (número). Wildshots: conviction (1-5), risk, catalyst, tag, tagColor, bear, bull.",
                    "VOO": { "bucket": "Core", "name": "Vanguard S&P 500 ETF", "sector": "ETF", "weight": 90, "rotate": false, "potencial": "+10% (estimado 2026)", "descripcion": "Qué hace la empresa o fondo.", "ventaja": "Por qué destaca frente a la competencia.", "por_que_ahora": "Motivo concreto para invertir ahora.", "rango": { "bajada_max": "-20%", "subida_max": "+15%" }, "estimacion": { "m3": 2, "m6": 6, "m12": 12 } },
                    "NVDA": { "bucket": "Satellite", "name": "NVIDIA", "sector": "AI / Chips", "priority": 1, "potencial": "+30% (precio objetivo consenso $XXX)", "descripcion": "Qué hace la empresa.", "ventaja": "Por qué destaca frente a la competencia.", "por_que_ahora": "Motivo concreto para invertir ahora.", "rango": { "bajada_max": "-35%", "subida_max": "+50%" }, "estimacion": { "m3": -5, "m6": 10, "m12": 30 } },
                    "TTWO": { "bucket": "Wildshots", "name": "Take-Two Interactive", "sector": "Gaming", "conviction": 5, "risk": "Medium-High", "catalyst": "GTA VI launch (2026)", "tag": "Primary conviction", "tagColor": "#C5973A", "bear": "Escenario bajista: delay en lanzamiento → -25%.", "bull": "Escenario alcista: lanzamiento exitoso → +80%.", "potencial": "+80% (escenario bull)", "descripcion": "Qué hace la empresa.", "ventaja": "Por qué destaca frente a la competencia.", "por_que_ahora": "Motivo concreto para invertir ahora.", "rango": { "bajada_max": "-40%", "subida_max": "+80%" }, "estimacion": { "m3": -8, "m6": 15, "m12": 50 } }
                  }, null, 2);
                  return (
                    <div style={{ marginTop: 14, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ padding: "6px 12px", borderBottom: `1px solid ${T.border}`, background: T.blueLight, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ ...S.label, color: T.blue, fontSize: 9 }}>Estructura del JSON — campos por bucket</span>
                        <SaveTemplateButton filename="analysis_template.json" content={jsonText} color={T.blue} border={T.blueBorder} textColor={T.blue} label="↓ Descargar plantilla" />
                      </div>
                      <pre style={{ ...S.mono, margin: 0, padding: "10px 14px", fontSize: 10, color: T.inkMuted, lineHeight: 1.8, overflowX: "auto", background: "transparent" }}>{`{
  "VOO":  { "bucket":"Core",      "weight":90, "rotate":false, "potencial":"+10%",
            "descripcion":"...", "ventaja":"...", "por_que_ahora":"...",
            "rango":{"bajada_max":"-20%","subida_max":"+15%"}, "estimacion":{"m3":2,"m6":6,"m12":12} },

  "NVDA": { "bucket":"Satellite", "priority":1, "potencial":"+30%",
            "descripcion":"...", "ventaja":"...", "por_que_ahora":"...",
            "rango":{"bajada_max":"-35%","subida_max":"+50%"}, "estimacion":{"m3":-5,"m6":10,"m12":30} },

  "TTWO": { "bucket":"Wildshots", "conviction":5, "risk":"Medium-High", "catalyst":"...",
            "bear":"...", "bull":"...", "potencial":"+80%",
            "descripcion":"...", "ventaja":"...", "por_que_ahora":"...",
            "rango":{"bajada_max":"-40%","subida_max":"+80%"}, "estimacion":{"m3":-8,"m6":15,"m12":50} }
}`}</pre>
                      <div style={{ padding: "8px 14px", borderTop: `1px solid ${T.border}`, background: "#EFF6FF" }}>
                        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: T.blue, margin: 0, lineHeight: 1.5 }}>
                          <strong>Retorno potencial:</strong> usa formato <code style={{ background: "white", padding: "1px 4px", borderRadius: 2 }}>+X%</code> (p.ej. <code style={{ background: "white", padding: "1px 4px", borderRadius: 2 }}>+51% (consenso $603)</code>). El sistema extrae el primer número positivo para los cálculos.
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>


          </div>
        )}
      </div>

      {/* ── GLOBAL: Add movement modal + FAB ───────────────────────── */}
      {showAddMovement && (
        <AddMovementModal
          rawTransactions={rawTransactions}
          onSave={async (row) => { await addMovement(row); setShowAddMovement(false); }}
          onClose={() => setShowAddMovement(false)}
          saved={movementSaved}
        />
      )}
      {!isDemo && (
        <button
          onClick={() => setShowAddMovement(true)}
          title="Añadir movimiento"
          style={{
            position: "fixed", bottom: 28, right: 28, zIndex: 200,
            width: 52, height: 52, borderRadius: "50%",
            background: T.ink, color: T.goldLight,
            border: `1.5px solid ${T.gold}`,
            fontSize: 26, lineHeight: 1, cursor: "pointer",
            boxShadow: "0 4px 18px rgba(0,0,0,0.22)",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.32)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)";   e.currentTarget.style.boxShadow = "0 4px 18px rgba(0,0,0,0.22)"; }}
        >
          +
        </button>
      )}

      {/* ── GLOBAL: Tutorial button + card ─────────────────────────── */}
      {(() => {
        const tutSteps = TUTORIAL_STEPS[tab] || [];
        const TAB_LABELS = { proyecto: "Inicio", evolucion: "Evolución", distribucion: "Mi Portfolio", candidates: "Candidates", movimientos: "Movimientos", analisis: "Análisis", config: "Configuración" };
        const tabLabel = TAB_LABELS[tab] || tab;
        const tabIdx   = TUTORIAL_TAB_ORDER.indexOf(tab);
        const nextTab  = TUTORIAL_TAB_ORDER[tabIdx + 1] || null;
        const handleSkip = () => {
          if (nextTab) { setTab(nextTab); setTutorialStep(0); }
          else { setTutorialActive(false); }
        };
        return (
          <>
            {/* ? Button — sits above the + FAB */}
            <button
              onClick={() => {
                if (tutorialActive) { setTutorialActive(false); }
                else { setTutorialStep(0); setTutorialActive(true); }
              }}
              title={tutorialActive ? "Cerrar tutorial" : "Abrir tutorial"}
              style={{
                position: "fixed", bottom: 92, right: 28, zIndex: 200,
                width: 40, height: 40, borderRadius: "50%",
                background: tutorialActive ? T.gold : "white",
                color: tutorialActive ? T.ink : T.inkMuted,
                border: `1.5px solid ${tutorialActive ? T.gold : T.borderDark}`,
                fontSize: 16, fontWeight: 700, fontFamily: "'Inter',sans-serif",
                cursor: "pointer", lineHeight: 1,
                boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
              }}
            >?</button>

            {/* Tutorial card */}
            {tutorialActive && tutSteps.length > 0 && (
              <TutorialCard
                steps={tutSteps}
                step={tutorialStep}
                tabLabel={tabLabel}
                hasNextTab={!!nextTab}
                onNext={() => setTutorialStep(s => Math.min(s + 1, tutSteps.length - 1))}
                onPrev={() => setTutorialStep(s => Math.max(s - 1, 0))}
                onSkip={handleSkip}
                onClose={() => setTutorialActive(false)}
              />
            )}
          </>
        );
      })()}

      {/* FOOTER */}
      <div style={{ borderTop: `1px solid ${T.border}`, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
        <span style={{ ...S.label, color: T.inkFaint }}>No es asesoramiento financiero · Referencia personal</span>
        <span style={{ ...S.label, color: T.gold }}>◆ STOX</span>
      </div>
    </div>
  );
}
