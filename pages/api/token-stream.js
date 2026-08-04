import WebSocket from "ws";

export const config = {
  runtime: "nodejs",
  maxDuration: 60
};

/* ===========================================================
   TOKEN STREAM  (v2)

   EL BUG QUE ARREGLA:
   El fallback comprobaba la CONEXIÓN, no los DATOS:

     setTimeout(() => {
       if (!pumpConnected && !birdeyeConnected) connectBirdeye();
     }, 3000);

   PumpPortal solo emite trades de tokens que siguen en la
   bonding curve de pump.fun. Con un token graduado (NORMIE,
   BONK, cualquiera que ya esté en Raydium) el WebSocket abre
   perfectamente, confirma la suscripción... y nunca envía nada.

   Como `pumpConnected` era true, Birdeye nunca arrancaba. El
   feed se quedaba en "Waiting for live trades" para siempre y
   el hero no reaccionaba a nada.

   Ahora hay un WATCHDOG DE DATOS: si no llega ningún trade
   real en TRADE_WATCHDOG_MS, se cambia de fuente aunque la
   conexión esté sana.

   TAMBIÉN:
   · Se filtran los mensajes de confirmación de suscripción,
     que antes se reenviaban como "trade" y el frontend tenía
     que descartar.
   · Se avisa al cliente del motivo del cambio de fuente.
   =========================================================== */

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;

/* Cuánto esperamos un trade real antes de considerar muerta la
   fuente. 12s es suficiente para un token con actividad; los
   que no llegan a eso van a Birdeye, que hace polling. */
const TRADE_WATCHDOG_MS = 12000;
const BIRDEYE_POLL_MS   = 3000;
const PING_MS           = 15000;

/* Un mensaje es un trade solo si trae lado y algún valor.
   PumpPortal manda primero {"message":"Successfully subscribed"}
   y eso no es un trade. */
function looksLikeTrade(data) {
  if (!data || typeof data !== "object") return false;
  if (data.message || data.errors) return false;

  const side = data.txType || data.side || data.type || data.tradeType;
  if (!side) return false;

  const hasValue =
    Number(data.solAmount) > 0 ||
    Number(data.tokenAmount) > 0 ||
    Number(data.vUsd) > 0 ||
    Number(data.marketCapSol) > 0 ||
    Number(data.usd_market_cap) > 0 ||
    Number(data.priceUsd) > 0;

  return Boolean(hasValue);
}

export default async function handler(req, res) {
  const { address, source = "auto" } = req.query;

  if (!address) {
    return res.status(400).json({ error: "Missing address" });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no"
  });

  let closed = false;

  const send = (event, data) => {
    if (closed) return;
    try {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch {
      closed = true;
    }
  };

  send("ready", { ok: true, address });

  let ws = null;
  let birdeyeInterval = null;
  let watchdog = null;

  let tradesSeen = 0;
  let activeSource = null;
  let birdeyeStarted = false;

  const clearWatchdog = () => {
    if (watchdog) { clearTimeout(watchdog); watchdog = null; }
  };

  /* El watchdog se rearma con cada trade. Si expira, la fuente
     está conectada pero muda: cambiamos. */
  const armWatchdog = (onSilent) => {
    clearWatchdog();
    watchdog = setTimeout(() => {
      if (tradesSeen === 0) onSilent();
    }, TRADE_WATCHDOG_MS);
  };

  const cleanup = () => {
    closed = true;
    clearWatchdog();
    if (birdeyeInterval) clearInterval(birdeyeInterval);
    try { ws?.close(); } catch {}
  };

  // ============================================================
  // PUMP.FUN
  // ============================================================
  function connectPump() {
    try {
      ws = new WebSocket("wss://pumpportal.fun/api/data");

      ws.on("open", () => {
        activeSource = "pumpportal";
        send("source", { source: "pumpportal", live: true });

        ws.send(JSON.stringify({
          method: "subscribeTokenTrade",
          keys: [address]
        }));

        /* Conectado no es lo mismo que vivo. Si en 12s no llega
           un trade real, este token no está en la curva de
           pump.fun y hay que cambiar de fuente. */
        armWatchdog(() => {
          send("source_silent", {
            from: "pumpportal",
            reason: "no_trades_on_bonding_curve"
          });
          try { ws?.close(); } catch {}
          startBirdeye();
        });
      });

      ws.on("message", (msg) => {
        try {
          const data = JSON.parse(msg.toString());
          if (!looksLikeTrade(data)) return;  // descarta confirmaciones

          tradesSeen += 1;
          clearWatchdog();
          send("trade", data);
        } catch {}
      });

      ws.on("close", () => {
        if (activeSource === "pumpportal" && tradesSeen === 0) startBirdeye();
      });

      ws.on("error", () => {
        if (activeSource !== "birdeye") startBirdeye();
      });
    } catch {
      startBirdeye();
    }
  }

  // ============================================================
  // BIRDEYE
  // ============================================================
  function startBirdeye() {
    if (birdeyeStarted || closed) return;
    birdeyeStarted = true;

    if (!BIRDEYE_API_KEY) {
      send("fallback", { live: false, reason: "no_birdeye_api_key" });
      return;
    }

    activeSource = "birdeye";
    send("source", { source: "birdeye", live: true });

    /* Deduplicación por hash de transacción: el polling repite
       las mismas 10 últimas cada 3s. Sin esto, el hero reaccionaba
       una y otra vez al mismo trade. */
    const seen = new Set();

    const poll = async () => {
      if (closed) return;
      try {
        const apiRes = await fetch(
          `https://public-api.birdeye.so/defi/txs/token?address=${encodeURIComponent(address)}&offset=0&limit=10&tx_type=swap`,
          { headers: { "x-api-key": BIRDEYE_API_KEY, accept: "application/json" } }
        );

        if (!apiRes.ok) return;

        const json = await apiRes.json();
        const items = json?.data?.items || [];

        // Del más antiguo al más nuevo, para que el orden sea natural.
        [...items].reverse().forEach((tx) => {
          const id = tx.txHash || tx.tx_hash || `${tx.blockUnixTime}-${tx.owner}`;
          if (!id || seen.has(id)) return;
          seen.add(id);

          tradesSeen += 1;
          send("trade", {
            txType: tx.side || tx.txType,
            priceUsd: tx.price ?? tx.priceUsd,
            tokenAmount: tx.amount ?? tx.uiAmount,
            traderPublicKey: tx.owner,
            vUsd: tx.value ?? tx.volumeUSD
          });
        });

        // La memoria del Set no puede crecer sin límite.
        if (seen.size > 400) {
          const keep = [...seen].slice(-200);
          seen.clear();
          keep.forEach((k) => seen.add(k));
        }
      } catch {}
    };

    poll();
    birdeyeInterval = setInterval(poll, BIRDEYE_POLL_MS);

    /* Si Birdeye tampoco da nada, avisamos honestamente en vez
       de dejar al usuario mirando un feed vacío. */
    armWatchdog(() => {
      send("fallback", { live: false, reason: "no_trades_any_source" });
    });
  }

  // ============================================================
  // ARRANQUE
  // ============================================================
  if (source === "pump")        connectPump();
  else if (source === "birdeye") startBirdeye();
  else                           connectPump();   // auto

  // ============================================================
  // KEEP ALIVE
  // ============================================================
  const ping = setInterval(() => {
    send("ping", { ts: Date.now(), source: activeSource, trades: tradesSeen });
  }, PING_MS);

  req.on("close", () => {
    clearInterval(ping);
    cleanup();
  });
}
