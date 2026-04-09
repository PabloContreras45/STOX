import { useState } from "react";
import { T, S } from "../theme.js";

export function BucketAccordion({ title, accent, accentLight, accentBorder, count, children, defaultOpen = false }) {
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
