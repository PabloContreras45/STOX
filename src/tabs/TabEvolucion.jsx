import { T, S } from "../theme.js";
import { fmt } from "../utils/format.js";
import { ChartTooltip } from "../components/ChartTooltip.jsx";
import {
  Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export function TabEvolucion({
  totalInvertido,
  investmentMode,
  periodicity,
  annualInvestment,
  desiredInvestment,
  potentialReturn,
  potentialCoverage,
  totalPotEuros,
  expectedFinal,
  analysis,
  positions,
  evoData,
  lang,
  tx,
}) {
  return (
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
  );
}
