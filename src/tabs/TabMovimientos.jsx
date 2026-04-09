import { T, S } from "../theme.js";
import { fmt } from "../utils/format.js";
import { parseRangePct } from "../utils/analysis.js";
import { AnalysisBucketSection } from "../components/candidates/AnalysisBucketSection.jsx";

const DCA_MIN = 50;

export function TabMovimientos({
  positions,
  analysis,
  byBucket,
  candidatesByBucket,
  desiredInvestment,
  investmentMode,
  periodicity,
  periodicAmount,
  annualInvestment,
  normalizedSplit,
  dcaBudget,
  dcaPlan,
  dcaActionable,
  dcaToAccumulate,
  nextMove,
  planOpen,
  setPlanOpen,
  coreTargetTotal,
  satTargetTotal,
  wsTargetTotal,
  investedThisQuarter,
  tx,
  setTab,
  role,
}) {
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
                                return positions.length > 0 && real > target + 2;
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
}
