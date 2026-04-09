import { T } from "../../theme.js";

export function ConvictionDots({ value, max = 5 }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center" }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: i < value ? T.gold : T.border,
          border: `1px solid ${i < value ? T.goldBorder : T.borderDark}`,
        }} />
      ))}
    </div>
  );
}
