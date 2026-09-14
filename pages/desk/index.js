// ===============================
// WOJAKMETER — PRIVATE TRADING DESK
// pages/desk/index.js
//
// Reuses the same 7-emotion system as the public site, but the
// emotion is driven by YOUR live PnL instead of market sentiment.
// ===============================

import Head from "next/head";
import { useEffect, useState, useCallback, useRef } from "react";

// Same scale as the public site
function scoreToMood(score) {
  if (score >= 85) return "euphoria";
  if (score >= 70) return "content";
  if (score >= 60) return "optimism";
  if (score >= 45) return "neutral";
  if (score >= 35) return "doubt";
  if (score >= 20) return "concern";
  return "frustration";
}

const MOOD_LABEL = {
  euphoria: "Euphoria",
  content: "Content",
  optimism: "Optimism",
  neutral: "Neutral",
  doubt: "Doubt",
  concern: "Concern",
  frustration: "Frustration"
};

const MOOD_COLOR = {
  euphoria: "#4dff88",
  content: "#7cffaa",
  optimism: "#a6ffc4",
  neutral: "#cfd7e3",
  doubt: "#ff9da6",
  concern: "#ff6c79",
  frustration: "#ff3b4d"
};

const MOOD_ANIM = {
  euphoria: "wmPulse 1.4s ease-in-out infinite",
  content: "wmFloat 3s ease-in-out infinite",
  optimism: "wmFloat 3.6s ease-in-out infinite",
  neutral: "wmBlink 5s ease-in-out infinite",
  doubt: "wmTilt 2.4s ease-in-out infinite",
  concern: "wmShake 0.9s ease-in-out infinite",
  frustration: "wmShake 0.5s ease-in-out infinite"
};

// PnL as a percentage of the risk taken maps onto the 0-100 scale.
// Hitting full take-profit reads as euphoria; hitting the stop
// reads as frustration.
function pnlToScore(pnl, riskUsd) {
  if (pnl === null || pnl === undefined) return 50;

  const risk = Math.abs(Number(riskUsd)) || 1;
  const ratio = Number(pnl) / risk;

  // ratio -1 (stopped out) → 5 · ratio 0 → 50 · ratio +2.5 (TP) → 95
  const score = ratio >= 0
    ? 50 + Math.min(45, ratio * 18)
    : 50 + Math.max(-45, ratio * 45);

  return Math.round(Math.max(0, Math.min(100, score)));
}

function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$--";
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function signedMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "$--";
  return `${n >= 0 ? "+" : "-"}$${Math.abs(n).toFixed(2)}`;
}

export default function Desk() {
  const [status, setStatus] = useState(null);
  const [signals, setSignals] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const timerRef = useRef(null);

  const call = useCallback(async (action, method = "GET", body) => {
    const res = await fetch(`/api/desk/bot?action=${action}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(body || {}) : undefined
    });

    if (res.status === 401) {
      window.location.href = "/desk/login";
      return null;
    }

    return res.json();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [s, sig] = await Promise.all([call("status"), call("signals")]);

      if (s?.ok) {
        setStatus(s);
        setError(null);
        setLastUpdate(new Date());
      } else if (s) {
        setError(s.error || "Bot unreachable");
      }

      if (sig?.ok) setSignals(sig);
    } catch (err) {
      setError(err.message);
    }
  }, [call]);

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, 30000);
    return () => clearInterval(timerRef.current);
  }, [refresh]);

  const act = async (action, confirmText) => {
    if (confirmText && !window.confirm(confirmText)) return;

    setBusy(true);
    try {
      await call(action, "POST");
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const position = status?.position;
  const day = status?.day;
  const auto = status?.autoTrade;

  const livePnl = position?.livePnl;
  const score = position
    ? pnlToScore(livePnl, day?.maxDailyLoss ? day.maxDailyLoss / 2 : 1.5)
    : 50;

  const mood = position ? scoreToMood(score) : "neutral";
  const color = MOOD_COLOR[mood];

  return (
    <>
      <Head>
        <title>Desk — WojakMeter</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="desk">
        <header className="deskbar">
          <div className="brand">
            <span className="dot" style={{ background: error ? "#ff3b4d" : color }} />
            <strong>WojakMeter Desk</strong>
          </div>
          <div className="meta">
            {lastUpdate && <span>updated {lastUpdate.toLocaleTimeString()}</span>}
          </div>
        </header>

        {error && (
          <div className="alert">
            <strong>Bot offline</strong>
            <span>{error}</span>
          </div>
        )}

        <main className="grid">
          {/* ── LIVE WOJAK ── */}
          <section className="card stage">
            <div className="kicker">Live Position</div>

            <div
              className="wojak"
              style={{
                animation: MOOD_ANIM[mood],
                filter: `drop-shadow(0 0 40px ${color}55)`
              }}
            >
              <img
                src={`/assets/hero/classic/${mood}.png`}
                alt={MOOD_LABEL[mood]}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>

            <div className="moodname" style={{ color }}>
              {MOOD_LABEL[mood]}
            </div>

            {position ? (
              <>
                <div className="pnl" style={{ color: livePnl >= 0 ? "#4dff88" : "#ff3b4d" }}>
                  {signedMoney(livePnl)}
                </div>
                <div className="sub">
                  {position.side === "BUY" ? "LONG" : "SHORT"} {position.symbol} ·{" "}
                  {position.leverage}x
                </div>
                <div className="prices">
                  <div>
                    <span>Entry</span>
                    <strong>{money(position.entryPrice)}</strong>
                  </div>
                  <div>
                    <span>Mark</span>
                    <strong>{money(position.markPrice)}</strong>
                  </div>
                  <div>
                    <span>Qty</span>
                    <strong>{position.qty}</strong>
                  </div>
                </div>
              </>
            ) : (
              <div className="sub idle">
                {status ? "No open position — waiting for a signal" : "Connecting…"}
              </div>
            )}
          </section>

          {/* ── SIGNALS ── */}
          <section className="card">
            <div className="kicker">Signal Engine</div>

            {signals ? (
              <>
                <div className="row big">
                  <span>Direction</span>
                  <strong style={{
                    color: signals.direction === "LONG"
                      ? "#4dff88"
                      : signals.direction === "SHORT"
                        ? "#ff3b4d"
                        : "#cfd7e3"
                  }}>
                    {signals.direction || "None"}
                  </strong>
                </div>

                <div className="row">
                  <span>Confidence</span>
                  <strong>{String(signals.confidence).toUpperCase()}</strong>
                </div>

                <div className="row">
                  <span>Aligned</span>
                  <strong>{signals.aligned}/3</strong>
                </div>

                {signals.conflict && (
                  <div className="conflict">Signals conflict — standing down</div>
                )}

                <ul className="details">
                  {signals.details?.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              </>
            ) : (
              <div className="sub idle">Loading signals…</div>
            )}
          </section>

          {/* ── DAY ── */}
          <section className="card">
            <div className="kicker">Today</div>

            <div className="row big">
              <span>PnL</span>
              <strong style={{ color: (day?.pnl || 0) >= 0 ? "#4dff88" : "#ff3b4d" }}>
                {signedMoney(day?.pnl)}
              </strong>
            </div>

            <div className="row">
              <span>Trades</span>
              <strong>{day?.trades ?? "–"}/{day?.maxTrades ?? "–"}</strong>
            </div>

            <div className="row">
              <span>Balance</span>
              <strong>{money(day?.balance)}</strong>
            </div>

            <div className="row">
              <span>Cooling down</span>
              <strong style={{ color: day?.coolingDown ? "#ff9da6" : "#cfd7e3" }}>
                {day?.coolingDown ? "Yes" : "No"}
              </strong>
            </div>

            <div className="bar">
              <div
                className="fill"
                style={{
                  width: `${Math.min(100, ((day?.trades || 0) / (day?.maxTrades || 1)) * 100)}%`,
                  background: color
                }}
              />
            </div>
          </section>

          {/* ── CONTROLS ── */}
          <section className="card">
            <div className="kicker">Control</div>

            <div className="row">
              <span>AutoTrade</span>
              <strong style={{ color: auto?.active ? "#4dff88" : "#ff6c79" }}>
                {auto?.active ? "ON" : "OFF"}
              </strong>
            </div>

            <div className="row">
              <span>Circuit breaker</span>
              <strong>
                {auto?.consecutiveLosses ?? 0}/{auto?.maxConsecutiveLosses ?? 2}
              </strong>
            </div>

            {auto?.paused && (
              <div className="conflict">Paused: {auto.pauseReason}</div>
            )}

            <div className="buttons">
              {auto?.paused ? (
                <button disabled={busy} onClick={() => act("resume")}>
                  Resume
                </button>
              ) : (
                <button disabled={busy} onClick={() => act("pause")}>
                  Pause
                </button>
              )}

              <button
                className="danger"
                disabled={busy || !position}
                onClick={() =>
                  act("close", "Close the open position at market price?")
                }
              >
                Close position
              </button>
            </div>
          </section>
        </main>
      </div>

      <style jsx>{`
        .desk {
          min-height: 100vh;
          padding: 20px;
          background:
            radial-gradient(circle at 20% 0%, rgba(77,255,136,0.05), transparent 30%),
            linear-gradient(180deg, #071018 0%, #0b1622 100%);
          color: #f5f7fb;
          font-family: Inter, system-ui, sans-serif;
        }
        .deskbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1200px;
          margin: 0 auto 18px;
        }
        .brand { display: flex; align-items: center; gap: 10px; font-size: 1.05rem; }
        .dot {
          width: 10px; height: 10px; border-radius: 50%;
          box-shadow: 0 0 12px currentColor;
        }
        .meta { color: #9eacbf; font-size: 0.8rem; }
        .alert {
          max-width: 1200px; margin: 0 auto 16px;
          padding: 12px 16px; border-radius: 14px;
          background: rgba(255,59,77,0.1);
          border: 1px solid rgba(255,59,77,0.3);
          display: flex; flex-direction: column; gap: 4px;
        }
        .alert span { color: #ffd8dd; font-size: 0.85rem; }
        .grid {
          max-width: 1200px; margin: 0 auto;
          display: grid; gap: 14px;
          grid-template-columns: 1.2fr 1fr;
        }
        .card {
          padding: 20px; border-radius: 20px;
          border: 1px solid rgba(255,255,255,0.08);
          background: linear-gradient(180deg, #132235 0%, #101c2b 100%);
        }
        .stage {
          grid-row: span 2;
          display: flex; flex-direction: column;
          align-items: center; text-align: center;
        }
        .kicker {
          align-self: flex-start;
          font-size: 0.65rem; font-weight: 900;
          letter-spacing: 0.16em; text-transform: uppercase;
          color: #9eacbf; margin-bottom: 14px;
        }
        .wojak { width: min(280px, 70%); margin: 10px 0; }
        .wojak img { width: 100%; height: auto; }
        .moodname {
          font-size: 2rem; font-weight: 800;
          letter-spacing: -0.02em; margin-top: 6px;
        }
        .pnl { font-size: 2.6rem; font-weight: 900; margin: 6px 0; }
        .sub { color: #9eacbf; font-size: 0.9rem; }
        .idle { padding: 30px 0; }
        .prices {
          display: flex; gap: 20px; margin-top: 18px;
          padding-top: 16px; width: 100%;
          border-top: 1px solid rgba(255,255,255,0.06);
          justify-content: center;
        }
        .prices div { display: flex; flex-direction: column; gap: 3px; }
        .prices span { font-size: 0.7rem; color: #9eacbf; }
        .prices strong { font-size: 0.95rem; }
        .row {
          display: flex; justify-content: space-between;
          align-items: center; padding: 9px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .row span { color: #9eacbf; font-size: 0.85rem; }
        .row strong { font-size: 0.95rem; }
        .row.big strong { font-size: 1.4rem; }
        .conflict {
          margin-top: 12px; padding: 9px 12px;
          border-radius: 10px; font-size: 0.82rem;
          background: rgba(255,157,166,0.1);
          border: 1px solid rgba(255,157,166,0.25);
          color: #ff9da6;
        }
        .details {
          margin: 14px 0 0; padding: 0; list-style: none;
          display: flex; flex-direction: column; gap: 7px;
        }
        .details li {
          font-size: 0.8rem; color: #cfd7e3;
          padding: 8px 10px; border-radius: 9px;
          background: rgba(255,255,255,0.03);
        }
        .bar {
          height: 7px; margin-top: 16px; border-radius: 999px;
          background: rgba(255,255,255,0.06); overflow: hidden;
        }
        .fill { height: 100%; transition: width 0.4s ease; }
        .buttons { display: flex; gap: 10px; margin-top: 18px; }
        button {
          flex: 1; padding: 11px; border-radius: 12px; cursor: pointer;
          font-weight: 700; font-size: 0.85rem;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.05); color: #f5f7fb;
          transition: 0.2s;
        }
        button:hover:not(:disabled) { filter: brightness(1.2); }
        button:disabled { opacity: 0.4; cursor: not-allowed; }
        button.danger {
          border-color: rgba(255,59,77,0.3);
          background: rgba(255,59,77,0.1);
          color: #ff9da6;
        }
        @media (max-width: 900px) {
          .grid { grid-template-columns: 1fr; }
          .stage { grid-row: auto; }
        }
      `}</style>

      <style jsx global>{`
        body { margin: 0; }
        @keyframes wmFloat {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes wmPulse {
          0%,100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes wmBlink {
          0%,94%,100% { opacity: 1; }
          97% { opacity: 0.85; }
        }
        @keyframes wmTilt {
          0%,100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
        @keyframes wmShake {
          0%,100% { transform: translate(0,0); }
          25% { transform: translate(-4px,2px); }
          50% { transform: translate(4px,-2px); }
          75% { transform: translate(-3px,-1px); }
        }
      `}</style>
    </>
  );
}
