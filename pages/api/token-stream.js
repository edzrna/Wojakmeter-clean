import WebSocket from "ws";

export const config = {
  runtime: "nodejs",
};

const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY;

export default async function handler(req, res) {
  const { address, source = "auto" } = req.query;

  if (!address) {
    return res.status(400).json({ error: "Missing address" });
  }

  // ===============================
  // SSE HEADERS
  // ===============================
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  const send = (event, data) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  send("ready", { ok: true, address });

  let pumpConnected = false;
  let birdeyeConnected = false;
  let fallbackUsed = false;

  let ws = null;

  // ===============================
  // 1️⃣ PUMP.FUN (PumpPortal)
  // ===============================
  function connectPump() {
    try {
      ws = new WebSocket("wss://pumpportal.fun/api/data");

      ws.on("open", () => {
        pumpConnected = true;

        send("source", {
          source: "pumpportal",
          live: true,
        });

        ws.send(
          JSON.stringify({
            method: "subscribeTokenTrade",
            keys: [address],
          })
        );
      });

      ws.on("message", (msg) => {
        try {
          const data = JSON.parse(msg.toString());

          if (!data) return;

          send("trade", data);
        } catch {}
      });

      ws.on("close", () => {
        pumpConnected = false;

        if (!birdeyeConnected) {
          connectBirdeye();
        }
      });

      ws.on("error", () => {
        pumpConnected = false;

        if (!birdeyeConnected) {
          connectBirdeye();
        }
      });
    } catch {
      connectBirdeye();
    }
  }

  // ===============================
  // 2️⃣ BIRDEYE FALLBACK
  // ===============================
  async function connectBirdeye() {
    if (!BIRDEYE_API_KEY) {
      send("fallback", {
        live: false,
        reason: "no_api_key",
      });
      return;
    }

    try {
      birdeyeConnected = true;

      send("source", {
        source: "birdeye",
        live: true,
      });

      const interval = setInterval(async () => {
        try {
          const resApi = await fetch(
            `https://public-api.birdeye.so/defi/txs/token?address=${address}&offset=0&limit=5`,
            {
              headers: {
                "x-api-key": BIRDEYE_API_KEY,
              },
            }
          );

          const json = await resApi.json();

          const trades = json?.data?.items || [];

          trades.forEach((tx) => {
            send("trade", {
              txType: tx.side,
              priceUsd: tx.price,
              tokenAmount: tx.amount,
              traderPublicKey: tx.owner,
              vUsd: tx.value,
            });
          });
        } catch {}
      }, 2000);

      req.on("close", () => {
        clearInterval(interval);
      });
    } catch {
      send("fallback", {
        live: false,
        reason: "birdeye_failed",
      });
    }
  }

  // ===============================
  // SOURCE LOGIC
  // ===============================
  if (source === "pump") {
    connectPump();
  } else if (source === "birdeye") {
    connectBirdeye();
  } else {
    // AUTO MODE
    connectPump();

    // fallback timer
    setTimeout(() => {
      if (!pumpConnected && !birdeyeConnected && !fallbackUsed) {
        fallbackUsed = true;
        connectBirdeye();
      }
    }, 3000);
  }

  // ===============================
  // KEEP ALIVE
  // ===============================
  const ping = setInterval(() => {
    send("ping", { ts: Date.now() });
  }, 10000);

  req.on("close", () => {
    clearInterval(ping);

    try {
      if (ws) ws.close();
    } catch {}
  });
}