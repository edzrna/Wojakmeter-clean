// ===============================
// WOJAKMETER — EDGE LAB PANEL
// components/desk/EdgeLab.jsx
//
// This panel will spend its first two months showing incomplete
// data. That is the normal state, not a failure, so it is built
// to show PROGRESS toward a measurable answer rather than an
// empty table that looks broken.
// ===============================

import { useEffect, useState, useCallback } from "react";

const MIN_SAMPLE = 30;

const MOOD_COLOR = {
  euphoria: "#4dff88",
  content: "#7cffaa",
  optimism: "#a6ffc4",
  neutral: "#cfd7e3",
  doubt: "#ff9da6",
  concern: "#ff6c79",
  frustration: "#ff3b4d"
};

const HORIZONS = [
  { key: "h1", label: "1h" },
  { key: "h4", label: "4h" },
  { key: "h24", label: "24h" }
];

function moodsFromTransition(transition) {
  const [from, to] = String(transition || "").split("→");
  return { from: from?.trim(), to: to?.trim() };
}

function verdictStyle(row) {
  if (row.n < MIN_SAMPLE) {
    return { icon: "⏳", tone: "pending", text: "collecting" };
  }
  if (!row.significant) {
    return { icon: "⚪", tone: "noise", text: "noise" };
  }
  return row.meanReturn > 0
    ? { icon: "🟢", tone: "positive", text: "edge candidate" }
    : { icon: "🔴", tone: "negative", text: "inverse edge" };
}

export default function EdgeLab({ call }) {
  const [horizon, setHorizon] = useState("h4");
  const [rows, setRows] = useState(null);
  const [divergence, setDivergence] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [edge, div] = await Promise.all([
        call(`edge&horizon=${horizon}`),
        call("divergence")
      ]);

      if (edge?.ok) setRows(edge.results || []);
      else if (edge) setError(edge.error || "Could not load edge data");

      if (div?.ok) setDivergence(div);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [call, horizon]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmed = rows?.filter((r) => r.significant) || [];
  const collecting = rows?.filter((r) => r.n < MIN_SAMPLE) || [];
  const totalSamples = rows?.reduce((sum, r) => sum + r.n, 0) || 0;

  // Rough sense of how far the whole experiment has come
  const overallProgress = rows?.length
    ? Math.min(
        100,
        Math.round(
          (rows.reduce((s, r) => s + Math.min(r.n, MIN_SAMPLE), 0) /
            (rows.length * MIN_SAMPLE)) *
            100
        )
      )
    : 0;

  return (
    <section className="card lab">
      <div className="head">
        <div className="kicker">Edge Lab · measured, not predicted</div>

        <div className="horizons">
          {HORIZONS.map((h) => (
            <button
              key={h.key}
              className={horizon === h.key ? "on" : ""}
              onClick={() => setHorizon(h.key)}
            >
              {h.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="err">{error}</div>}

      {/* ── Progress toward a usable dataset ── */}
      <div className="progress-block">
        <div className="progress-top">
          <span>Dataset maturity</span>
          <strong>{overallProgress}%</strong>
        </div>
        <div className="bar">
          <div className="fill" style={{ width: `${overallProgress}%` }} />
        </div>
        <div className="progress-meta">
          {totalSamples} resolved samples ·{" "}
          {rows?.length || 0} transitions seen ·{" "}
          {collecting.length} still collecting
        </div>
      </div>

      {/* ── Headline result ── */}
      {rows && (
        <div className={`headline ${confirmed.length ? "found" : "waiting"}`}>
          {confirmed.length ? (
            <>
              <strong>
                {confirmed.length} transition{confirmed.length > 1 ? "s" : ""} with
                statistical support
              </strong>
              <span>
                Candidates, not proof. Testing many transitions inflates false
                positives.
              </span>
            </>
          ) : (
            <>
              <strong>No transition has cleared the bar yet</strong>
              <span>
                Each needs ~{MIN_SAMPLE} resolved observations before its number
                means anything.
              </span>
            </>
          )}
        </div>
      )}

      {/* ── The table ── */}
      {loading && !rows && <div className="idle">Loading…</div>}

      {rows && rows.length === 0 && (
        <div className="idle">
          No transitions recorded yet. The lab writes one row each time the
          market changes emotional state.
        </div>
      )}

      {rows && rows.length > 0 && (
        <div className="rows">
          {rows.map((r) => {
            const v = verdictStyle(r);
            const { from, to } = moodsFromTransition(r.transition);
            const pct = Math.min(100, Math.round((r.n / MIN_SAMPLE) * 100));

            return (
              <article key={r.transition} className={`row ${v.tone}`}>
                <div className="row-main">
                  <div className="transition">
                    <span className="icon">{v.icon}</span>
                    <span className="mood" style={{ color: MOOD_COLOR[from] }}>
                      {from}
                    </span>
                    <span className="arrow">→</span>
                    <span className="mood" style={{ color: MOOD_COLOR[to] }}>
                      {to}
                    </span>
                  </div>

                  <div
                    className="mean"
                    style={{
                      color:
                        r.n < MIN_SAMPLE
                          ? "#9eacbf"
                          : r.meanReturn >= 0
                          ? "#4dff88"
                          : "#ff6c79"
                    }}
                  >
                    {r.meanReturn >= 0 ? "+" : ""}
                    {r.meanReturn}%
                  </div>
                </div>

                <div className="row-stats">
                  <span>n={r.n}</span>
                  <span>win {r.winRate}%</span>
                  <span>t={r.tStat}</span>
                  <span className="verdict">{v.text}</span>
                </div>

                {r.n < MIN_SAMPLE && (
                  <div className="minibar">
                    <div className="minifill" style={{ width: `${pct}%` }} />
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* ── Divergence hypothesis ── */}
      {divergence && (
        <div className="divergence">
          <div className="kicker small">Divergence hypothesis</div>

          <p className="explain">
            Price rising while breadth falls means the move is carried by fewer
            names. This is the one input here that price action alone cannot
            produce.
          </p>

          <div className="dgrid">
            <div>
              <small>DIVERGING</small>
              <strong>
                {divergence.diverging?.n
                  ? `${divergence.diverging.meanReturn >= 0 ? "+" : ""}${
                      divergence.diverging.meanReturn
                    }%`
                  : "—"}
              </strong>
              <span>n={divergence.diverging?.n || 0}</span>
            </div>

            <div>
              <small>ALIGNED</small>
              <strong>
                {divergence.aligned?.n
                  ? `${divergence.aligned.meanReturn >= 0 ? "+" : ""}${
                      divergence.aligned.meanReturn
                    }%`
                  : "—"}
              </strong>
              <span>n={divergence.aligned?.n || 0}</span>
            </div>
          </div>

          <p className="note">{divergence.note}</p>
        </div>
      )}

      <style jsx>{`
        .lab {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .kicker {
          font-size: 0.65rem;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #9eacbf;
        }
        .kicker.small {
          margin-bottom: 8px;
        }
        .horizons {
          display: flex;
          gap: 6px;
        }
        .horizons button {
          padding: 6px 13px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.04);
          color: #9eacbf;
          font-size: 0.75rem;
          font-weight: 700;
          cursor: pointer;
          transition: 0.18s;
        }
        .horizons button:hover {
          filter: brightness(1.3);
        }
        .horizons button.on {
          background: rgba(77, 255, 136, 0.12);
          border-color: rgba(77, 255, 136, 0.35);
          color: #dffff0;
        }
        .err {
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 0.8rem;
          background: rgba(255, 59, 77, 0.1);
          border: 1px solid rgba(255, 59, 77, 0.25);
          color: #ff9da6;
        }
        .progress-block {
          padding: 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .progress-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 9px;
        }
        .progress-top span {
          font-size: 0.8rem;
          color: #9eacbf;
        }
        .progress-top strong {
          font-size: 1.1rem;
          color: #f5f7fb;
        }
        .bar {
          height: 6px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.07);
          overflow: hidden;
        }
        .fill {
          height: 100%;
          background: linear-gradient(90deg, #7cffaa, #4dff88);
          transition: width 0.5s ease;
        }
        .progress-meta {
          margin-top: 9px;
          font-size: 0.72rem;
          color: #8d9aa8;
        }
        .headline {
          padding: 13px 15px;
          border-radius: 13px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .headline.found {
          background: rgba(77, 255, 136, 0.08);
          border: 1px solid rgba(77, 255, 136, 0.25);
        }
        .headline.waiting {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }
        .headline strong {
          font-size: 0.92rem;
          color: #f5f7fb;
        }
        .headline span {
          font-size: 0.76rem;
          color: #9eacbf;
          line-height: 1.5;
        }
        .idle {
          padding: 26px 14px;
          text-align: center;
          color: #8d9aa8;
          font-size: 0.85rem;
          line-height: 1.6;
        }
        .rows {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .row {
          padding: 12px 14px;
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .row.positive {
          border-color: rgba(77, 255, 136, 0.28);
          background: rgba(77, 255, 136, 0.05);
        }
        .row.negative {
          border-color: rgba(255, 108, 121, 0.28);
          background: rgba(255, 108, 121, 0.05);
        }
        .row-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
        }
        .transition {
          display: flex;
          align-items: center;
          gap: 7px;
          font-size: 0.88rem;
          font-weight: 700;
        }
        .icon {
          font-size: 0.8rem;
        }
        .arrow {
          color: #6b7785;
        }
        .mean {
          font-size: 1.05rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }
        .row-stats {
          display: flex;
          gap: 13px;
          margin-top: 7px;
          font-size: 0.72rem;
          color: #8d9aa8;
          flex-wrap: wrap;
        }
        .verdict {
          margin-left: auto;
          font-style: italic;
        }
        .minibar {
          height: 3px;
          margin-top: 9px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }
        .minifill {
          height: 100%;
          background: #4a5866;
          transition: width 0.4s ease;
        }
        .divergence {
          padding: 15px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .explain {
          margin: 0 0 13px;
          font-size: 0.78rem;
          color: #9eacbf;
          line-height: 1.6;
        }
        .dgrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .dgrid > div {
          padding: 12px;
          border-radius: 11px;
          background: rgba(0, 0, 0, 0.22);
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .dgrid small {
          font-size: 0.62rem;
          letter-spacing: 0.12em;
          color: #8d9aa8;
        }
        .dgrid strong {
          font-size: 1.15rem;
          color: #f5f7fb;
          font-variant-numeric: tabular-nums;
        }
        .dgrid span {
          font-size: 0.7rem;
          color: #8d9aa8;
        }
        .note {
          margin: 11px 0 0;
          font-size: 0.72rem;
          color: #8d9aa8;
          font-style: italic;
          line-height: 1.5;
        }
        @media (max-width: 640px) {
          .row-main {
            flex-direction: column;
            align-items: flex-start;
            gap: 5px;
          }
          .verdict {
            margin-left: 0;
          }
        }
      `}</style>
    </section>
  );
}
