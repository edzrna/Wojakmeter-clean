const { classifyHeadline } = require("../../lib/newsMood");

const FEEDS = [
  { name: "CoinDesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { name: "Cointelegraph", url: "https://cointelegraph.com/rss" },
  { name: "Decrypt", url: "https://decrypt.co/feed" }
];

const CACHE_TTL_MS = 120000; // igual a NEWS_REFRESH_MS en el frontend
let cache = { ts: 0, items: [] };

function stripCdata(str) {
  return String(str || "")
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .trim();
}

function decodeEntities(str) {
  return String(str || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/* Parser mínimo por regex. Suficiente para RSS estándar
   <item><title>...</title><link>...</link><pubDate>...</pubDate></item>.
   Si algún feed rompe el patrón, simplemente no aporta items —
   nunca tira el endpoint entero. */
function parseRssItems(xml, sourceName) {
  const items = [];
  const itemBlocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  itemBlocks.forEach((block) => {
    const titleMatch = block.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = block.match(/<link>([\s\S]*?)<\/link>/i);
    const dateMatch = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);

    const headline = decodeEntities(stripCdata(titleMatch?.[1]));
    const url = decodeEntities(stripCdata(linkMatch?.[1]));
    if (!headline || !url) return;

    const ts = dateMatch ? Date.parse(stripCdata(dateMatch[1])) : NaN;

    items.push({
      headline,
      url,
      source: sourceName,
      ts: Number.isFinite(ts) ? ts : Date.now()
    });
  });

  return items;
}

async function fetchFeed(feed) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { "User-Agent": "WojakMeterBot/1.0" }
    });
    clearTimeout(timeout);

    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml, feed.name);
  } catch {
    return [];
  }
}

function dedupeByHeadline(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.headline.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default async function handler(req, res) {
  const now = Date.now();

  if (now - cache.ts < CACHE_TTL_MS && cache.items.length) {
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    return res.status(200).json({ items: cache.items });
  }

  const results = await Promise.all(FEEDS.map(fetchFeed));
  const merged = dedupeByHeadline(results.flat())
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 20)
    .map((item) => {
      const { score, moodKey } = classifyHeadline(item.headline);
      return {
        headline: item.headline,
        url: item.url,
        source: item.source,
        score,
        mood: moodKey
      };
    });

  // Si todos los feeds fallan, se sirve el cache viejo antes que nada.
  if (merged.length) {
    cache = { ts: now, items: merged };
  } else if (cache.items.length) {
    res.setHeader("Cache-Control", "public, s-maxage=60");
    return res.status(200).json({ items: cache.items });
  }

  res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return res.status(200).json({ items: cache.items });
}
