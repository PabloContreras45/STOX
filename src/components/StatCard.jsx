import { T, S } from "../theme.js";

export function StatCard({ label, value, sub, accent = T.ink, border = T.border }) {
  return (
    <div style={{ background: T.paper, border: `1px solid ${border}`, borderRadius: 2, padding: "16px 20px", flex: "1 1 160px", minWidth: 0 }}>
      <p style={{ ...S.label, margin: "0 0 6px" }}>{label}</p>
      <p style={{ ...S.mono, margin: "0 0 4px", fontSize: 22, fontWeight: 500, color: accent }}>{value}</p>
      {sub && <p style={{ fontFamily: "'Inter',sans-serif", margin: 0, fontSize: 11, color: T.inkMuted }}>{sub}</p>}
    </div>
  );
}
