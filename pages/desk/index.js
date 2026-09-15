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
  if (value === null || value === undefined) return "$--";
  const n = Number(value);
  if (!Number.isFinite(n)) return "$--";
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

function signedMoney(value) {
  if (value === null || value === undefined) return "$--";
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
  const fetching = useRef(false);

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

    const data = await res.json();
    if (!res.ok || data.ok === false) throw new Error(data.error || "Request failed");
    return data;
  }, []);

  const refresh = useCallback(async () => {
    if (fetching.current) return;
    fetching.current = true;
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
    finally { fetching.current = false; }
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
    } catch (err) { setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const position = status?.position;
  const day = status?.day;
  const auto = status?.autoTrade;

  const livePnl = position?.livePnl;
  const score = position
    ? pnlToScore(livePnl, position?.riskUsd || 1.5)
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
            <strong>Desk connection / action error</strong>
            <span>{error}</span>
          </div>
        )}

        <section className="intelligence">
          <div className="intelligence-head"><div><div className="kicker">MARKET INTELLIGENCE · LIVE ENGINE</div><h1>Clarity before action.</h1></div><span className="engine-mode">{status?.engine?.mode || "Connecting"}</span></div>
          <div className="readings">
            <article><small>WOJAKMETER INDEX</small><strong style={{color:MOOD_COLOR[status?.market?.mood] || "#B8C0CB"}}>{status?.market ? `${MOOD_LABEL[status.market.mood]} · ${status.market.score}/100` : "Unavailable"}</strong><span>{status?.market ? `Source updated ${new Date(status.market.ts).toLocaleTimeString()}` : status?.marketError || "Waiting for market data"}</span></article>
            <article><small>STRATEGY ALIGNMENT</small><strong>{signals?.aligned ?? "—"} / 3</strong><span>{signals?.error || (signals?.conflict ? "Signals disagree — no entry" : signals?.direction ? `${signals.direction} · ${signals.confidence}` : "Waiting for aligned signals")}</span></article>
            <article><small>EVALUATION ENGINE</small><strong>{status?.engine?.evaluating ? "Evaluating" : status?.engine?.ready ? "Monitoring" : "Not ready"}</strong><span>{status?.engine?.lastEvaluation ? `Last cycle ${new Date(status.engine.lastEvaluation).toLocaleTimeString()}` : "Waiting for first cycle"}</span></article>
          </div>
          <div className="engine-explanation">
            <button disabled={busy || status?.engine?.recovering} onClick={() => act("recover", "Pause new entries and retry account recovery? This will not place orders or resume trading.")}>{status?.engine?.recovering ? "Checking account…" : "Retry account recovery"}</button>
            {status?.engine?.recoveryError && <p role="alert">Recovery failed: {status.engine.recoveryError}</p>}
            {status?.engine?.recoveredAt && <p>Last successful recovery: {new Date(status.engine.recoveredAt).toLocaleTimeString()}. Review the pause status before resuming.</p>}
            {status?.account && <p>{status.account.ok ? `Binance wallet: ${money(status.account.walletBalance)} · Available: ${money(status.account.availableBalance)} · Updated ${new Date(status.account.ts).toLocaleTimeString()}` : `Account read failed: ${status.account.error}`}</p>}
            <b>Why it waits</b><p>{status?.engine?.bootError || (status?.engine?.blockers?.length ? status.engine.blockers.join(" · ") : "No account gate reported. Entries still require strategy alignment and cooldown checks.")}</p></div>
          <details><summary>Market context & emotion strategy</summary><p>The public index includes the site's composite inputs. Smart AutoTrade keeps its existing global-price, BTC momentum and scanner strategy. These scores can differ; the public index is context, not an extra order trigger.</p><p>Emotion Trader: confirmation required{status?.emotionEngine?.position ? ` · Open: ${status.emotionEngine.position.symbol}` : ""}{status?.emotionEngine?.pending ? ` · Pending: ${status.emotionEngine.pending.symbol}` : ""}. Both engines share entry limits and a single execution lock.</p><p>Automatic evaluation runs every minute. Resume removes a pause; it does not switch AutoTrade ON. After restart, the legacy daily trade counter is an estimate based on realized-income records.</p></details>
        </section>
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
        .intelligence {max-width:1200px;margin:24px auto;padding:28px;border:1px solid #27323c;border-radius:22px;background:linear-gradient(125deg,#111c24,#10141c);}
        .intelligence-head {display:flex;justify-content:space-between;gap:20px;align-items:center;}
        .intelligence h1 {font-size:clamp(24px,4vw,38px);margin:12px 0 24px;letter-spacing:-1px;}
        .engine-mode {border:1px solid #42584e;border-radius:20px;padding:9px 14px;color:#A8E6BF;font-size:12px;}
        .readings {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;}
        .readings article {display:flex;flex-direction:column;gap:12px;padding:18px;background:#0c131acc;border-radius:12px;}
        .readings small {font-size:10px;letter-spacing:1.5px;color:#9aa8b6;}
        .readings strong {font-size:24px;}
        .readings span,.intelligence p {color:#aab7c4;font-size:13px;line-height:1.6;overflow-wrap:anywhere;}
        .engine-explanation button {padding:10px 16px;margin-bottom:12px;border:1px solid #4b7462;border-radius:9px;background:#152a23;color:#b6efd1;cursor:pointer;}
        .engine-explanation button:disabled{opacity:.5;cursor:wait;}
        .engine-explanation {margin-top:20px;border-left:2px solid #A8E6BF;padding:4px 16px;}
        .intelligence details {border-top:1px solid #27323c;margin-top:24px;padding-top:18px;}
        .intelligence summary {cursor:pointer;color:#d2dce4;font-size:13px;}
        @media(max-width:650px) {.readings {grid-template-columns:1fr;}.intelligence {padding:18px;margin:16px 0;}.intelligence-head{align-items:flex-start;flex-direction:column;}.engine-mode{margin-bottom:18px;}}

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
