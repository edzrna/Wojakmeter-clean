// ===============================
// WOJAKMETER — DESK FORMATTING
// lib/desk/format.js
//
// One place for the mood palette and for how numbers and times are
// written on the desk. Times are shown in UTC: candles, boundaries
// and the freeze are all UTC, and a fixed zone renders the same on
// the server and in the browser.
// ===============================

export const MOOD_COLOR = {
  euphoria: "#4dff88",
  content: "#7cffaa",
  optimism: "#a6ffc4",
  neutral: "#cfd7e3",
  doubt: "#ff9da6",
  concern: "#ff6c79",
  frustration: "#ff3b4d"
};

export const MOOD_LABEL = {
  euphoria: "Euphoria",
  content: "Content",
  optimism: "Optimism",
  neutral: "Neutral",
  doubt: "Doubt",
  concern: "Concern",
  frustration: "Frustration"
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n) => String(n).padStart(2, "0");
const finite = (x) => typeof x === "number" && Number.isFinite(x);

export function fmtTime(ts) {
  if (!finite(ts)) return "—";
  const d = new Date(ts);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

export function fmtWhen(ts) {
  if (!finite(ts)) return "—";
  const d = new Date(ts);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

export function fmtPct(x, digits = 3) {
  return finite(x) ? `${x >= 0 ? "+" : ""}${x.toFixed(digits)}%` : "—";
}

export function fmtP(p) {
  if (!finite(p)) return "—";
  return p < 0.001 ? "<0.001" : p.toFixed(3);
}

export function fmtNum(x, digits = 3) {
  return finite(x) ? x.toFixed(digits) : "—";
}

export function fmtInt(n) {
  return finite(n) ? Math.round(n).toLocaleString("en-US") : "—";
}

export function fmtShare(x) {
  return finite(x) ? `${Math.round(x * 100)}%` : "—";
}

export function moodName(mood) {
  return MOOD_LABEL[mood] || String(mood || "—");
}

export { finite };
