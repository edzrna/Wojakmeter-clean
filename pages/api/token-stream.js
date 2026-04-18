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

  const raw = payload.data || payload.message || payload;

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

async function openPumpPortalStream({ tokenAddress, res, isClosed }) {
  const { WebSocket } = await import("ws");

  return await new Promise((resolve) => {
    let settled = false;
    let socket = null;
    let openTimer = null;
    let inactivityTimer = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;

      clearTimeout(openTimer);
      clearTimeout(inactivityTimer);

      resolve(result);
    };

    const resetInactivity = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        try {
          socket?.close();
        } catch {}
        finish({ ok: false, reason: "pumpportal_inactive" });
      }, 12000);
    };

    try {
      socket = new WebSocket("wss://pumpportal.fun/api/data");

      openTimer = setTimeout(() => {
        try {
          socket?.close();
        } catch {}
        finish({ ok: false, reason: "pumpportal_timeout" });
      }, 7000);

      socket.onopen = () => {
        if (isClosed()) {
          try {
            socket.close();
          } catch {}
          return finish({ ok: false, reason: "client_closed" });
        }

        sendSse(res, "source", {
          source: "pumpportal",
          live: true
        });

        try {
          socket.send(
            JSON.stringify({
              method: "subscribeTokenTrade",
              keys: [tokenAddress]
            })
          );
        } catch {}

        resetInactivity();
      };

      socket.onmessage = (msg) => {
        if (isClosed()) {
          try {
            socket.close();
          } catch {}
          return finish({ ok: false, reason: "client_closed" });
        }

        resetInactivity();

        try {
          const data = JSON.parse(msg.toString());

          let emitted = false;

          if (Array.isArray(data)) {
            for (const item of data) {
              const parsed = parsePumpPortalTrade(item);
              if (parsed) {
                sendSse(res, "trade", parsed);
                emitted = true;
              }
            }
          } else if (data?.data && Array.isArray(data.data)) {
            for (const item of data.data) {
              const parsed = parsePumpPortalTrade(item);
              if (parsed) {
                sendSse(res, "trade", parsed);
                emitted = true;
              }
            }
          } else {
            const parsed = parsePumpPortalTrade(data?.data || data);
            if (parsed) {
              sendSse(res, "trade", parsed);
              emitted = true;
            }
          }

          if (emitted) {
            finish({
              ok: true,
              socket,
              provider: "pumpportal"
            });
          }
        } catch {}
      };

      socket.onerror = () => {
        try {
          socket?.close();
        } catch {}
      };

      socket.onclose = () => {
        finish({ ok: false, reason: "pumpportal_closed" });
      };
    } catch {
      finish({ ok: false, reason: "pumpportal_exception" });
    }
  });
}

async function openBirdeyeStream({ tokenAddress, res, isClosed, birdeyeKey }) {
  const { WebSocket } = await import("ws");

  return await new Promise((resolve) => {
    let settled = false;
    let socket = null;
    let openTimer = null;
    let inactivityTimer = null;

    const finish = (result) => {
      if (settled) return;
      settled = true;

      clearTimeout(openTimer);
      clearTimeout(inactivityTimer);

      resolve(result);
    };

    const resetInactivity = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        try {
          socket?.close();
        } catch {}
        finish({ ok: false, reason: "birdeye_inactive" });
      }, 15000);
    };

    try {
      socket = new WebSocket(
        `wss://public-api.birdeye.so/socket/solana?x-api-key=${encodeURIComponent(birdeyeKey)}`
      );

      openTimer = setTimeout(() => {
        try {
          socket?.close();
        } catch {}
        finish({ ok: false, reason: "birdeye_timeout" });
      }, 8000);

      socket.onopen = () => {
        if (isClosed()) {
          try {
            socket.close();
          } catch {}
          return finish({ ok: false, reason: "client_closed" });
        }

        sendSse(res, "source", {
          source: "birdeye",
          live: true
        });

        try {
          socket.send(
            JSON.stringify({
              type: "SUBSCRIBE_TXS",
              data: {
                address: tokenAddress
              }
            })
          );
        } catch {}

        resetInactivity();
      };

      socket.onmessage = (msg) => {
        if (isClosed()) {
          try {
            socket.close();
          } catch {}
          return finish({ ok: false, reason: "client_closed" });
        }

        resetInactivity();

        try {
          const data = JSON.parse(msg.toString());

          let emitted = false;

          if (Array.isArray(data)) {
            for (const item of data) {
              const parsed = parseBirdeyeTrade(item);
              if (parsed) {
                sendSse(res, "trade", parsed);
                emitted = true;
              }
            }
          } else {
            const parsed = parseBirdeyeTrade(data);
            if (parsed) {
              sendSse(res, "trade", parsed);
              emitted = true;
            }
          }

          if (emitted) {
            finish({
              ok: true,
              socket,
              provider: "birdeye"
            });
          }
        } catch {}
      };

      socket.onerror = () => {
        try {
          socket?.close();
        } catch {}
      };

      socket.onclose = () => {
        finish({ ok: false, reason: "birdeye_closed" });
      };
    } catch {
      finish({ ok: false, reason: "birdeye_exception" });
    }
  });
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

  let closed = false;
  let activeSocket = null;

  const heartbeat = setInterval(() => {
    if (closed) return;
    sendSse(res, "ping", { ts: Date.now() });
  }, 15000);

  const cleanup = () => {
    if (closed) return;
    closed = true;

    clearInterval(heartbeat);

    try {
      if (activeSocket) {
        activeSocket.onopen = null;
        activeSocket.onmessage = null;
        activeSocket.onerror = null;
        activeSocket.onclose = null;
        activeSocket.close();
      }
    } catch {}

    try {
      res.end();
    } catch {}
  };

  const isClosed = () => closed;

  req.on("close", cleanup);
  req.on("aborted", cleanup);

  sendSse(res, "ready", {
    ok: true,
    address: tokenAddress,
    source: sourceValue
  });

  const wantsPump =
    sourceValue === "pumpfun" ||
    sourceValue === "pump" ||
    sourceValue === "auto";

  const wantsBirdeye =
    sourceValue === "dexscreener" ||
    sourceValue === "birdeye" ||
    sourceValue === "auto";

  try {
    if (wantsPump) {
      const pumpResult = await openPumpPortalStream({
        tokenAddress,
        res,
        isClosed
      });

      if (pumpResult?.ok && pumpResult.socket) {
        activeSocket = pumpResult.socket;
        return;
      }
    }

    if (wantsBirdeye && birdeyeKey) {
      const birdResult = await openBirdeyeStream({
        tokenAddress,
        res,
        isClosed,
        birdeyeKey
      });

      if (birdResult?.ok && birdResult.socket) {
        activeSocket = birdResult.socket;
        return;
      }
    }

    sendSse(res, "fallback", {
      live: false,
      reason: birdeyeKey ? "no_live_source" : "missing_birdeye_key"
    });

    setTimeout(() => {
      cleanup();
    }, 1000);
  } catch (error) {
    sendSse(res, "fallback", {
      live: false,
      reason: "stream_error",
      message: error?.message || "Unknown stream error"
    });

    setTimeout(() => {
      cleanup();
    }, 1000);
  }
}