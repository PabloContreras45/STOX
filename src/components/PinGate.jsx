import { useState, useEffect, createContext, useContext } from "react";
import { T, S } from "../theme.js";

const TOKEN_KEY = "stox_session_token";

export const AuthContext = createContext({ role: null, logout: () => {} });
export const useAuth = () => useContext(AuthContext);

async function verifyPin(pin) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin }),
  });
  const data = await res.json();
  return data.ok ? { token: data.token, role: data.role } : null;
}

async function checkToken(token) {
  const res = await fetch("/api/auth/role", {
    headers: { "X-Session-Token": token },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.ok ? data.role : null;
}

export function PinGate({ children }) {
  const [status,   setStatus]   = useState("checking"); // checking | locked | unlocked
  const [role,     setRole]     = useState(null);
  const [digits,   setDigits]   = useState(["", "", "", ""]);
  const [error,    setError]    = useState(false);
  const [shaking,  setShaking]  = useState(false);
  const [padOpen,  setPadOpen]  = useState(false);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setStatus("locked"); return; }
    checkToken(token).then(r => {
      if (r) { setRole(r); setStatus("unlocked"); }
      else setStatus("locked");
    });
  }, []);

  // Keyboard support
  useEffect(() => {
    if (status !== "locked") return;
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) handleKey(e.key);
      else if (e.key === "Backspace" || e.key === "Delete") handleDelete();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, digits]);

  // Auto-submit when all 4 digits are filled
  useEffect(() => {
    if (digits.every(d => d !== "")) {
      handleSubmit(digits.join(""));
    }
  }, [digits]);

  const handleSubmit = async (pin) => {
    setError(false);
    const result = await verifyPin(pin);
    if (result) {
      localStorage.setItem(TOKEN_KEY, result.token);
      window.__stoxToken = result.token;
      setRole(result.role);
      setStatus("unlocked");
    } else {
      setShaking(true);
      setError(true);
      setDigits(["", "", "", ""]);
      setTimeout(() => setShaking(false), 500);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    window.__stoxToken = null;
    setRole(null);
    setDigits(["", "", "", ""]);
    setError(false);
    setStatus("locked");
  };

  const handleKey = (val) => {
    setError(false);
    setDigits(prev => {
      const next = [...prev];
      const idx = next.findIndex(d => d === "");
      if (idx === -1) return prev;
      next[idx] = val;
      return next;
    });
  };

  const handleDelete = () => {
    setError(false);
    setDigits(prev => {
      const next = [...prev];
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i] !== "") { next[i] = ""; break; }
      }
      return next;
    });
  };

  if (status === "checking") return (
    <div style={{ background: T.ink, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ ...S.mono, color: "#333", fontSize: 13 }}>···</span>
    </div>
  );

  if (status === "unlocked") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) window.__stoxToken = token;
    return (
      <AuthContext.Provider value={{ role, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }

  const filled = digits.filter(d => d !== "").length;

  return (
    <div style={{ background: T.ink, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Inter', sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>

        {/* Logo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <svg width="28" height="26" viewBox="0 0 28 26" fill="none">
            <rect x="0" y="0"  width="28" height="4" fill="#C5973A"/>
            <rect x="0" y="11" width="28" height="4" fill="#C5973A"/>
            <rect x="0" y="22" width="28" height="4" fill="#C5973A"/>
            <rect x="0"  y="4"  width="4" height="7" fill="#C5973A" fillOpacity="0.3"/>
            <rect x="24" y="15" width="4" height="7" fill="#C5973A" fillOpacity="0.3"/>
          </svg>
          <p style={{ fontFamily: "'Bebas Neue', sans-serif", margin: 0, fontSize: 22, color: T.goldLight, letterSpacing: "0.06em", transform: "scaleX(1.4)", transformOrigin: "center" }}>STOX</p>
          <p style={{ ...S.label, margin: 0, color: "#444", fontSize: 9 }}>INTRODUCE TU PIN</p>
        </div>

        {/* PIN dots */}
        <div style={{
          display: "flex", gap: 16,
          animation: shaking ? "pinShake 0.4s ease" : "none",
        }}>
          <style>{`
            @keyframes pinShake {
              0%,100% { transform: translateX(0); }
              20%      { transform: translateX(-8px); }
              40%      { transform: translateX(8px); }
              60%      { transform: translateX(-6px); }
              80%      { transform: translateX(6px); }
            }
          `}</style>
          {digits.map((d, i) => (
            <div key={i} style={{
              width: 18, height: 18, borderRadius: "50%",
              background: d !== "" ? (error ? T.red : T.gold) : "transparent",
              border: `2px solid ${d !== "" ? (error ? T.red : T.gold) : "#333"}`,
              transition: "all 0.15s",
            }} />
          ))}
        </div>

        {error && (
          <p style={{ ...S.label, color: T.red, margin: "-16px 0 0", fontSize: 9 }}>PIN INCORRECTO</p>
        )}

        {/* Numpad toggle */}
        <button
          onClick={() => setPadOpen(o => !o)}
          style={{ background: "transparent", border: "none", color: "#333", fontSize: 11, cursor: "pointer", letterSpacing: "0.06em", fontFamily: "'DM Mono', monospace", padding: "4px 0" }}
        >{padOpen ? "▲ ocultar teclado" : "▼ mostrar teclado"}</button>

        {/* Numpad */}
        {padOpen && <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button
              key={n}
              onClick={() => handleKey(String(n))}
              disabled={filled === 4}
              style={{
                width: 64, height: 64,
                background: "transparent",
                border: `1px solid #222`,
                color: T.goldLight,
                fontFamily: "'DM Mono', monospace",
                fontSize: 20, fontWeight: 500,
                cursor: "pointer",
                transition: "background 0.1s, border-color 0.1s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#1a1a1a"; e.currentTarget.style.borderColor = "#444"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#222"; }}
            >{n}</button>
          ))}
          {/* Row: empty · 0 · delete */}
          <div />
          <button
            onClick={() => handleKey("0")}
            disabled={filled === 4}
            style={{
              width: 64, height: 64,
              background: "transparent", border: `1px solid #222`,
              color: T.goldLight, fontFamily: "'DM Mono', monospace",
              fontSize: 20, fontWeight: 500, cursor: "pointer",
              transition: "background 0.1s, border-color 0.1s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#1a1a1a"; e.currentTarget.style.borderColor = "#444"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "#222"; }}
          >0</button>
          <button
            onClick={handleDelete}
            style={{
              width: 64, height: 64,
              background: "transparent", border: `1px solid #222`,
              color: "#555", fontSize: 18, cursor: "pointer",
              transition: "background 0.1s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "#1a1a1a"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >⌫</button>
        </div>}

      </div>
    </div>
  );
}
