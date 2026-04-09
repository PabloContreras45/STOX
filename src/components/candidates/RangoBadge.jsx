export function RangoBadge({ rango }) {
  if (!rango?.bajada_max && !rango?.subida_max) return null;
  return (
    <span style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
      {rango?.subida_max && (
        <span title="Subida máxima estimada (bull case)" style={{
          fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 500,
          background: "#F0FDF4", color: "#15803D",
          border: "1px solid #86efac",
          padding: "2px 8px", borderRadius: 20,
        }}>{rango.subida_max}</span>
      )}
      {rango?.bajada_max && (
        <span title="Bajada máxima estimada (bear case)" style={{
          fontFamily: "'DM Mono',monospace", fontSize: 10, fontWeight: 500,
          background: "#FEF2F2", color: "#DC2626",
          border: "1px solid #FECACA",
          padding: "2px 8px", borderRadius: 20,
        }}>{rango.bajada_max}</span>
      )}
    </span>
  );
}
