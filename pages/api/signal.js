import { computeMarketSignal } from "../../lib/signal-engine";

export default async function handler(req, res) {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/global");
    const json = await r.json();

    const signal = computeMarketSignal(json.data);

    res.status(200).json(signal);
  } catch (err) {
    res.status(500).json({ error: "signal error" });
  }
}