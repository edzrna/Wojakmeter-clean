// ===============================
// WOJAKMETER — EDGE LAB (v2)
// components/desk/EdgeLab.jsx
//
// Shows the report the bot computes (/desk/lab/report) and the state
// of the pipeline behind it (/desk/lab/status). Nothing is judged in
// the browser: every verdict and every reason comes from the bot, so
// the panel cannot disagree with the numbers.
//
// What changed from v1:
//   - the horizon (1h / 4h / 24h) applies to everything on the panel,
//     hypotheses included (v1 asked for divergence without one)
//   - the linear model is one tap away: the lattice has to beat it
//   - five verdicts instead of "significant": insufficient, noise,
//     candidate (history only), confirmed (held after the freeze),
//     failed — each printed with its reason
//   - the pipeline is visible: history rebuild, recorder, mismatches
//     between live and rebuilt snapshots, Binance blocks
//
// Props, all optional:
//   report, status   answers to render instead of fetching (tests)
//   initialModel     "hex" | "linear"            (default "hex")
//   initialHorizon   "h1" | "h4" | "h24"         (default "h4")
//   refreshMs        refetch interval             (default 5 min)
//   client           (action, params, { signal }) => Promise<json>;
//                    default lib/desk/client. Pass a stable function.
//
// Styles are global but every selector starts with .wm-edge, because
// the sub-components below live outside styled-jsx's scope.
// ===============================

import { useCallback, useEffect, useMemo, useState } from "react";
import { deskCall } from "../../lib/desk/client";
import { MOOD_COLOR, fmtPct, fmtP, fmtNum, fmtInt, fmtWhen, moodName, finite } from "../../lib/desk/format";

const HORIZONS = [
  { key: "h1", label: "1h" },
  { key: "h4", label: "4h" },
  { key: "h24", label: "24h" }
];

const MODELS = [
  { key: "hex", label: "Lattice" },
  { key: "linear", label: "Linear" }
];

const VERDICT = {
  confirmed: { label: "confirmed", tone: "good", rank: 0 },
  pending: { label: "candidate", tone: "warn", rank: 1 },
  failed: { label: "failed live", tone: "bad", rank: 2 },
  noise: { label: "noise", tone: "mute", rank: 3 },
  insufficient: { label: "collecting", tone: "dim", rank: 4 }
};

const verdictOf = (v) => VERDICT[v] || { label: String(v || "unknown"), tone: "mute", rank: 5 };
const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function nText(n) {
  if (!n || typeof n !== "object") return "";
  return Object.entries(n)
    .map(([k, v]) => `${fmtInt(v)} ${k}`)
    .join(" · ");
}

function estimateText(side, unit) {
  if (!side || !side.testable) return "not testable yet";
  return unit === "rho" ? `Δρ ${fmtNum(side.estimate)}` : fmtPct(side.estimate);
}

function backfillText(b) {
  switch (b?.state) {
    case "done":
      return `History rebuilt since ${b.from}`;
    case "running":
      return `Rebuilding ${b.current || "history"}`;
    case "universes":
      return "Choosing each month's 20 contracts";
    default:
      return "History rebuild not started yet";
  }
}

function Chip({ verdict }) {
  const v = verdictOf(verdict);
  return <span className={`wm-chip wm-${v.tone}`}>{v.label}</span>;
}

function Bar({ value, max, tone = "dim" }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value / max) * 100))) : 0;
  return (
    <div className="wm-bar">
      <div className={`wm-fill wm-${tone}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function Pipeline({ status, report }) {
  if (!status) return <div className="wm-panel wm-muted">Loading the pipeline status…</div>;

  const b = status.backfill || {};
  const d = status.data || {};
  const cmp = d.liveVsBackfill || null;
  const missing = report?.health?.missingBoundaries;

  return (
    <div className="wm-panel">
      <div className="wm-panel-top">
        <span>{backfillText(b)}</span>
        <strong>{b.total ? `${b.done}/${b.total} months` : "—"}</strong>
      </div>
      <Bar value={b.done || 0} max={b.total || 0} tone="good" />

      <ul className="wm-facts">
        <li>
          {fmtInt(d.snapshots)} snapshots · {fmtInt(d.live)} recorded live · {fmtInt(d.backfill)} rebuilt
          {finite(missing) && missing > 0 ? ` · ${fmtInt(missing)} boundaries missing` : ""}
        </li>

        {finite(report?.freezeTs) ? (
          <li>
            Frozen {fmtWhen(report.freezeTs)}. History before it can only nominate; only data after it can confirm (
            {fmtInt(report.samples?.live?.snapshots)} snapshots so far).
          </li>
        ) : null}

        {status.recorder?.lastError ? (
          <li className="wm-warn-text">Recorder: {status.recorder.lastError}</li>
        ) : status.recorder?.lastResult ? (
          <li>Recorder: {status.recorder.lastResult}</li>
        ) : null}

        {cmp && cmp.compared > 0 ? (
          <li className={cmp.mismatches ? "wm-bad-text" : ""}>
            Live vs rebuilt: {plural(cmp.mismatches, "difference")} in {plural(cmp.compared, "check")}
            {cmp.coverageDiffs
              ? ` · ${plural(cmp.coverageDiffs, "live snapshot")} went without a contract that published late`
              : ""}
            {cmp.mismatches ? " — history and live are not measuring the same thing; check before trusting the report" : ""}
          </li>
        ) : null}
        {status.audit?.lastError ? <li className="wm-warn-text">Audit: {status.audit.lastError}</li> : null}

        {b.lastError ? <li className="wm-warn-text">History: {b.lastError}</li> : null}
        {Object.entries(b.skipped || {}).map(([month, why]) => (
          <li key={month} className="wm-warn-text">
            Skipped {month}: {why}
          </li>
        ))}
        {status.gaps?.lastError ? <li className="wm-warn-text">Gaps: {status.gaps.lastError}</li> : null}
        {status.binance?.blockReason ? <li className="wm-bad-text">Binance: {status.binance.blockReason}</li> : null}
        {status.service?.fatal ? <li className="wm-bad-text">{status.service.fatal}</li> : null}
        {status.config?.warning ? <li className="wm-warn-text">{status.config.warning}</li> : null}
      </ul>
    </div>
  );
}

function HypothesisExtra({ id, history, live }) {
  const hd = history?.detail || {};
  const ld = live?.detail || {};

  if (id === "H2") {
    return (
      <p className="wm-extra">
        Direct euphoria ↔ frustration jumps: {fmtInt(hd.directJumps ?? 0)} in history, {fmtInt(ld.directJumps ?? 0)} after
        the freeze.
        {hd.alike === false ? " In history the two extremes moved in opposite directions." : ""} This is the seam the
        lattice draws: if it fails, the linear scale was right to call them opposites.
      </p>
    );
  }

  if (id === "H3" && history?.testable) {
    const ci = Array.isArray(hd.ci95) ? hd.ci95 : [];
    return (
      <p className="wm-extra">
        ρ lattice {fmtNum(hd.rhoHex)} vs ρ linear {fmtNum(hd.rhoLinear)} · 95% interval of the difference [{fmtNum(ci[0])},{" "}
        {fmtNum(ci[1])}]
      </p>
    );
  }

  if (id === "H4" && history?.testable) {
    return (
      <p className="wm-extra">
        Diverging {fmtPct(hd.divergingMean)} vs aligned {fmtPct(hd.alignedMean)} (signed against BTC&apos;s 4 h move)
      </p>
    );
  }

  return null;
}

function Hypothesis({ hy, horizon }) {
  const cell = hy[horizon] || {};
  const v = verdictOf(cell.verdict);
  const history = cell.history || {};
  const live = cell.live || {};

  return (
    <article className={`wm-card wm-${v.tone}`}>
      <div className="wm-card-top">
        <div className="wm-title">
          <span className="wm-id">{hy.id}</span>
          {hy.title}
        </div>
        <Chip verdict={cell.verdict} />
      </div>

      <p className="wm-statement">{hy.statement}</p>
      <p className="wm-reason">{cell.reason}</p>

      <dl className="wm-nums">
        <div>
          <dt>History</dt>
          <dd>
            {estimateText(history, hy.unit)}
            {history.testable && finite(history.pHolm) ? ` · p_holm ${fmtP(history.pHolm)}` : ""}
          </dd>
          <dd className="wm-n">{nText(history.n)}</dd>
        </div>
        <div>
          <dt>After the freeze</dt>
          <dd>
            {estimateText(live, hy.unit)}
            {finite(live.pOne) ? ` · one-sided p ${fmtP(live.pOne)}` : ""}
          </dd>
          <dd className="wm-n">{nText(live.n)}</dd>
        </div>
      </dl>

      <HypothesisExtra id={hy.id} history={history} live={live} />

      <details className="wm-method">
        <summary>Method</summary>
        <p>{hy.method}</p>
      </details>
    </article>
  );
}

function TransitionRow({ row, horizon, minConfirm }) {
  const cell = row[horizon] || {};
  const v = verdictOf(cell.verdict);
  const history = cell.history || {};
  const live = cell.live || {};
  const sign = !finite(history.mean) ? "" : history.mean > 0 ? "wm-up" : history.mean < 0 ? "wm-down" : "";

  return (
    <article className={`wm-row wm-${v.tone}`}>
      <div className="wm-row-main">
        <div className="wm-transition">
          <span style={{ color: MOOD_COLOR[row.from] }}>{moodName(row.from)}</span>
          <span className="wm-arrow">→</span>
          <span style={{ color: MOOD_COLOR[row.to] }}>{moodName(row.to)}</span>
          {row.kind && row.kind !== "none" && row.kind !== "unknown" ? <span className="wm-kind">{row.kind}</span> : null}
        </div>
        <Chip verdict={cell.verdict} />
      </div>

      <div className="wm-row-stats">
        <span className={sign}>history {fmtPct(history.mean)}</span>
        <span>
          n {fmtInt(history.nEff)}
          {history.n > history.nEff ? ` of ${fmtInt(history.n)}` : ""}
        </span>
        {live.nEff > 0 ? (
          <span>
            after the freeze {fmtPct(live.mean)} · n {fmtInt(live.nEff)}
          </span>
        ) : null}
        <span>
          hex {row.hex ?? "—"} · linear {row.linear ?? "—"}
        </span>
      </div>

      <p className="wm-reason">{cell.reason}</p>
      {cell.verdict === "pending" ? <Bar value={live.nEff || 0} max={minConfirm} tone="warn" /> : null}
    </article>
  );
}

export default function EdgeLab({
  report = null,
  status = null,
  initialModel = "hex",
  initialHorizon = "h4",
  refreshMs = 5 * 60 * 1000,
  client = deskCall
}) {
  const fixed = Boolean(report);
  const [model, setModel] = useState(initialModel);
  const [horizon, setHorizon] = useState(initialHorizon);
  const [reports, setReports] = useState(report ? { [initialModel]: report } : {});
  const [labStatus, setLabStatus] = useState(status);
  const [error, setError] = useState(null);
  const [authProblem, setAuthProblem] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (signal) => {
      setLoading(true);
      try {
        const [r, s] = await Promise.all([
          client("lab-report", { model }, { signal }),
          client("lab-status", {}, { signal })
        ]);
        if (r?.ok) setReports((prev) => ({ ...prev, [model]: r }));
        if (s?.ok) setLabStatus(s);

        const failed = [r, s].find((x) => !x?.ok);
        setAuthProblem(Boolean(failed && failed.httpStatus === 401));
        setError(failed ? (failed.httpStatus === 401 ? "Session expired." : failed.error || "Could not load the lab.") : null);
      } catch (err) {
        if (err?.name !== "AbortError") setError(String(err?.message || err));
      } finally {
        setLoading(false);
      }
    },
    [client, model]
  );

  useEffect(() => {
    if (fixed) return undefined;
    const ctrl = new AbortController();
    load(ctrl.signal);
    const timer = setInterval(() => load(ctrl.signal), refreshMs);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, [fixed, load, refreshMs]);

  const rep = reports[model] || null;
  const ready = Boolean(rep && rep.ok && !rep.pending && rep.screen && rep.hypotheses);
  const hLabel = HORIZONS.find((h) => h.key === horizon)?.label || horizon;
  const minN = rep?.screen?.minN ?? 30;
  const minConfirm = rep?.screen?.minConfirm ?? 20;

  const { tested, collecting, counts } = useMemo(() => {
    const rows = ready ? rep.screen.rows : [];
    const tally = { confirmed: 0, pending: 0, failed: 0, noise: 0, insufficient: 0 };
    for (const r of rows) {
      const key = r[horizon]?.verdict;
      if (key in tally) tally[key]++;
    }
    const sorted = rows
      .slice()
      .sort(
        (a, b) =>
          verdictOf(a[horizon]?.verdict).rank - verdictOf(b[horizon]?.verdict).rank ||
          b.count - a.count ||
          (a.transition < b.transition ? -1 : 1)
      );
    return {
      tested: sorted.filter((r) => r[horizon]?.verdict !== "insufficient"),
      collecting: sorted.filter((r) => r[horizon]?.verdict === "insufficient"),
      counts: tally
    };
  }, [ready, rep, horizon]);

  return (
    <section className="card wm-edge">
      <div className="wm-head">
        <div className="wm-kicker">Edge Lab · measured, not predicted{loading && rep ? " · updating" : ""}</div>

        <div className="wm-toggles">
          <div className="wm-seg" role="group" aria-label="Model">
            {MODELS.map((m) => (
              <button key={m.key} type="button" className={model === m.key ? "on" : ""} aria-pressed={model === m.key} onClick={() => setModel(m.key)}>
                {m.label}
              </button>
            ))}
          </div>
          <div className="wm-seg" role="group" aria-label="Horizon">
            {HORIZONS.map((h) => (
              <button key={h.key} type="button" className={horizon === h.key ? "on" : ""} aria-pressed={horizon === h.key} onClick={() => setHorizon(h.key)}>
                {h.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {ready && rep.model ? (
        <p className="wm-model-note">
          <strong>{rep.model.version}</strong> · {rep.model.description}
          {model === "linear" ? " The old scale, kept as the baseline the lattice has to beat." : ""}
        </p>
      ) : null}

      {error ? (
        <div className="wm-err">
          {error}
          {authProblem ? (
            <>
              {" "}
              <a href="/desk/login">Log in again</a>
            </>
          ) : null}
        </div>
      ) : null}

      <Pipeline status={labStatus} report={ready ? rep : null} />

      {!rep ? <div className="wm-idle">{error ? "No report to show." : "Loading the report…"}</div> : null}
      {rep && rep.pending ? <div className="wm-idle">{rep.reason || "The first report is not ready yet."}</div> : null}
      {rep && rep.ok === false ? <div className="wm-err">{rep.error || rep.reason || "The bot could not produce this report."}</div> : null}

      {ready ? (
        <>
          <div className={`wm-headline${counts.confirmed ? " wm-good" : counts.pending ? " wm-warn" : ""}`}>
            {counts.confirmed ? (
              <>
                <strong>
                  {plural(counts.confirmed, "transition")} confirmed at {hLabel}
                </strong>
                <span>
                  Each cleared Holm across {rep.screen.family} tests in history, then held on data collected after the
                  freeze. Measured, not guaranteed.
                </span>
              </>
            ) : counts.pending ? (
              <>
                <strong>
                  {plural(counts.pending, "candidate")} at {hLabel}, waiting for data after the freeze
                </strong>
                <span>They cleared Holm in history. A candidate is not an edge until it holds on data it has never seen — most will not.</span>
              </>
            ) : (
              <>
                <strong>Nothing has cleared the bar at {hLabel}</strong>
                <span>
                  That is the expected answer for most transitions. {rep.screen.family ? `${rep.screen.family} tests ran in history; ` : ""}
                  each needs {minN} independent events before it is tested.
                </span>
              </>
            )}
            {counts.failed ? <span>{plural(counts.failed, "candidate")} failed after the freeze.</span> : null}
          </div>

          <div className="wm-section">Pre-registered hypotheses · {hLabel}</div>
          <div className="wm-cards">
            {rep.hypotheses.list.map((hy) => (
              <Hypothesis key={hy.id} hy={hy} horizon={horizon} />
            ))}
          </div>

          <div className="wm-section">Every transition · {hLabel}</div>
          <p className="wm-model-note">
            {fmtInt(rep.transitions.history)} transitions in history · {fmtInt(rep.transitions.live)} after the freeze ·{" "}
            {rep.transitions.types} of {rep.transitions.possible} kinds seen
            {rep.transitions.acrossGaps ? ` · ${fmtInt(rep.transitions.acrossGaps)} dropped across data gaps` : ""}
          </p>

          {tested.length ? (
            <div className="wm-rows">
              {tested.map((row) => (
                <TransitionRow key={row.transition} row={row} horizon={horizon} minConfirm={minConfirm} />
              ))}
            </div>
          ) : null}

          {collecting.length ? (
            <details className="wm-collecting">
              <summary>
                {plural(collecting.length, "transition")} still collecting — each needs {minN} independent events in
                history before it is tested
              </summary>
              <div className="wm-mini-list">
                {collecting.map((row) => {
                  const h = row[horizon]?.history || {};
                  return (
                    <div key={row.transition} className="wm-mini">
                      <span>
                        <span style={{ color: MOOD_COLOR[row.from] }}>{moodName(row.from)}</span>
                        <span className="wm-arrow"> → </span>
                        <span style={{ color: MOOD_COLOR[row.to] }}>{moodName(row.to)}</span>
                      </span>
                      <Bar value={h.nEff || 0} max={minN} />
                      <span className="wm-mini-n">
                        {fmtInt(h.nEff || 0)}/{minN}
                      </span>
                    </div>
                  );
                })}
              </div>
            </details>
          ) : null}

          <details className="wm-notes">
            <summary>How to read this</summary>
            <ul>
              {(rep.notes || []).map((note, i) => (
                <li key={i}>{note}</li>
              ))}
              {rep.context?.survivorship ? <li>{rep.context.survivorship}</li> : null}
            </ul>
          </details>
        </>
      ) : null}

      <style jsx global>{`
        .wm-edge {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .wm-edge .wm-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .wm-edge .wm-kicker {
          font-size: 0.65rem;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #9eacbf;
        }
        .wm-edge .wm-toggles {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .wm-edge .wm-seg {
          display: flex;
          gap: 6px;
        }
        .wm-edge .wm-seg button {
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
        .wm-edge .wm-seg button:hover {
          filter: brightness(1.3);
        }
        .wm-edge .wm-seg button.on {
          background: rgba(77, 255, 136, 0.12);
          border-color: rgba(77, 255, 136, 0.35);
          color: #dffff0;
        }
        .wm-edge .wm-model-note {
          margin: 0;
          font-size: 0.72rem;
          color: #8d9aa8;
          line-height: 1.5;
        }
        .wm-edge .wm-model-note strong {
          color: #cfd7e3;
        }
        .wm-edge .wm-err {
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 0.8rem;
          line-height: 1.5;
          background: rgba(255, 59, 77, 0.1);
          border: 1px solid rgba(255, 59, 77, 0.25);
          color: #ff9da6;
        }
        .wm-edge .wm-err a {
          color: #f5f7fb;
        }
        .wm-edge .wm-panel {
          padding: 14px;
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .wm-edge .wm-muted {
          font-size: 0.8rem;
          color: #8d9aa8;
        }
        .wm-edge .wm-panel-top {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 10px;
          margin-bottom: 9px;
          font-size: 0.8rem;
          color: #9eacbf;
        }
        .wm-edge .wm-panel-top strong {
          font-size: 0.95rem;
          color: #f5f7fb;
          font-variant-numeric: tabular-nums;
        }
        .wm-edge .wm-bar {
          height: 5px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.07);
          overflow: hidden;
        }
        .wm-edge .wm-fill {
          height: 100%;
          background: #4a5866;
          transition: width 0.5s ease;
        }
        .wm-edge .wm-fill.wm-good {
          background: linear-gradient(90deg, #7cffaa, #4dff88);
        }
        .wm-edge .wm-fill.wm-warn {
          background: #ffd166;
        }
        .wm-edge .wm-facts {
          margin: 10px 0 0;
          padding: 0;
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 5px;
          font-size: 0.74rem;
          color: #8d9aa8;
          line-height: 1.5;
        }
        .wm-edge .wm-warn-text {
          color: #ffd166;
        }
        .wm-edge .wm-bad-text {
          color: #ff9da6;
        }
        .wm-edge .wm-idle {
          padding: 22px 14px;
          text-align: center;
          color: #8d9aa8;
          font-size: 0.85rem;
          line-height: 1.6;
        }
        .wm-edge .wm-headline {
          padding: 13px 15px;
          border-radius: 13px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
        }
        .wm-edge .wm-headline.wm-good {
          background: rgba(77, 255, 136, 0.08);
          border-color: rgba(77, 255, 136, 0.25);
        }
        .wm-edge .wm-headline.wm-warn {
          background: rgba(255, 209, 102, 0.07);
          border-color: rgba(255, 209, 102, 0.25);
        }
        .wm-edge .wm-headline strong {
          font-size: 0.92rem;
          color: #f5f7fb;
        }
        .wm-edge .wm-headline span {
          font-size: 0.76rem;
          color: #9eacbf;
          line-height: 1.5;
        }
        .wm-edge .wm-section {
          margin-top: 4px;
          font-size: 0.62rem;
          font-weight: 900;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #8d9aa8;
        }
        .wm-edge .wm-cards,
        .wm-edge .wm-rows {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .wm-edge .wm-card,
        .wm-edge .wm-row {
          padding: 12px 14px;
          border-radius: 13px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.05);
        }
        .wm-edge .wm-card.wm-good,
        .wm-edge .wm-row.wm-good {
          border-color: rgba(77, 255, 136, 0.28);
          background: rgba(77, 255, 136, 0.05);
        }
        .wm-edge .wm-card.wm-warn,
        .wm-edge .wm-row.wm-warn {
          border-color: rgba(255, 209, 102, 0.28);
          background: rgba(255, 209, 102, 0.04);
        }
        .wm-edge .wm-card.wm-bad,
        .wm-edge .wm-row.wm-bad {
          border-color: rgba(255, 108, 121, 0.25);
          background: rgba(255, 108, 121, 0.04);
        }
        .wm-edge .wm-card-top,
        .wm-edge .wm-row-main {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .wm-edge .wm-title {
          font-size: 0.86rem;
          font-weight: 700;
          color: #f5f7fb;
        }
        .wm-edge .wm-id {
          margin-right: 6px;
          color: #8d9aa8;
        }
        .wm-edge .wm-statement {
          margin: 7px 0 0;
          font-size: 0.76rem;
          color: #9eacbf;
          line-height: 1.5;
        }
        .wm-edge .wm-reason {
          margin: 7px 0 0;
          font-size: 0.72rem;
          color: #cfd7e3;
          line-height: 1.5;
          font-variant-numeric: tabular-nums;
        }
        .wm-edge .wm-nums {
          margin: 9px 0 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .wm-edge .wm-nums > div {
          padding: 9px 10px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.22);
        }
        .wm-edge .wm-nums dt {
          font-size: 0.6rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #8d9aa8;
        }
        .wm-edge .wm-nums dd {
          margin: 3px 0 0;
          font-size: 0.8rem;
          color: #f5f7fb;
          font-variant-numeric: tabular-nums;
        }
        .wm-edge .wm-nums dd.wm-n {
          font-size: 0.68rem;
          color: #8d9aa8;
        }
        .wm-edge .wm-extra {
          margin: 8px 0 0;
          font-size: 0.72rem;
          color: #9eacbf;
          line-height: 1.5;
        }
        .wm-edge details summary {
          cursor: pointer;
          font-size: 0.74rem;
          color: #8d9aa8;
          line-height: 1.5;
        }
        .wm-edge .wm-method {
          margin-top: 8px;
        }
        .wm-edge .wm-method p {
          margin: 6px 0 0;
          font-size: 0.72rem;
          color: #9eacbf;
          line-height: 1.5;
        }
        .wm-edge .wm-chip {
          flex-shrink: 0;
          padding: 3px 9px;
          border-radius: 999px;
          font-size: 0.62rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border: 1px solid rgba(255, 255, 255, 0.12);
          color: #9eacbf;
        }
        .wm-edge .wm-chip.wm-good {
          color: #4dff88;
          border-color: rgba(77, 255, 136, 0.4);
        }
        .wm-edge .wm-chip.wm-warn {
          color: #ffd166;
          border-color: rgba(255, 209, 102, 0.4);
        }
        .wm-edge .wm-chip.wm-bad {
          color: #ff9da6;
          border-color: rgba(255, 108, 121, 0.4);
        }
        .wm-edge .wm-chip.wm-dim {
          color: #6b7785;
        }
        .wm-edge .wm-transition {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
          font-size: 0.86rem;
          font-weight: 700;
        }
        .wm-edge .wm-arrow {
          color: #6b7785;
        }
        .wm-edge .wm-kind {
          font-size: 0.62rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #6b7785;
        }
        .wm-edge .wm-row-stats {
          display: flex;
          gap: 12px;
          margin-top: 7px;
          flex-wrap: wrap;
          font-size: 0.72rem;
          color: #8d9aa8;
          font-variant-numeric: tabular-nums;
        }
        .wm-edge .wm-up {
          color: #4dff88;
        }
        .wm-edge .wm-down {
          color: #ff6c79;
        }
        .wm-edge .wm-row .wm-bar {
          margin-top: 9px;
          height: 3px;
        }
        .wm-edge .wm-mini-list {
          display: flex;
          flex-direction: column;
          gap: 7px;
          margin-top: 10px;
        }
        .wm-edge .wm-mini {
          display: grid;
          grid-template-columns: minmax(0, 1.6fr) 1fr auto;
          gap: 10px;
          align-items: center;
          font-size: 0.74rem;
          font-weight: 600;
        }
        .wm-edge .wm-mini-n {
          color: #8d9aa8;
          font-variant-numeric: tabular-nums;
        }
        .wm-edge .wm-notes ul {
          margin: 8px 0 0;
          padding-left: 18px;
          font-size: 0.72rem;
          color: #9eacbf;
          line-height: 1.6;
        }
        @media (max-width: 640px) {
          .wm-edge .wm-nums {
            grid-template-columns: 1fr;
          }
          .wm-edge .wm-mini {
            grid-template-columns: 1fr;
            gap: 4px;
          }
        }
      `}</style>
    </section>
  );
}
