// ===============================
// WOJAKMETER — PRIVATE DESK (phase 1: the lab)
// pages/desk/index.js
//
// Bot v2 phase 1 does not trade, so the desk shows the lab only:
//
//   - the Wojak, driven by the market's cell on the lattice. In v1 it
//     followed the live PnL of an open position; that comes back with
//     trading in phase 2
//   - the lattice (HexLattice)
//   - the Edge Lab: pipeline status, hypotheses, every transition
//
// Every request uses a lab action (lab-state, lab-report, lab-status).
// The v1 panels — market intelligence, signals, today, controls and
// MarketMetrics — called actions bot v2 answers with 410, so they are
// gone until phase 2.
//
// The page owns the lattice state: it fetches it once a minute and
// hands it to HexLattice, so the Wojak and the lattice always show the
// same snapshot and nothing is fetched twice. `initialState` exists
// for the render tests; Next never passes it.
// ===============================

import Head from "next/head";
import { useCallback, useEffect, useState } from "react";
import HexLattice from "../../components/desk/HexLattice";
import EdgeLab from "../../components/desk/EdgeLab";
import DeskCharacter from "../../components/desk/DeskCharacter";
import { deskCall } from "../../lib/desk/client";
import { MOOD_COLOR, fmtWhen, moodName } from "../../lib/desk/format";

const REFRESH_MS = 60_000;

const MOOD_ANIM = {
  euphoria: "wmPulse 1.4s ease-in-out infinite",
  content: "wmFloat 3s ease-in-out infinite",
  optimism: "wmFloat 3.6s ease-in-out infinite",
  neutral: "wmBlink 5s ease-in-out infinite",
  doubt: "wmTilt 2.4s ease-in-out infinite",
  concern: "wmShake 0.9s ease-in-out infinite",
  frustration: "wmShake 0.5s ease-in-out infinite"
};

export default function Desk({ initialState = null }) {
  const [model, setModel] = useState("hex2");
  const latticeModel=model==="linear"?"hex2":model;
  const [state, setState] = useState(initialState);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const load = useCallback(async (signal) => {
    try {
      const r = await deskCall("lab-state", { model: latticeModel }, { signal });

      if (signal?.aborted) return;
      if (r.httpStatus === 401) {
        window.location.href = "/desk/login";
        return;
      }

      if (r.ok) {
        setState(r);
        setError(null);
        setLastUpdate(new Date());
      } else {
        setError(r.error || "The lab did not answer.");
      }
    } catch (err) {
      if (err?.name !== "AbortError") setError(String(err?.message || err));
    }
  }, [latticeModel]);

  useEffect(() => {
    if (initialState) return undefined;
    const ctrl = new AbortController();
    load(ctrl.signal);
    const timer = setInterval(() => load(ctrl.signal), REFRESH_MS);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, [initialState, load]);

  async function logout() {
    try {
      await fetch("/api/desk/auth", { method: "DELETE", credentials: "same-origin" });
    } finally {
      window.location.href = "/desk/login";
    }
  }

  const cell = state?.cell || null;
  const mood = cell || "neutral";
  const color = cell ? MOOD_COLOR[cell] : "#9eacbf";
  const confirmed = state?.confirmed || null;
  const dot = error ? "#ff3b4d" : state?.stale ? "#ffd166" : color;

  let moodNote;
  if (!state) moodNote = error ? "The lab is not answering." : "Connecting to the lab…";
  else if (!cell) moodNote = state.reason || "No reading yet.";
  else if (confirmed && confirmed.cell === cell) moodNote = `Stable state since ${fmtWhen(confirmed.since)}`;
  else moodNote = "Not confirmed yet";

  return (
    <>
      <Head>
        <title>Desk — WojakMeter</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" key="viewport" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="desk">
        <header className="deskbar">
          <div className="brand">
            <span className="dot" style={{ background: dot, color: dot }} />
            <strong>WojakMeter Desk</strong>
          </div>
          <div className="meta">
            <span>Lab only: the bot is not trading</span>
            {lastUpdate && <span>updated {lastUpdate.toLocaleTimeString()}</span>}
            <button type="button" className="logout" onClick={logout}>
              Log out
            </button>
          </div>
        </header>

        {error && (
          <div className="alert">
            <strong>Lab connection error</strong>
            <span>{error}</span>
          </div>
        )}

        <main className="grid">
          {/* ── THE WOJAK: the market's cell on the lattice ── */}
          <section className="card stage">
            <div className="kicker">Market mood · {latticeModel==='hex2'?'Lattice v2':'Lattice v1'}</div>{model==='linear'&&<p className="note">Linear report selected; the character and lattice remain on Lattice v2.</p>}

            <div
              className={`wojak${cell ? "" : " waiting"}`}
              style={{
                animation: "none",
                filter: `drop-shadow(0 0 40px ${color}55)`
              }}
            >
              <DeskCharacter mood={mood} active={Boolean(cell)&&!state?.stale&&!error} />
            </div>

            <div className="moodname" style={{ color }}>
              {cell ? moodName(cell) : "—"}
            </div>
            <div className="sub">{moodNote}</div>
            <p className="note">Where the market sits on the lattice right now. A reading, not a trade signal.</p>
          </section>

          {/* ── THE LATTICE: same snapshot as the Wojak ── */}
          {state ? <HexLattice data={state} /> : <section className="card placeholder">Loading the lattice…</section>}

          {/* ── RESEARCH: measured edge, not predictions ── */}
          <div className="wide">
            <EdgeLab selectedModel={model} onModelChange={value=>{setState(null);setModel(value);}} />
          </div>
        </main>
      </div>

      <style jsx>{`
        .desk {
          min-height: 100vh;
          padding: 20px;
          background:
            radial-gradient(circle at 20% 0%, rgba(77, 255, 136, 0.05), transparent 30%),
            linear-gradient(180deg, #071018 0%, #0b1622 100%);
          color: #f5f7fb;
          font-family: Inter, system-ui, sans-serif;
        }
        .deskbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          max-width: 1200px;
          margin: 0 auto 18px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 1.05rem;
        }
        .dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          box-shadow: 0 0 12px currentColor;
        }
        .meta {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          color: #9eacbf;
          font-size: 0.8rem;
        }
        .logout {
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.05);
          color: #f5f7fb;
          font: inherit;
          font-size: 0.78rem;
          font-weight: 700;
          cursor: pointer;
        }
        .logout:hover {
          filter: brightness(1.2);
        }
        .alert {
          max-width: 1200px;
          margin: 0 auto 16px;
          padding: 12px 16px;
          border-radius: 14px;
          background: rgba(255, 59, 77, 0.1);
          border: 1px solid rgba(255, 59, 77, 0.3);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .alert span {
          color: #ffd8dd;
          font-size: 0.85rem;
        }
        .grid {
          max-width: 1200px;
          margin: 0 auto;
          display: grid;
          gap: 14px;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
          align-items: start;
        }
        .wide {
          grid-column: 1 / -1;
        }
        /* :global so the panels' own sections get the desk card too */
        .desk :global(.card) {
          padding: 20px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: linear-gradient(180deg, #132235 0%, #101c2b 100%);
        }
        .stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .kicker {
          align-self: flex-start;
          font-size: 0.65rem;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #9eacbf;
          margin-bottom: 14px;
        }
        .wojak {
          width: min(280px, 70%);
          margin: 10px 0;
        }
        .wojak img {
          display: block;
          width: 100%;
          height: auto;
        }
        .wojak.waiting {
          opacity: 0.45;
        }
        .moodname {
          font-size: 2rem;
          font-weight: 800;
          letter-spacing: -0.02em;
          margin-top: 6px;
        }
        .sub {
          color: #9eacbf;
          font-size: 0.9rem;
          line-height: 1.5;
        }
        .note {
          margin: 14px 0 0;
          max-width: 34ch;
          font-size: 0.76rem;
          line-height: 1.5;
          color: #6b7785;
        }
        .placeholder {
          padding: 40px 20px;
          text-align: center;
          color: #8d9aa8;
          font-size: 0.85rem;
        }
        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .wojak {
            animation: none !important;
          }
        }
      `}</style>

      <style jsx global>{`
        body {
          margin: 0;
        }
        @keyframes wmFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        @keyframes wmPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes wmBlink {
          0%, 94%, 100% { opacity: 1; }
          97% { opacity: 0.85; }
        }
        @keyframes wmTilt {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-3deg); }
          75% { transform: rotate(3deg); }
        }
        @keyframes wmShake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-4px, 2px); }
          50% { transform: translate(4px, -2px); }
          75% { transform: translate(-3px, -1px); }
        }
      `}</style>
    </>
  );
}
