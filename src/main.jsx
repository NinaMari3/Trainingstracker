import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

// Ersatz für Claudes window.storage: speichert lokal im Browser des Geräts
window.storage = {
  async get(key) {
    const v = localStorage.getItem(key);
    if (v === null) throw new Error("not found");
    return { key, value: v, shared: false };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value, shared: false };
  },
  async delete(key) {
    localStorage.removeItem(key);
    return { key, deleted: true, shared: false };
  },
  async list(prefix = "") {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(prefix));
    return { keys, prefix, shared: false };
  },
};

createRoot(document.getElementById("root")).render(<App />);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
