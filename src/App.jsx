import { useState, useCallback, useRef, useEffect } from "react";

import { useAuth } from "./components/PinGate.jsx";
import { T, S } from "./theme.js";
import { I18N, DEMO_TRANSACTIONS, DEMO_HISTORY, TUTORIAL_STEPS, TUTORIAL_TAB_ORDER } from "./constants.js";
import { parseCSV, aggregateTransactions, parseAmount } from "./utils/csv.js";
import { parseRangePct, parsePotencial } from "./utils/analysis.js";
import { fmt, readFileAsText } from "./utils/format.js";

import { useConfig } from "./hooks/useConfig.js";
import { useDCAPlan } from "./hooks/useDCAPlan.js";

import { AddMovementModal } from "./components/AddMovementModal.jsx";
import { TutorialCard } from "./components/TutorialCard.jsx";

import { TabInicio } from "./tabs/TabInicio.jsx";
import { TabEvolucion } from "./tabs/TabEvolucion.jsx";
import { TabPortfolio } from "./tabs/TabPortfolio.jsx";
import { TabCandidates } from "./tabs/TabCandidates.jsx";
import { TabMovimientos } from "./tabs/TabMovimientos.jsx";
import { TabAnalisis } from "./tabs/TabAnalisis.jsx";
import { TabConfig } from "./tabs/TabConfig.jsx";

/* --- Fonts ---------------------------------------------------------------- */
const FONT_LINK = document.createElement("link");
FONT_LINK.rel = "stylesheet";
FONT_LINK.href = "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Mono:wght@400;500&family=Inter:wght@300;400;500;600;800;900&display=swap";
document.head.appendChild(FONT_LINK);

const ANIM_STYLE = document.createElement("style");
ANIM_STYLE.textContent = `@keyframes tabFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`;
document.head.appendChild(ANIM_STYLE);

export default function App() {
  const { role, logout } = useAuth();
  const [tab,              setTab]              = useState("proyecto");
  const [planOpen,         setPlanOpen]         = useState(false);
  const [positions,        setPositions]        = useState(() => aggregateTransactions(DEMO_TRANSACTIONS));
  const [rawTransactions,  setRawTransactions]  = useState(DEMO_TRANSACTIONS);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState("");
  const [isDemo,           setIsDemo]           = useState(true);
  const [fileName,         setFileName]         = useState("");
  const [desiredInvestment,setDesiredInvestment]= useState(5000);
  const [desiredReturn,    setDesiredReturn]    = useState(15);
  const [desiredSplit,     setDesiredSplit]     = useState({ Core: 50, Satellite: 25, Wildshots: 25 });
  const [investmentMode,   setInvestmentMode]   = useState("periodica");
  const [lang,             setLang]             = useState("es");
  const tx = I18N[lang];
  const [periodicity,      setPeriodicity]      = useState("mensual");
  const [periodicAmount,   setPeriodicAmount]   = useState(417);
  const [analysis,         setAnalysis]         = useState({});
  const [analysisFile,     setAnalysisFile]     = useState("");
  const [analysisDrag,     setAnalysisDrag]     = useState(false);
  const jsonInputRef = useRef(null);
  const [analysisError,    setAnalysisError]    = useState("");
  const [csvDragOver,      setCsvDragOver]      = useState(false);
  const [eventoInput,      setEventoInput]      = useState("");
  const [sectoresInput,    setSectoresInput]    = useState("Déjalo en tu criterio");
  const csvInputRef = useRef(null);
  const [showAddMovement,  setShowAddMovement]  = useState(false);
  const [movementSaved,    setMovementSaved]    = useState(false);
  const [tutorialActive,   setTutorialActive]   = useState(false);
  const [tutorialStep,     setTutorialStep]     = useState(0);
  const [snapshotState,    setSnapshotState]    = useState("idle");
  const [snapshotError,    setSnapshotError]    = useState("");

  /* --- Config hook -------------------------------------------------------- */
  useConfig({
    investmentMode, setInvestmentMode,
    periodicity,    setPeriodicity,
    periodicAmount, setPeriodicAmount,
    desiredInvestment, setDesiredInvestment,
    desiredSplit,   setDesiredSplit,
    desiredReturn,  setDesiredReturn,
    lang,           setLang,
  });

  /* --- Derived investment values ----------------------------------------- */
  const annualInvestment = investmentMode === "puntual"
    ? 0
    : periodicity === "mensual" ? periodicAmount * 12 : periodicAmount * 4;
  const monthlyContribDerived = investmentMode === "puntual" ? 0
    : periodicity === "mensual" ? periodicAmount
    : Math.round(periodicAmount / 3);

  const _now = new Date();
  const _currentQuarter = Math.floor(_now.getMonth() / 3);
  const _qStartYear  = _now.getFullYear();

  const investedThisQuarter = (() => {
    if (investmentMode !== "periodica" || periodicity !== "trimestral") return 0;
    return rawTransactions.reduce((sum, r) => {
      const action = (r.Action || r.action || "").trim().toLowerCase();
      if (action !== "buy") return sum;
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

  const dcaBudget = (() => {
    if (investmentMode === "puntual") return desiredInvestment > 0 ? desiredInvestment : 0;
    if (periodicity === "trimestral") return Math.max(0, periodicAmount - investedThisQuarter);
    return monthlyContribDerived > 0 ? monthlyContribDerived : 500;
  })();
  const DCA_MIN = dcaBudget >= 300 ? 150 : 75;

  /* --- File handlers ------------------------------------------------------ */
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

  const loadAnalysisFromAPI = useCallback(async () => {
    try {
      const res = await fetch("/api/analysis");
      if (!res.ok) return;
      const text = await res.text();
      const parsed = JSON.parse(text);
      if (typeof parsed !== "object" || Array.isArray(parsed)) return;
      const filename = res.headers.get("X-JSON-Filename") || "analysis.json";
      setAnalysis(parsed);
      setAnalysisFile(filename);
    } catch (_) {}
  }, []);

  useEffect(() => {
    loadFromAPI();
    loadAnalysisFromAPI();
  }, []);

  useEffect(() => { setTutorialStep(0); }, [tab]);

  useEffect(() => {
    if (role === "restricted" && tab === "evolucion") setTab("proyecto");
  }, [role, tab]);

  useEffect(() => {
    const prev = document.querySelector('[data-tut-active]');
    if (prev) {
      prev.removeAttribute('data-tut-active');
      prev.style.outline = '';
      prev.style.outlineOffset = '';
      prev.style.transition = '';
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
      el.style.outline = '';
      el.style.outlineOffset = '';
      el.style.transition = '';
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

  const handleDrop        = useCallback((e) => { e.preventDefault(); setCsvDragOver(false); handleFile(e.dataTransfer.files[0]); }, [handleFile]);
  const handleInputChange = useCallback((e) => handleFile(e.target.files[0]), [handleFile]);
  const handleCSVOpen     = useCallback(() => csvInputRef.current?.click(), []);

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

  const clearFile = useCallback(() => {
    setPositions(aggregateTransactions(DEMO_TRANSACTIONS));
    setRawTransactions(DEMO_TRANSACTIONS);
    setIsDemo(true); setFileName(""); setError("");
  }, []);

  const handleSplitChange = useCallback((bucket, value) => {
    if (bucket === "__preset__") { setDesiredSplit(value); return; }
    setDesiredSplit(prev => {
      const clamped = Math.max(0, Math.min(100, value));
      const others = Object.keys(prev).filter(k => k !== bucket);
      const othersSum = others.reduce((s, k) => s + prev[k], 0);
      const remaining = 100 - clamped;
      const newSplit = { ...prev, [bucket]: clamped };
      if (othersSum > 0) {
        const shares = others.map(k => Math.floor(remaining * prev[k] / othersSum));
        const distributed = shares.reduce((s, v) => s + v, 0);
        const leftover = remaining - distributed;
        others.forEach((k, i) => { newSplit[k] = Math.max(0, shares[i] + (i === others.length - 1 ? leftover : 0)); });
      } else {
        const each = Math.floor(remaining / others.length);
        const leftover = remaining - each * others.length;
        others.forEach((k, i) => { newSplit[k] = each + (i === 0 ? leftover : 0); });
      }
      return newSplit;
    });
  }, []);

  /* --- Derived stats ------------------------------------------------------ */
  const totalInvertido = positions.reduce((s, p) => s + p.Invertido, 0);
  const splitTotal = Object.values(desiredSplit).reduce((s, v) => s + v, 0);
  const normalizedSplit = splitTotal === 100
    ? desiredSplit
    : { Core: desiredSplit.Core / splitTotal * 100, Satellite: desiredSplit.Satellite / splitTotal * 100, Wildshots: desiredSplit.Wildshots / splitTotal * 100 };

  const potencialEntries = positions.map(p => {
    const a = analysis[p.Ticker];
    const pct = a ? parsePotencial(a.potencial) : null;
    return { ticker: p.Ticker, inv: p.Invertido, pct };
  }).filter(e => e.pct !== null && !isNaN(e.pct) && e.inv > 0);
  const coveredInv = potencialEntries.reduce((s, e) => s + e.inv, 0);
  const potentialReturn = coveredInv > 0
    ? (() => { const v = potencialEntries.reduce((s, e) => s + e.pct * (e.inv / coveredInv), 0); return isNaN(v) ? null : v.toFixed(1); })()
    : null;
  const potentialCoverage = totalInvertido > 0 ? Math.round(coveredInv / totalInvertido * 100) : 0;

  const portfolioTarget = (investmentMode === "puntual" && totalInvertido > 0)
    ? totalInvertido + (desiredInvestment || 0)
    : (desiredInvestment || 0);

  const byBucket = ["Core", "Satellite", "Wildshots"].map(b => {
    const stocks    = positions.filter(p => p.Bucket === b);
    const inv       = stocks.reduce((s, p) => s + p.Invertido, 0);
    const realPct   = totalInvertido > 0 ? inv / totalInvertido : 0;
    const targetPct = (normalizedSplit[b] || 0) / 100;
    const targetAmt = portfolioTarget * (normalizedSplit[b] || 0) / 100;
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
    Real: +(b.realPct * 100).toFixed(1),
    [tx.target]: +(b.targetPct * 100).toFixed(1),
  }));

  const blendedPotPct  = potentialReturn ? parseFloat(potentialReturn) : 15;
  const monthlyGrowth  = (blendedPotPct / 100) / 12;
  const monthlyContrib = monthlyContribDerived;
  const monthNames     = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  const evoData = (() => {
    const now = new Date();
    const nowYear  = now.getFullYear();
    const nowMonth = now.getMonth();
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

    if (!parsedTx.length) {
      return Array.from({ length: Math.max(1, 12 - nowMonth) }, (_, i) => ({
        Fecha: monthNames[nowMonth + i],
        "Capital invertido": +(totalInvertido + monthlyContrib * i).toFixed(0),
      }));
    }

    const firstDate     = parsedTx[0].date;
    const firstYear     = firstDate.getFullYear();
    const firstMonthIdx = firstDate.getMonth();
    const monthlyDelta  = {};
    parsedTx.forEach(({ date, delta }) => {
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      monthlyDelta[key] = (monthlyDelta[key] || 0) + delta;
    });

    const histMonths = (nowYear - firstYear) * 12 + (nowMonth - firstMonthIdx) + 1;
    let cumulative = 0;
    const histPoints = Array.from({ length: histMonths }, (_, i) => {
      const absMonth = firstMonthIdx + i;
      const year  = firstYear + Math.floor(absMonth / 12);
      const month = absMonth % 12;
      cumulative += monthlyDelta[`${year}-${month}`] || 0;
      return { Fecha: `${monthNames[month]} ${String(year).slice(2)}`, "Capital invertido": +cumulative.toFixed(0) };
    });

    const projCount = Math.min(6, 12);
    const futurePoints = Array.from({ length: projCount }, (_, i) => {
      const absMonth = firstMonthIdx + histMonths + i;
      const year  = firstYear + Math.floor(absMonth / 12);
      const month = absMonth % 12;
      let proyeccion = cumulative;
      for (let m = 0; m <= i; m++) proyeccion = proyeccion * (1 + monthlyGrowth) + monthlyContrib;
      return { Fecha: `${monthNames[month]} ${String(year).slice(2)}`, "Proyección": +proyeccion.toFixed(0) };
    });

    return [...histPoints, ...futurePoints];
  })();

  const candidatesByBucket = (() => {
    const acc = { Core: [], Satellite: [], Wildshots: [] };
    Object.entries(analysis)
      .filter(([k]) => !k.startsWith("_"))
      .forEach(([ticker, d]) => { if (d.bucket && acc[d.bucket]) acc[d.bucket].push({ ticker, ...d }); });
    acc.Core.sort((a, b) => (b.weight || 0) - (a.weight || 0));
    acc.Satellite.sort((a, b) => (a.priority || 99) - (b.priority || 99));
    acc.Wildshots.sort((a, b) => (b.conviction || 0) - (a.conviction || 0));
    return acc;
  })();

  const coreTargetTotal = portfolioTarget * (normalizedSplit.Core      || 0) / 100;
  const satTargetTotal  = portfolioTarget * (normalizedSplit.Satellite || 0) / 100;
  const wsTargetTotal   = portfolioTarget * (normalizedSplit.Wildshots || 0) / 100;
  const coreWeightTotal   = candidatesByBucket.Core.reduce((s, c) => s + (c.weight || 1), 0) || 1;
  const wsConvictionTotal = candidatesByBucket.Wildshots.reduce((s, c) => s + (c.conviction || 1), 0) || 1;
  const satCount          = candidatesByBucket.Satellite.length || 1;

  const getCoreTarget = (c) => coreTargetTotal > 0 ? coreTargetTotal * (c.weight || 1) / coreWeightTotal : 0;
  const getSatTarget  = ()  => satTargetTotal  > 0 ? satTargetTotal  / satCount : 0;
  const getWsTarget   = (c) => wsTargetTotal   > 0 ? wsTargetTotal   * (c.conviction || 1) / wsConvictionTotal : 0;
  const getInvested   = (ticker) => { const pos = positions.find(p => p.Ticker === ticker); return pos ? pos.Invertido : 0; };

  /* --- DCA hook ----------------------------------------------------------- */
  const { dcaPlan } = useDCAPlan({
    positions, analysis, byBucket, normalizedSplit,
    candidatesByBucket, dcaBudget, DCA_MIN,
    investmentMode, totalInvertido, desiredInvestment,
  });

  const dcaActionable   = dcaPlan.recommendations.filter(r => !r.accumulate && r.amount > 0);
  const dcaToAccumulate = dcaPlan.recommendations.filter(r => r.accumulate);
  const nextMove = (() => {
    const actionable = dcaPlan.recommendations.filter(r => !r.accumulate && r.amount >= DCA_MIN);
    if (!actionable.length) return null;
    return actionable.sort((a, b) => (b.deficit / b.target) - (a.deficit / a.target))[0];
  })();

  /* --- Render ------------------------------------------------------------- */
  return (
    <div style={{ background: T.bg, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>

      {/* TOP BAR */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: T.ink, padding: "12px 28px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg width="28" height="26" viewBox="0 0 28 26" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0"  width="28" height="4" fill="#C5973A"/>
              <rect x="0" y="11" width="28" height="4" fill="#C5973A"/>
              <rect x="0" y="22" width="28" height="4" fill="#C5973A"/>
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
          <button
            onClick={() => setLang(l => l === "es" ? "en" : "es")}
            style={{ ...S.label, fontSize: 10, background: "transparent", color: lang === "en" ? T.gold : "#555", border: `1px solid ${lang === "en" ? T.gold : "#333"}`, borderRadius: 20, padding: "4px 12px", cursor: "pointer", letterSpacing: "0.08em", transition: "all 0.15s" }}
          >{lang === "es" ? "EN" : "ES"}</button>
          <span style={{ ...S.label, fontSize: 9, padding: "4px 10px", borderRadius: 20, border: `1px solid ${role === "owner" ? T.gold : role === "viewer" ? "#444" : "#333"}`, color: role === "owner" ? T.gold : role === "viewer" ? "#888" : "#555", letterSpacing: "0.08em" }}>
            {role === "owner" ? "SUPERADMIN" : role === "viewer" ? "FULL VIEW" : "VIEW"}
          </span>
          <button
            onClick={logout}
            title="Cerrar sesión"
            style={{ ...S.label, fontSize: 10, background: "transparent", color: "#555", border: "1px solid #333", borderRadius: 20, padding: "4px 12px", cursor: "pointer", letterSpacing: "0.08em", transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.color = T.red; e.currentTarget.style.borderColor = T.red; }}
            onMouseLeave={e => { e.currentTarget.style.color = "#555"; e.currentTarget.style.borderColor = "#333"; }}
          >⏻</button>
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
        ].filter(t => !(t.id === "evolucion" && role === "restricted")).map(t => (
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

      {/* TAB CONTENT */}
      <div key={tab} style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 32px", animation: "tabFadeIn 0.45s ease" }}>
        {tab === "proyecto"     && <TabInicio
          positions={positions} desiredInvestment={desiredInvestment} setDesiredInvestment={setDesiredInvestment}
          desiredReturn={desiredReturn} desiredSplit={desiredSplit} handleSplitChange={handleSplitChange}
          investmentMode={investmentMode} setInvestmentMode={setInvestmentMode}
          periodicity={periodicity} setPeriodicity={setPeriodicity}
          periodicAmount={periodicAmount} setPeriodicAmount={setPeriodicAmount}
          annualInvestment={annualInvestment} normalizedSplit={normalizedSplit}
          eventoInput={eventoInput} setEventoInput={setEventoInput}
          sectoresInput={sectoresInput} setSectoresInput={setSectoresInput}
          tx={tx} lang={lang} setTab={setTab} role={role}
        />}
        {tab === "evolucion"    && <TabEvolucion
          totalInvertido={totalInvertido} investmentMode={investmentMode}
          periodicity={periodicity} annualInvestment={annualInvestment}
          desiredInvestment={desiredInvestment} potentialReturn={potentialReturn}
          potentialCoverage={potentialCoverage} totalPotEuros={totalPotEuros}
          expectedFinal={expectedFinal} analysis={analysis} positions={positions}
          evoData={evoData} lang={lang} tx={tx}
        />}
        {tab === "distribucion" && <TabPortfolio
          positions={positions} analysis={analysis} totalInvertido={totalInvertido}
          potentialReturn={potentialReturn} totalPotEuros={totalPotEuros}
          expectedFinal={expectedFinal} byBucket={byBucket}
          desiredSplit={desiredSplit} desiredInvestment={desiredInvestment}
          distData={distData} lang={lang} tx={tx} setTab={setTab} role={role}
        />}
        {tab === "candidates"   && <TabCandidates
          analysis={analysis} desiredInvestment={desiredInvestment}
          desiredSplit={desiredSplit} normalizedSplit={normalizedSplit}
          candidatesByBucket={candidatesByBucket}
          getInvested={getInvested} getCoreTarget={getCoreTarget}
          getSatTarget={getSatTarget} getWsTarget={getWsTarget}
          tx={tx} setTab={setTab}
        />}
        {tab === "movimientos"  && <TabMovimientos
          positions={positions} analysis={analysis} byBucket={byBucket}
          candidatesByBucket={candidatesByBucket} desiredInvestment={desiredInvestment}
          investmentMode={investmentMode} periodicity={periodicity}
          periodicAmount={periodicAmount} annualInvestment={annualInvestment}
          normalizedSplit={normalizedSplit} dcaBudget={dcaBudget}
          dcaPlan={dcaPlan} dcaActionable={dcaActionable} dcaToAccumulate={dcaToAccumulate}
          nextMove={nextMove} planOpen={planOpen} setPlanOpen={setPlanOpen}
          coreTargetTotal={coreTargetTotal} satTargetTotal={satTargetTotal} wsTargetTotal={wsTargetTotal}
          investedThisQuarter={investedThisQuarter} tx={tx} setTab={setTab} role={role}
        />}
        {tab === "analisis"     && <TabAnalisis
          positions={positions} analysis={analysis} analysisFile={analysisFile}
          candidatesByBucket={candidatesByBucket}
          snapshotState={snapshotState} snapshotError={snapshotError}
          setSnapshotState={setSnapshotState} setSnapshotError={setSnapshotError}
          tx={tx} setTab={setTab} role={role}
        />}
        {tab === "config"       && <TabConfig
          isDemo={isDemo} positions={positions} analysis={analysis}
          analysisFile={analysisFile} fileName={fileName} activeBuckets={activeBuckets}
          loading={loading} error={error} analysisError={analysisError}
          csvDragOver={csvDragOver} setCsvDragOver={setCsvDragOver}
          analysisDrag={analysisDrag} setAnalysisDrag={setAnalysisDrag}
          csvInputRef={csvInputRef} jsonInputRef={jsonInputRef}
          handleCSVOpen={handleCSVOpen} handleFile={handleFile}
          handleInputChange={handleInputChange} handleAnalysisFile={handleAnalysisFile}
          clearFile={clearFile} setAnalysis={setAnalysis}
          setAnalysisFile={setAnalysisFile} setAnalysisError={setAnalysisError}
          lang={lang} tx={tx} role={role}
        />}
      </div>

      {/* FAB — añadir movimiento */}
      {showAddMovement && (
        <AddMovementModal
          rawTransactions={rawTransactions}
          onSave={async (row) => { await addMovement(row); setShowAddMovement(false); }}
          onClose={() => setShowAddMovement(false)}
          saved={movementSaved}
        />
      )}
      {!isDemo && role === "owner" && (
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
        >+</button>
      )}

      {/* Tutorial */}
      {(() => {
        const tutSteps = TUTORIAL_STEPS[tab] || [];
        const TAB_LABELS = { proyecto: "Inicio", evolucion: "Evolución", distribucion: "Mi Portfolio", candidates: "Candidates", movimientos: "Movimientos", analisis: "Análisis", config: "Configuración" };
        const tabLabel = TAB_LABELS[tab] || tab;
        const tabIdx   = TUTORIAL_TAB_ORDER.indexOf(tab);
        const nextTab  = TUTORIAL_TAB_ORDER[tabIdx + 1] || null;
        const handleSkip = () => { if (nextTab) { setTab(nextTab); setTutorialStep(0); } else { setTutorialActive(false); } };
        return (
          <>
            <button
              onClick={() => { if (tutorialActive) { setTutorialActive(false); } else { setTutorialStep(0); setTutorialActive(true); } }}
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
            {tutorialActive && tutSteps.length > 0 && (
              <TutorialCard
                steps={tutSteps} step={tutorialStep}
                tabLabel={tabLabel} hasNextTab={!!nextTab}
                onNext={() => setTutorialStep(s => Math.min(s + 1, tutSteps.length - 1))}
                onPrev={() => setTutorialStep(s => Math.max(s - 1, 0))}
                onSkip={handleSkip}
                onClose={() => setTutorialActive(false)}
              />
            )}
          </>
        );
      })()}
    </div>
  );
}
