import { useState } from "react";
import { T, S } from "../theme.js";

export function AddMovementModal({ rawTransactions, onSave, onClose }) {
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

  const knownCompanies  = [...new Set(rawTransactions.map(t => t.Company).filter(Boolean))];
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
        <div style={{ padding: "18px 24px 14px", borderBottom: "1px solid #1a1a1a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ ...S.serif, margin: 0, fontSize: 18, fontWeight: 600, color: T.goldLight }}>Añadir movimiento</p>
            <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: "#555", margin: "2px 0 0" }}>Se guardará directamente en tu CSV</p>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#555", fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
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
