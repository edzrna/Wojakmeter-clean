// ===============================
// WOJAKMETER — DESK CLIENT (browser)
// lib/desk/client.js
//
//   deskCall("lab-report", { model: "linear" })
//
// Calls the proxy and always resolves to an object with `ok`. A
// failure carries `error` (the reason, in words) and `httpStatus`, so
// a panel can say "session expired" instead of going blank. Only an
// aborted request rejects, so callers can drop stale answers.
// ===============================

export async function deskCall(action, params = {}, { signal } = {}) {
  const search = new URLSearchParams({ action });
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) search.set(key, String(value));
  }

  let res;
  try {
    res = await fetch(`/api/desk/bot?${search}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal
    });
  } catch (err) {
    if (err && err.name === "AbortError") throw err;
    return { ok: false, httpStatus: 0, error: `Network error: ${err?.message || err}` };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = { ok: false, error: `HTTP ${res.status} without JSON` };
  }

  if (!data || typeof data !== "object") data = { ok: false, error: "Empty answer" };
  if (!res.ok && data.ok !== false) data = { ...data, ok: false, error: data.error || `HTTP ${res.status}` };

  return { ...data, httpStatus: res.status };
}
