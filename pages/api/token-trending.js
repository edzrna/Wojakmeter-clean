export const config = { runtime: "nodejs" };

/* ===========================================================
   TOKEN TRENDING  (v2)

   EL PROBLEMA: los chips de tendencias salían como "1 ---",
   sin logo ni símbolo, mientras que la tira de "You watched"
   —que usa exactamente el mismo renderizado— funcionaba bien.
   Eso descarta el frontend: el fallo estaba en lo que devolvía
   este endpoint.

   La causa de fondo: los endpoints de "boosts" y "token
   profiles" de DexScreener devuelven la PROMOCIÓN, no el token.
   Traen `tokenAddress` y poco más — sin símbolo, sin nombre,
   sin precio. Hay que resolver cada dirección a su par real
   para tener datos utilizables.

   Esta versión hace ese segundo paso.
   =========================================================== */

const FETCH_TIMEOUT_MS = 7000;
const CACHE_TTL_MS = 120000;

/* Caché de módulo. En serverless cada instancia tiene la suya,
   así que no es una garantía — pero evita machacar la API
   dentro de una misma instancia caliente. El Cache-Control de
   la respuesta hace el trabajo pesado en el CDN. */
let cache = { ts: 0, tokens: [] };

function safeNum(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" }
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/* De todos los pares de un token, el que manda es el de mayor
   liquidez. El primero del array puede ser un par muerto con
   treinta dólares dentro y un precio absurdo. */
function pickBestPair(pairs) {
  if (!Array.isArray(pairs) || !pairs.length) return null;
  return pairs.reduce((best, p) => {
    return safeNum(p?.liquidity?.usd) > safeNum(best?.liquidity?.usd) ? p : best;
  }, pairs[0]);
}

function pairToToken(pair) {
  if (!pair) return null;

  const address = pair?.baseToken?.address;
  if (!address) return null;

  return {
    address,
    symbol: String(pair?.baseToken?.symbol || "").toUpperCase(),
    name: pair?.baseToken?.name || pair?.baseToken?.symbol || "",
    /* info.imageUrl es donde DexScreener guarda el logo. Sin
       este campo los chips salen sin imagen — que era medio
       problema del bug original. */
    image: pair?.info?.imageUrl || "",
    change: safeNum(pair?.priceChange?.h24) || safeNum(pair?.priceChange?.h6) || 0,
    volume: safeNum(pair?.volume?.h24),
    liquidity: safeNum(pair?.liquidity?.usd),
    marketCap: safeNum(pair?.marketCap) || safeNum(pair?.fdv),
    pairAddress: pair?.pairAddress || "",
    dexId: pair?.dexId || ""
  };
}

export default async function handler(req, res) {
  const now = Date.now();

  if (now - cache.ts < CACHE_TTL_MS && cache.tokens.length) {
    res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
    return res.status(200).json({ tokens: cache.tokens, cached: true });
  }

  try {
    /* PASO 1 — candidatos.
       Los boosts son tokens promocionados: es la lista pública
       más cercana a "tendencia" que ofrece DexScreener sin key. */
    const boosts = await fetchJson("https://api.dexscreener.com/token-boosts/top/v1");

    const addresses = (Array.isArray(boosts) ? boosts : [])
      .filter((b) => String(b?.chainId || "").toLowerCase() === "solana")
      .map((b) => b?.tokenAddress)
      .filter(Boolean)
      .slice(0, 24);

    if (!addresses.length) {
      /* Si los boosts fallan, se sirve la caché vieja antes que
         una lista vacía: un chip antiguo informa más que nada. */
      return res.status(200).json({
        tokens: cache.tokens,
        error: "no_boost_candidates"
      });
    }

    /* PASO 2 — resolver cada dirección a su par real.
       DexScreener admite hasta 30 direcciones separadas por
       comas, así que basta una petición. */
    const batch = addresses.slice(0, 30).join(",");
    const data = await fetchJson(
      `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(batch)}`
    );

    const pairs = Array.isArray(data?.pairs) ? data.pairs : [];

    // Agrupar pares por token y quedarse con el más líquido.
    const byToken = new Map();
    pairs.forEach((p) => {
      const addr = p?.baseToken?.address;
      if (!addr) return;
      const current = byToken.get(addr);
      if (!current || safeNum(p?.liquidity?.usd) > safeNum(current?.liquidity?.usd)) {
        byToken.set(addr, p);
      }
    });

    const tokens = [...byToken.values()]
      .map(pairToToken)
      .filter((t) => t && t.symbol)
      /* Filtro de basura: sin liquidez mínima, el precio y el
         cambio no significan nada y el chip mostraría ruido. */
      .filter((t) => t.liquidity >= 5000)
      /* Se ordena por volumen: "trending" debe significar
         "donde está pasando algo", no "quién pagó por promoción". */
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10);

    if (tokens.length) {
      cache = { ts: now, tokens };
    }

    res.setHeader("Cache-Control", "public, s-maxage=120, stale-while-revalidate=600");
    return res.status(200).json({
      tokens: tokens.length ? tokens : cache.tokens,
      count: tokens.length
    });
  } catch (error) {
    console.error("token-trending error:", error?.message);
    return res.status(200).json({
      tokens: cache.tokens,
      error: error?.message || "trending_failed"
    });
  }
}
