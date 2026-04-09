import { T, S, BUCKET_COLOR } from "../theme.js";
import { fmt, pctBar } from "../utils/format.js";
import { parseRangePct, parsePotencial } from "../utils/analysis.js";
import { StatCard } from "../components/StatCard.jsx";
import { ChartTooltip } from "../components/ChartTooltip.jsx";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

export function TabPortfolio({
  positions,
  analysis,
  totalInvertido,
  potentialReturn,
  totalPotEuros,
  expectedFinal,
  byBucket,
  desiredSplit,
  desiredInvestment,
  distData,
  lang,
  tx,
  setTab,
  role,
}) {
  return (
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
                    <p style={{ ...S.mono, margin: 0, fontSize: 18, fontWeight: 500, color: T.ink }}>{`€${fmt(b.inv)}`}</p>
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
  );
}
