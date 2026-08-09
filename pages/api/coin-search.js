export const config = { runtime: "nodejs" };

/* ===========================================================
   COIN SEARCH

   El buscador de la bolsa solo encontraba las monedas que ya
   estaban cargadas en la página (top 20, trending, memes) más
   lo que devolviera la búsqueda de tokens de Solana. Quedaban
   fuera miles de monedas listadas: si alguien tenía KAS, TIA o
   RENDER, no podía añadirlas.

   Este endpoint usa la búsqueda de CoinGecko, que cubre el
   catálogo entero, y le añade el precio en una segunda llamada
   —porque /search devuelve nombre e imagen pero NO precio, y
   sin precio la posición no se puede valorar.
   =========================================================== */

const CACHE_TTL_MS = 300000;
const cache = new Map();

function safeNum(n, fallback = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : fallback;
}

async function fetchJson(url, timeoutMs = 7000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json", "User-Agent": "WojakMeter/1.0" },
      signal: controller.signal
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  const query = String(req.query?.q || "").trim();

  if (query.length < 2) {
    return res.status(200).json({ coins: [] });
  }

  const key = query.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");
    return res.status(200).json({ coins: cached.coins, cached: true });
  }

  try {
    const search = await fetchJson(
      `https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`
    );

    const raw = Array.isArray(search?.coins) ? search.coins : [];
    if (!raw.length) {
      return res.status(200).json({ coins: [] });
    }

    /* Se ordenan por ranking de capitalización: quien busca "eth"
       quiere Ethereum, no un token oscuro con "eth" en el nombre.
       Los que no tienen ranking van al final. */
    const ranked = raw
      .slice(0, 40)
      .sort((a, b) => {
        const ra = a.market_cap_rank ?? 99999;
        const rb = b.market_cap_rank ?? 99999;
        return ra - rb;
      })
      .slice(0, 12);

    /* SEGUNDA LLAMADA PARA EL PRECIO.
       /search devuelve nombre, símbolo e imagen pero NO precio.
       Sin precio la posición no se puede valorar, así que el
       resultado sería inútil para la bolsa. */
    const ids = ranked.map((c) => c.id).filter(Boolean).join(",");

    const markets = ids
      ? await fetchJson(
          "https://api.coingecko.com/api/v3/coins/markets" +
          `?vs_currency=usd&ids=${encodeURIComponent(ids)}` +
          "&order=market_cap_desc&per_page=12&page=1&sparkline=false"
        )
      : null;

    const priceById = new Map();
    (Array.isArray(markets) ? markets : []).forEach((m) => {
      priceById.set(m.id, {
        price: safeNum(m.current_price),
        change24h: safeNum(m.price_change_percentage_24h),
        marketCap: safeNum(m.market_cap),
        image: m.image || ""
      });
    });

    const coins = ranked.map((c) => {
      const extra = priceById.get(c.id) || {};
      return {
        id: c.id,
        symbol: String(c.symbol || "").toUpperCase(),
        name: c.name || c.id,
        image: extra.image || c.large || c.thumb || "",
        current_price: extra.price || 0,
        price_change_percentage_24h: extra.change24h || 0,
        market_cap: extra.marketCap || 0,
        rank: c.market_cap_rank ?? null,
        source: "CoinGecko"
      };
    })
    /* Sin precio no sirve para calcular PNL: se descarta en vez
       de ofrecer una opción que luego daría cero. */
    .filter((c) => c.current_price > 0);

    cache.set(key, { ts: Date.now(), coins });

    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");
    return res.status(200).json({ coins, count: coins.length });
  } catch (error) {
    console.error("coin-search error:", error?.message);
    return res.status(200).json({ coins: [], error: "search_failed" });
  }
}
