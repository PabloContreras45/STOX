import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { PinGate } from "./components/PinGate.jsx";

// Patch fetch globally to always include the session token
const _fetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => {
  const token = window.__stoxToken || localStorage.getItem("stox_session_token");
  if (token && typeof input === "string" && input.startsWith("/api/")) {
    init.headers = { ...(init.headers || {}), "X-Session-Token": token };
  }
  return _fetch(input, init);
};

createRoot(document.getElementById("root")).render(
  React.createElement(PinGate, null, React.createElement(App))
);
