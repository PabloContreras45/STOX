import { T, S } from "../theme.js";
import { fmt } from "../utils/format.js";

export function TabInicio({
  positions,
  desiredInvestment,
  setDesiredInvestment,
  desiredReturn,
  desiredSplit,
  handleSplitChange,
  investmentMode,
  setInvestmentMode,
  periodicity,
  setPeriodicity,
  periodicAmount,
  setPeriodicAmount,
  annualInvestment,
  normalizedSplit,
  eventoInput,
  setEventoInput,
  sectoresInput,
  setSectoresInput,
  tx,
  lang,
  setTab,
  role,
}) {
  const readOnly = role === "viewer";
  const off = Object.values(desiredSplit).reduce((s, v) => s + v, 0) !== 100;
  const proyFinal = desiredInvestment * (1 + desiredReturn / 100);
  const gananciaObj = proyFinal - desiredInvestment;

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
                onClick={() => !readOnly && setInvestmentMode(opt.id)}
                disabled={readOnly}
                style={{
                  flex: "1 1 180px", textAlign: "left", padding: "14px 18px",
                  borderRadius: 2, cursor: readOnly ? "default" : "pointer", transition: "all 0.15s",
                  background: active ? T.gold : "#1a1a1a",
                  border: `1.5px solid ${active ? T.gold : "#333"}`,
                  opacity: readOnly ? 0.6 : 1,
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
                    onClick={() => !readOnly && setPeriodicity(opt.id)}
                    disabled={readOnly}
                    style={{
                      padding: "8px 20px", borderRadius: 2, cursor: readOnly ? "default" : "pointer",
                      fontFamily: "'Inter',sans-serif", fontSize: 12, fontWeight: 600,
                      background: active ? T.goldLight : "transparent",
                      border: `1.5px solid ${active ? T.goldBorder : "#444"}`,
                      color: active ? T.ink : "#888",
                      transition: "all 0.15s",
                      opacity: readOnly ? 0.6 : 1,
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
              readOnly={readOnly}
              value={investmentMode === "puntual"
                ? (desiredInvestment === 0 ? "" : desiredInvestment)
                : (periodicAmount === 0 ? "" : periodicAmount)}
              placeholder={investmentMode === "puntual" ? "5000" : periodicity === "mensual" ? "417" : "1250"}
              onChange={e => {
                if (readOnly) return;
                const v = parseFloat(e.target.value);
                if (investmentMode === "puntual") {
                  setDesiredInvestment(isNaN(v) ? 0 : v);
                } else {
                  const amount = isNaN(v) ? 0 : v;
                  setPeriodicAmount(amount);
                  setDesiredInvestment(periodicity === "mensual" ? amount * 12 : amount * 4);
                }
              }}
              style={{ width: "100%", padding: "12px 12px 12px 30px", border: `1.5px solid ${T.goldBorder}`, borderRadius: 2, fontFamily: "'DM Mono',monospace", fontSize: 20, fontWeight: 500, color: T.ink, background: T.goldLight, outline: "none", boxSizing: "border-box", cursor: readOnly ? "default" : "text", opacity: readOnly ? 0.7 : 1 }}
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
              <button key={p.label} onClick={() => !readOnly && handleSplitChange("__preset__", { Core: p.core, Satellite: p.sat, Wildshots: p.ws })}
                disabled={readOnly}
                style={{ ...S.label, fontSize: 9, padding: "5px 12px", borderRadius: 2, cursor: readOnly ? "default" : "pointer", background: active ? T.ink : T.bg, color: active ? T.goldLight : T.inkMuted, border: `1px solid ${active ? T.ink : T.border}`, opacity: readOnly ? 0.6 : 1 }}>
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
                onChange={e => !readOnly && handleSplitChange(bucket, parseInt(e.target.value))}
                disabled={readOnly}
                style={{ width: "100%", accentColor: color, cursor: readOnly ? "default" : "pointer", opacity: readOnly ? 0.6 : 1 }}
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
}
