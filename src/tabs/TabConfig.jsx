import { useState, useEffect } from "react";
import { T, S } from "../theme.js";
import { SaveTemplateButton } from "../components/SaveTemplateButton.jsx";

export function TabConfig({
  isDemo,
  positions,
  analysis,
  analysisFile,
  fileName,
  activeBuckets,
  loading,
  error,
  analysisError,
  csvDragOver,
  setCsvDragOver,
  analysisDrag,
  setAnalysisDrag,
  csvInputRef,
  jsonInputRef,
  handleCSVOpen,
  handleFile,
  handleInputChange,
  handleAnalysisFile,
  clearFile,
  setAnalysis,
  setAnalysisFile,
  setAnalysisError,
  lang,
  tx,
  role,
}) {
  const canWrite = role === "owner";

  // ── User management state (owner only) ──────────────────────────────
  const [users, setUsers]         = useState([]);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | ok | error

  useEffect(() => {
    if (role !== "owner") return;
    fetch("/api/config", { headers: { "X-Session-Token": localStorage.getItem("stox_token") || "" } })
      .then(r => r.json())
      .then(cfg => { if (cfg.users) setUsers(cfg.users); })
      .catch(() => {});
  }, [role]);

  const handlePinChange = (idx, value) => {
    setUsers(prev => prev.map((u, i) => i === idx ? { ...u, pin: value } : u));
  };

  const saveUsers = async () => {
    setSaveStatus("saving");
    try {
      const cfgRes = await fetch("/api/config", {
        headers: { "X-Session-Token": localStorage.getItem("stox_token") || "" }
      });
      const cfg = await cfgRes.json();
      const merged = { ...cfg, users };
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": localStorage.getItem("stox_token") || "" },
        body: JSON.stringify(merged),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Error");
      setSaveStatus("ok");
      setTimeout(() => setSaveStatus("idle"), 2500);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const ROLE_LABELS = { owner: "Superadmin", viewer: "Full View", restricted: "View" };

  return (
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
              <button
                onClick={canWrite ? clearFile : undefined}
                style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${T.borderDark}`, background: T.paper, cursor: canWrite ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", opacity: canWrite ? 1 : 0.5, pointerEvents: canWrite ? "auto" : "none" }}
                onMouseEnter={e => { if (canWrite) e.currentTarget.style.background = T.redLight; }}
                onMouseLeave={e => { if (canWrite) e.currentTarget.style.background = T.paper; }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1L9 9M9 1L1 9" stroke={T.red} strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ) : (
            <div
              onClick={canWrite ? handleCSVOpen : undefined}
              onDragOver={canWrite ? (e => { e.preventDefault(); setCsvDragOver(true); }) : undefined}
              onDragLeave={canWrite ? (() => setCsvDragOver(false)) : undefined}
              onDrop={canWrite ? (e => { e.preventDefault(); setCsvDragOver(false); handleFile(e.dataTransfer.files[0]); }) : undefined}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "28px 20px", borderRadius: 2, cursor: canWrite ? "pointer" : "default", border: `2px dashed ${csvDragOver ? T.gold : T.borderDark}`, background: csvDragOver ? T.goldLight : T.bg, transition: "all 0.15s", opacity: canWrite ? 1 : 0.5, pointerEvents: canWrite ? "auto" : "none" }}
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
                onClick={canWrite ? () => { setAnalysis({}); setAnalysisFile(""); setAnalysisError(""); } : undefined}
                style={{ width: 28, height: 28, borderRadius: "50%", border: `1px solid ${T.borderDark}`, background: T.paper, cursor: canWrite ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", opacity: canWrite ? 1 : 0.5, pointerEvents: canWrite ? "auto" : "none" }}
                onMouseEnter={e => { if (canWrite) e.currentTarget.style.background = T.redLight; }}
                onMouseLeave={e => { if (canWrite) e.currentTarget.style.background = T.paper; }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M1 1L9 9M9 1L1 9" stroke={T.red} strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ) : (
            <div
              onClick={canWrite ? () => jsonInputRef.current?.click() : undefined}
              onDragOver={canWrite ? (e => { e.preventDefault(); setAnalysisDrag(true); }) : undefined}
              onDragLeave={canWrite ? (() => setAnalysisDrag(false)) : undefined}
              onDrop={canWrite ? (e => { e.preventDefault(); setAnalysisDrag(false); handleAnalysisFile(e.dataTransfer.files[0]); }) : undefined}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "28px 20px", borderRadius: 2, cursor: canWrite ? "pointer" : "default", border: `2px dashed ${analysisDrag ? T.blue : T.borderDark}`, background: analysisDrag ? T.blueLight : T.bg, transition: "all 0.15s", opacity: canWrite ? 1 : 0.5, pointerEvents: canWrite ? "auto" : "none" }}
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

      {/* === USER MANAGEMENT (owner only) === */}
      {role === "owner" && users.length > 0 && (
        <div style={{ background: T.paper, border: `1px solid ${T.border}`, borderRadius: 2, padding: "22px 24px", marginTop: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <p style={{ ...S.serif, margin: "0 0 4px", fontSize: 18, fontWeight: 600, color: T.ink }}>Gestión de usuarios</p>
              <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: T.inkMuted, margin: 0 }}>Edita los PINs de acceso para cada rol.</p>
            </div>
            <button
              onClick={saveUsers}
              disabled={saveStatus === "saving"}
              style={{
                ...S.label, fontSize: 10, padding: "8px 18px", borderRadius: 2, cursor: saveStatus === "saving" ? "default" : "pointer",
                background: saveStatus === "ok" ? "#F0FDF4" : saveStatus === "error" ? T.redLight : T.goldLight,
                border: `1px solid ${saveStatus === "ok" ? "#86efac" : saveStatus === "error" ? "#fca5a5" : T.goldBorder}`,
                color: saveStatus === "ok" ? T.positive : saveStatus === "error" ? T.red : T.neutral,
                transition: "all 0.2s",
              }}
            >
              {saveStatus === "saving" ? "Guardando…" : saveStatus === "ok" ? "✓ Guardado" : saveStatus === "error" ? "✗ Error" : "Guardar cambios"}
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {users.map((u, idx) => (
              <div key={u.role} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 18px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 2 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...S.label, margin: "0 0 2px", fontSize: 9, color: T.inkFaint }}>{u.role}</p>
                  <p style={{ fontFamily: "'Inter',sans-serif", margin: 0, fontSize: 14, fontWeight: 600, color: T.ink }}>{ROLE_LABELS[u.role] || u.role}</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <label style={{ ...S.label, fontSize: 9, color: T.inkFaint }}>PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={u.pin}
                    onChange={e => handlePinChange(idx, e.target.value)}
                    style={{
                      ...S.mono, fontSize: 16, width: 80, padding: "6px 10px",
                      background: T.paper, border: `1px solid ${T.borderDark}`,
                      borderRadius: 2, color: T.ink, outline: "none",
                      letterSpacing: "0.3em",
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = T.gold; }}
                    onBlur={e => { e.currentTarget.style.borderColor = T.borderDark; }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
