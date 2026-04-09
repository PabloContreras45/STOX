import { useState } from "react";
import { T, S } from "../theme.js";

export function EstCell({ val }) {
  if (val === null || val === undefined) return <span style={{ ...S.mono, fontSize: 12, color: T.inkFaint }}>—</span>;
  const pos = val >= 0;
  return <span style={{ ...S.mono, fontSize: 12, fontWeight: 500, color: pos ? "#15803D" : "#DC2626" }}>{pos ? "+" : ""}{val}%</span>;
}

export function RiskAccordion({ title, count, children, defaultOpen }) {
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

export function BucketRiskAccordion({ bucket, count, accent, accentLight, accentBorder, children }) {
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
