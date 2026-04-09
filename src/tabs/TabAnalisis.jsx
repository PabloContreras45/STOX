import { T, S } from "../theme.js";
import { fmt } from "../utils/format.js";
import { parseRangePct } from "../utils/analysis.js";
import { EstCell, RiskAccordion, BucketRiskAccordion } from "../components/RiskAccordion.jsx";
import { AnalysisBucketSection } from "../components/candidates/AnalysisBucketSection.jsx";

export function TabAnalisis({
  positions,
  analysis,
  analysisFile,
  candidatesByBucket,
  snapshotState,
  snapshotError,
  setSnapshotState,
  setSnapshotError,
  tx,
  setTab,
  role,
}) {
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
        {hasAnalysis && role === "owner" && (
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
}
