const CACHE = global.__WM_CACHE__ || new Map();
const INFLIGHT = global.__WM_INFLIGHT__ || new Map();

if (!global.__WM_CACHE__) global.__WM_CACHE__ = CACHE;
if (!global.__WM_INFLIGHT__) global.__WM_INFLIGHT__ = INFLIGHT;

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";

function getCoinGeckoHeaders() {
  const headers = { accept: "application/json" };
  if (process.env.CG_API_KEY) {
    headers["x-cg-demo-api-key"] = process.env.CG_API_KEY;
  }
  return headers;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchJsonWithRetry(
  url,
  { timeoutMs = 7000, retries = 2, backoffMs = 600, headers = {} } = {}
) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          headers,
          cache: "no-store"
        },
        timeoutMs
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        const err = new Error(`HTTP ${res.status} ${text}`.trim());
        err.status = res.status;
        throw err;
      }

      return await res.json();
    } catch (error) {
      lastError = error;

      const retriable =
        error?.name === "AbortError" ||
        error?.status === 408 ||
        error?.status === 425 ||
        error?.status === 429 ||
        error?.status === 500 ||
        error?.status === 502 ||
        error?.status === 503 ||
        error?.status === 504;

      if (!retriable || attempt === retries) break;

      await sleep(backoffMs * (attempt + 1));
    }
  }

  throw lastError;
}

export async function cachedJson(
  key,
  fetcher,
  { ttlMs = 30000, staleMs = 300000 } = {}
) {
  const now = Date.now();
  const cached = CACHE.get(key);

  if (cached && now - cached.time < ttlMs) {
    return { ok: true, stale: false, cached: true, data: cached.data };
  }

  if (INFLIGHT.has(key)) {
    try {
      const data = await INFLIGHT.get(key);
      return { ok: true, stale: false, cached: false, data };
    } catch (error) {
      if (cached && now - cached.time < staleMs) {
        return {
          ok: true,
          stale: true,
          cached: true,
          data: cached.data,
          error: error.message
        };
      }
      throw error;
    }
  }

  const promise = (async () => {
    const data = await fetcher();
    CACHE.set(key, { data, time: Date.now() });
    return data;
  })();

  INFLIGHT.set(key, promise);

  try {
    const data = await promise;
    return { ok: true, stale: false, cached: false, data };
  } catch (error) {
    if (cached && now - cached.time < staleMs) {
      return {
        ok: true,
        stale: true,
        cached: true,
        data: cached.data,
        error: error.message
      };
    }
    throw error;
  } finally {
    INFLIGHT.delete(key);
  }
}

export function cgUrl(path, params = {}) {
  const qs = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      qs.set(key, String(value));
    }
  });

  return `${COINGECKO_BASE}${path}${qs.toString() ? `?${qs.toString()}` : ""}`;
}

export function cgHeaders() {
  return getCoinGeckoHeaders();
}