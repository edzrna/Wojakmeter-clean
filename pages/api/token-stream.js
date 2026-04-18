export const config = {
  api: {
    bodyParser: false
  }
};

function sendSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function safeNum(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function parsePumpPortalTrade(payload) {
  if (!payload || typeof payload !== "object") return null;

  const sideText = String(
    payload.txType ||
      payload.side ||
      payload.type ||
      payload.tradeType ||
      payload.eventType ||
      payload.tx_type ||
      payload.action ||
      ""
  ).toLowerCase();

  const side = sideText.includes("sell") ? "sell" : "buy";

  const marketCapUsd =
    safeNum(payload.marketCapUsd, 0) ||
    safeNum(payload.market_cap_usd, 0) ||
    safeNum(payload.usd_market_cap, 0) ||
    safeNum(payload.marketCap, 0) ||
    0;

  const price =
    safeNum(payload.priceUsd, 0) ||
    safeNum(payload.price_usd, 0) ||
    safeNum(payload.price, 0) ||
    safeNum(payload.tokenPrice, 0) ||
    safeNum(payload.usdPrice, 0) ||
    0;

  const tokenAmount =
    safeNum(payload.tokenAmount, 0) ||
    safeNum(payload.amount, 0) ||
    safeNum(payload.baseAmount, 0) ||
    safeNum(payload.tokens, 0) ||
    safeNum(payload.token_quantity, 0) ||
    safeNum(payload.quantity, 0) ||
    0;

  let usdValue =
    safeNum(payload.vUsd, 0) ||
    safeNum(payload.volumeUsd, 0) ||
    safeNum(payload.usdVolume, 0) ||
    safeNum(payload.notionalUsd, 0) ||
    safeNum(payload.totalUsd, 0) ||
    safeNum(payload.amountUsd, 0) ||
    0;

  let resolvedPrice = price;

  if ((!resolvedPrice || resolvedPrice <= 0) && marketCapUsd > 0) {
    resolvedPrice = marketCapUsd / 1000000000;
  }

  if ((!usdValue || usdValue <= 0) && resolvedPrice > 0 && tokenAmount > 0) {
    usdValue = resolvedPrice * tokenAmount;
  }

  if ((!usdValue || usdValue <= 0) && marketCapUsd > 0) {
    usdValue = marketCapUsd * 0.0000025;
  }

  const trader =
    payload.traderPublicKey ||
    payload.wallet ||
    payload.user ||
    payload.owner ||
    payload.maker ||
    payload.trader ||
    payload.publicKey ||
    "";

  if (!resolvedPrice && !usdValue && !marketCapUsd) return null;

  return {
    source: "pumpportal",
    side,
    price: resolvedPrice,
    usdValue,
    tokenAmount,
    trader,
    marketCapUsd,
    ts: Date.now()
  };
}

function parseBirdeyeTrade(payload) {
  if (!payload || typeof payload !== "object") return null;

  const raw =
    payload.data ||
    payload.message ||
    payload;

  const sideText = String(
    raw.side ||
      raw.type ||
      raw.txType ||
      raw.transactionType ||
      raw.eventType ||
      ""
  ).toLowerCase();

  let side = "buy";
  if (sideText.includes("sell")) side = "sell";
  else if (sideText.includes("buy")) side = "buy";

  const price =
    safeNum(raw.priceUsd, 0) ||
    safeNum(raw.price, 0) ||
    safeNum(raw.usdPrice, 0) ||
    0;

  const tokenAmount =
    safeNum(raw.baseAmount, 0) ||
    safeNum(raw.amount, 0) ||
    safeNum(raw.tokenAmount, 0) ||
    safeNum(raw.quantity, 0) ||
    0;

  let usdValue =
    safeNum(raw.amountUsd, 0) ||
    safeNum(raw.volumeUsd, 0) ||
    safeNum(raw.notionalUsd, 0) ||
    safeNum(raw.usdValue, 0) ||
    0;

  if ((!usdValue || usdValue <= 0) && price > 0 && tokenAmount > 0) {
    usdValue = price * tokenAmount;
  }

  const marketCapUsd =
    safeNum(raw.marketCap, 0) ||
    safeNum(raw.marketCapUsd, 0) ||
    0;

  const trader =
    raw.owner ||
    raw.wallet ||
    raw.trader ||
    raw.maker ||
    raw.signer ||
    "";

  if (!price && !usdValue && !marketCapUsd) return null;

  return {
    source: "birdeye",
    side,
    price,
    usdValue,
    tokenAmount,
    trader,
    marketCapUsd,
    ts: Date.now()
  };
}

export default async function handler(req, res) {
  const { address, source = "auto" } = req.query;

  if (!address || typeof address !== "string") {
    return res.status(400).json({ error: "Missing address" });
  }

  const tokenAddress = String(address).trim();
  const sourceValue = String(source || "auto").toLowerCase();
  const birdeyeKey = process.env.BIRDEYE_API_KEY || "";

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no"
  });

  if (typeof res.flushHeaders === "function") {
    res.flushHeaders();
  }

  sendSse(res, "ready", {
    ok: true,
    address: tokenAddress,
    source: sourceValue
  });

  const heartbeat = setInterval(() => {
    sendSse(res, "ping", { ts: Date.now() });
  }, 15000);

  let socket = null;
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    clearInterval(heartbeat);

    try {
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
        socket.close();
      }
    } catch {}

    try {
      res.end();
    } catch {}
  };

  req.on("close", cleanup);

  const usePump =
    sourceValue === "pumpfun" || sourceValue === "pump" || sourceValue === "auto";

  const useBirdeye =
    sourceValue === "dexscreener" ||
    sourceValue === "birdeye" ||
    sourceValue === "auto";

  if (usePump) {
    try {
      const { WebSocket } = await import("ws");

      socket = new WebSocket("wss://pumpportal.fun/api/data");

      socket.onopen = () => {
        sendSse(res, "source", {
          source: "pumpportal",
          live: true
        });

        socket.send(
          JSON.stringify({
            method: "subscribeTokenTrade",
            keys: [tokenAddress]
          })
        );
      };

      socket.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.toString());

          if (Array.isArray(data)) {
            for (const item of data) {
              const parsed = parsePumpPortalTrade(item);
              if (parsed) sendSse(res, "trade", parsed);
            }
            return;
          }

          if (data?.data && Array.isArray(data.data)) {
            for (const item of data.data) {
              const parsed = parsePumpPortalTrade(item);
              if (parsed) sendSse(res, "trade", parsed);
            }
            return;
          }

          const parsed = parsePumpPortalTrade(data?.data || data);
          if (parsed) sendSse(res, "trade", parsed);
        } catch {}
      };

      socket.onerror = () => {};
      socket.onclose = () => {};
      return;
    } catch {}
  }

  if (useBirdeye && birdeyeKey) {
    try {
      const { WebSocket } = await import("ws");

      socket = new WebSocket(
        `wss://public-api.birdeye.so/socket/solana?x-api-key=${encodeURIComponent(birdeyeKey)}`
      );

      socket.onopen = () => {
        sendSse(res, "source", {
          source: "birdeye",
          live: true
        });

        socket.send(
          JSON.stringify({
            type: "SUBSCRIBE_TXS",
            data: {
              address: tokenAddress
            }
          })
        );
      };

      socket.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.toString());

          if (Array.isArray(data)) {
            for (const item of data) {
              const parsed = parseBirdeyeTrade(item);
              if (parsed) sendSse(res, "trade", parsed);
            }
            return;
          }

          const parsed = parseBirdeyeTrade(data);
          if (parsed) sendSse(res, "trade", parsed);
        } catch {}
      };

      socket.onerror = () => {};
      socket.onclose = () => {};
      return;
    } catch {}
  }

  sendSse(res, "fallback", {
    live: false,
    reason: birdeyeKey ? "no_live_source" : "missing_birdeye_key"
  });
}