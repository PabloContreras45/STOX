import { T, S } from "../theme.js";

export function TutorialCard({ steps, step, onNext, onPrev, onClose, onSkip, tabLabel, hasNextTab }) {
  const current = steps[step];
  const total   = steps.length;
  const isLast  = step === total - 1;
  return (
    <div style={{
      position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
      zIndex: 300, width: "min(440px, calc(100vw - 160px))",
      background: T.ink, border: `1px solid ${T.gold}`,
      borderRadius: 4, boxShadow: "0 8px 40px rgba(0,0,0,0.45)",
      overflow: "hidden",
      animation: "tutSlideUp 0.22s ease",
    }}>
      <style>{`@keyframes tutSlideUp { from { opacity: 0; transform: translateX(-50%) translateY(18px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }`}</style>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderBottom: `1px solid #222`, background: "#111" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ ...S.label, fontSize: 9, color: T.gold }}>{tabLabel}</span>
          <span style={{ ...S.label, fontSize: 9, color: "#333" }}>·</span>
          <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 10, color: "#777", background: "#1a1a1a", border: "1px solid #2a2a2a", padding: "1px 8px", borderRadius: 20 }}>
            📍 {current.section}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ ...S.label, fontSize: 9, color: "#444" }}>{step + 1}/{total}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#555", fontSize: 16, lineHeight: 1, padding: "0 2px" }}>×</button>
        </div>
      </div>
      <div style={{ padding: "16px 18px 12px" }}>
        <p style={{ ...S.serif, margin: "0 0 8px", fontSize: 17, fontWeight: 600, color: T.goldLight }}>{current.title}</p>
        <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#aaa", margin: 0, lineHeight: 1.7 }}>{current.text}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px 14px" }}>
        <div style={{ display: "flex", gap: 5 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ width: i === step ? 16 : 6, height: 6, borderRadius: 3, background: i === step ? T.gold : "#333", transition: "width 0.2s, background 0.2s" }} />
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {step > 0 && (
            <button onClick={onPrev} style={{ ...S.label, fontSize: 9, padding: "5px 12px", borderRadius: 2, background: "transparent", border: `1px solid #333`, color: "#666", cursor: "pointer" }}>
              ← Anterior
            </button>
          )}
          {hasNextTab && (
            <button onClick={onSkip} style={{ ...S.label, fontSize: 9, padding: "5px 12px", borderRadius: 2, background: "transparent", border: `1px solid #2a2a2a`, color: "#555", cursor: "pointer" }}>
              Saltar pestaña ↷
            </button>
          )}
          {!isLast ? (
            <button onClick={onNext} style={{ ...S.label, fontSize: 9, padding: "5px 14px", borderRadius: 2, background: T.gold, border: `1px solid ${T.gold}`, color: T.ink, cursor: "pointer" }}>
              Siguiente →
            </button>
          ) : hasNextTab ? (
            <button onClick={onSkip} style={{ ...S.label, fontSize: 9, padding: "5px 14px", borderRadius: 2, background: T.gold, border: `1px solid ${T.gold}`, color: T.ink, cursor: "pointer" }}>
              Siguiente pestaña →
            </button>
          ) : (
            <button onClick={onClose} style={{ ...S.label, fontSize: 9, padding: "5px 14px", borderRadius: 2, background: T.gold, border: `1px solid ${T.gold}`, color: T.ink, cursor: "pointer" }}>
              ✓ Listo
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
