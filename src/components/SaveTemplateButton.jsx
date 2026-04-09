import { useState } from "react";
import { S } from "../theme.js";

export function SaveTemplateButton({ filename, content, color, border, textColor, label: idleLabel = "↓ Descargar plantilla" }) {
  const [state, setState] = useState("idle"); // idle | saving | ok | error

  const handleSave = async () => {
    setState("saving");
    try {
      const res = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, content }),
      });
      if (!res.ok) throw new Error("Error del servidor");
      setState("ok");
      setTimeout(() => setState("idle"), 2500);
    } catch {
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  };

  const label = state === "saving" ? "Guardando…" : state === "ok" ? "✓ Guardado" : state === "error" ? "✗ Error" : idleLabel;
  const bg    = state === "ok" ? "#F0FDF4" : state === "error" ? "#FEF2F2" : "white";
  const bd    = state === "ok" ? "#86efac" : state === "error" ? "#FECACA" : border;
  const tc    = state === "ok" ? "#15803D" : state === "error" ? "#DC2626" : textColor;

  return (
    <button
      onClick={handleSave}
      disabled={state === "saving"}
      style={{ ...S.label, fontSize: 9, padding: "3px 10px", borderRadius: 2, background: bg, border: `1px solid ${bd}`, color: tc, cursor: state === "saving" ? "default" : "pointer", transition: "all 0.2s" }}
    >{label}</button>
  );
}
