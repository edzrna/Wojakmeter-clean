// ===============================
// WOJAKMETER — EMOTION LATTICE (v2)
// components/desk/HexLattice.jsx
//
// v1 drew seven labels and highlighted one. v2 plots where the market
// actually is, on two measured axes:
//
//   across  direction — share of the top 20 contracts up over 24 h
//   down    intensity — last hour's range against the same hour over
//           the previous 30 days (down = more violent than usual)
//
// A cell is the region nearest its centre, so the dot and the lit
// cell always agree. The geometry comes from the bot (/desk/lab/state),
// the same object its classifier uses: the browser keeps no copy.
//
// The seams (euphoria touching frustration, optimism touching doubt)
// are hypotheses the Edge Lab is testing, not findings. v1 stated
// them as facts; this panel says what they are.
//
// Props, all optional:
//   data       a /desk/lab/state answer to render instead of fetching
//   refreshMs  refetch interval (default 60 s; data changes every 15 min)
//   onSelect   (cell) => void — makes the cells clickable
//   client     (action, params, { signal }) => Promise<json>; default
//              lib/desk/client. Pass a stable function.
// ===============================

import { useCallback, useEffect, useMemo, useState } from "react";
import { deskCall } from "../../lib/desk/client";
import { MOOD_COLOR, fmtTime, fmtWhen, fmtShare, fmtInt, moodName, finite } from "../../lib/desk/format";

const UNIT = 100;      // px per lattice unit
const HALF_X = 2.25;   // half the drawing, in lattice units
const HALF_Y = 1.95;
const GAP = 0.03;      // space between cells, in lattice units
const STEP_MS = 15 * 60 * 1000;

// Pointy-top hexagon; SVG y grows downward, which is "more violent"
function hexPoints(cx, cy, radius) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i + 30);
    pts.push(`${((cx + radius * Math.cos(a)) * UNIT).toFixed(1)},${((cy + radius * Math.sin(a)) * UNIT).toFixed(1)}`);
  }
  return pts.join(" ");
}

// Extreme readings stay on the drawing
const clamp = (v, half) => Math.max(-half + 0.08, Math.min(half - 0.08, v));

function ordinal(n) {
  const s = n % 100;
  if (s >= 11 && s <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] || "th"}`;
}

export default function HexLattice({ data = null, refreshMs = 60_000, onSelect, client = deskCall }) {
  const [state, setState] = useState(data);
  const [error, setError] = useState(null);

  const load = useCallback(
    async (signal) => {
      try {
        const r = await client("lab-state", { model: "hex" }, { signal });
        if (r && r.ok) {
          setState(r);
          setError(null);
        } else {
          setError(r?.httpStatus === 401 ? "Session expired. Log in again." : r?.error || "Could not load the lattice.");
        }
      } catch (err) {
        if (err?.name !== "AbortError") setError(String(err?.message || err));
      }
    },
    [client]
  );

  useEffect(() => {
    if (data) {
      setState(data);
      return undefined;
    }
    const ctrl = new AbortController();
    load(ctrl.signal);
    const timer = setInterval(() => load(ctrl.signal), refreshMs);
    return () => {
      ctrl.abort();
      clearInterval(timer);
    };
  }, [data, load, refreshMs]);

  const geometry = state?.geometry || null;
  const radius = (finite(geometry?.cellRadius) ? geometry.cellRadius : 1 / Math.sqrt(3)) - GAP;

  const cells = useMemo(
    () => (geometry ? Object.entries(geometry.cells).map(([mood, c]) => ({ mood, x: c.x, y: c.y })) : []),
    [geometry]
  );

  const share = state?.occupancy?.share || null;
  const maxShare = share ? Math.max(0.0001, ...Object.values(share).filter(finite)) : 1;

  // The last 24 h as a line, broken wherever a snapshot is missing
  const trail = state?.trail;
  const segments = useMemo(() => {
    const list = Array.isArray(trail) ? trail : [];
    const out = [];
    for (let i = 1; i < list.length; i++) {
      const a = list[i - 1];
      const b = list[i];
      if (b.ts - a.ts !== STEP_MS) continue;
      out.push({
        key: b.ts,
        x1: clamp(a.x, HALF_X) * UNIT,
        y1: clamp(a.y, HALF_Y) * UNIT,
        x2: clamp(b.x, HALF_X) * UNIT,
        y2: clamp(b.y, HALF_Y) * UNIT,
        opacity: 0.1 + 0.6 * (i / (list.length - 1))
      });
    }
    return out;
  }, [trail]);

  const cell = state?.cell || null;
  const point = state?.point && finite(state.point.x) && finite(state.point.y) ? state.point : null;
  const confirmed = state?.confirmed || null;
  const inputs = state?.inputs || null;
  const colour = (cell && MOOD_COLOR[cell]) || "#cfd7e3";
  const clickable = typeof onSelect === "function";

  let confirmText = "";
  if (cell) {
    if (confirmed && confirmed.cell === cell) confirmText = `confirmed since ${fmtWhen(confirmed.since)}`;
    else if (confirmed) confirmText = `not confirmed yet · last confirmed ${moodName(confirmed.cell)} since ${fmtWhen(confirmed.since)}`;
    else confirmText = "not confirmed yet";
    confirmText += ` · as of ${fmtTime(state.ts)}`;
  }

  const idleText = !state ? (error ? null : "Loading the lattice…") : !cell ? state.reason || "No state yet." : null;

  return (
    <section className="card lattice">
      <div className="kicker">Emotion lattice · direction × intensity</div>

      {error ? <div className="err">{error}</div> : null}
      {state?.stale ? <div className="warn">{state.stale}. The recorder may be down — see the lab status.</div> : null}

      <div className="now">
        {cell ? (
          <>
            <span className="now-label">Now</span>
            <strong style={{ color: colour }}>{moodName(cell)}</strong>
            <span className="now-meta">{confirmText}</span>
          </>
        ) : idleText ? (
          <span className="now-meta">{idleText}</span>
        ) : null}
      </div>

      {geometry ? (
        <svg
          viewBox={`${-HALF_X * UNIT} ${-HALF_Y * UNIT} ${2 * HALF_X * UNIT} ${2 * HALF_Y * UNIT}`}
          className="plane"
          role="img"
          aria-label={cell ? `Emotion lattice: the market is in ${moodName(cell)}` : "Emotion lattice"}
        >
          <text className="axis" x={0} y={-HALF_Y * UNIT + 16} textAnchor="middle">▲ calm</text>
          <text className="axis" x={0} y={HALF_Y * UNIT - 6} textAnchor="middle">violent ▼</text>
          <text className="axis" x={-HALF_X * UNIT + 4} y={4} textAnchor="start">◀ falling</text>
          <text className="axis" x={HALF_X * UNIT - 4} y={4} textAnchor="end">rising ▶</text>

          {cells.map(({ mood, x, y }) => {
            const active = mood === cell;
            const color = MOOD_COLOR[mood] || "#cfd7e3";
            const s = share && finite(share[mood]) ? share[mood] : null;
            const weight = s === null ? 0 : s / maxShare;

            return (
              <g
                key={mood}
                className={`cell${active ? " active" : ""}${clickable ? " clickable" : ""}`}
                onClick={clickable ? () => onSelect(mood) : undefined}
                onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") onSelect(mood); } : undefined}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
              >
                <polygon
                  points={hexPoints(x, y, radius)}
                  fill={color}
                  fillOpacity={active ? 0.24 : 0.04 + weight * 0.14}
                  stroke={color}
                  strokeOpacity={active ? 0.95 : 0.25}
                  strokeWidth={active ? 2.4 : 1.2}
                />
                <text
                  x={x * UNIT}
                  y={y * UNIT - 3}
                  textAnchor="middle"
                  className="name"
                  fill={active ? color : "#9eacbf"}
                  fontWeight={active ? 800 : 600}
                >
                  {moodName(mood)}
                </text>
                {s !== null ? (
                  <text x={x * UNIT} y={y * UNIT + 14} textAnchor="middle" className="share" fill={active ? color : "#6b7785"}>
                    {fmtShare(s)}
                  </text>
                ) : null}
              </g>
            );
          })}

          {segments.map((s) => (
            <line
              key={s.key}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke="#cfd7e3"
              strokeOpacity={s.opacity}
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          ))}

          {point ? (
            <g className="dot">
              <circle cx={clamp(point.x, HALF_X) * UNIT} cy={clamp(point.y, HALF_Y) * UNIT} r="12" fill={colour} fillOpacity="0.18" />
              <circle cx={clamp(point.x, HALF_X) * UNIT} cy={clamp(point.y, HALF_Y) * UNIT} r="5" fill={colour} stroke="#0b0f14" strokeWidth="1.5" />
            </g>
          ) : null}
        </svg>
      ) : null}

      {inputs ? (
        <p className="inputs">
          <strong>{fmtInt(inputs.up)}</strong> of {fmtInt(inputs.coverage)} contracts up over 24 h
          {inputs.universeN > inputs.coverage ? ` (${inputs.universeN - inputs.coverage} of ${inputs.universeN} did not report)` : ""}
          {finite(inputs.activationPct) ? (
            <>
              {" "}· last hour&apos;s range at the <strong>{ordinal(Math.round(inputs.activationPct * 100))}</strong> percentile for this time of day
            </>
          ) : (
            " · intensity needs 7 days of history"
          )}
        </p>
      ) : null}

      <p className="explain">
        Across is <strong>direction</strong>: how much of the top 20 is up over 24 h. Down is <strong>intensity</strong>:
        how unusual the last hour&apos;s range is for this time of day. Each cell is the region nearest its centre, so the
        dot decides the cell.
        {share && state?.occupancy
          ? ` Shading is the share of the last ${state.occupancy.windowDays} days spent in each cell (${fmtInt(state.occupancy.samples)} snapshots); the line is the last 24 h.`
          : ""}
      </p>

      <p className="explain honest">
        The seams — <strong>euphoria touching frustration</strong>, optimism touching doubt — are hypotheses the Edge Lab is
        testing, not findings. Until one holds on data collected after the freeze, the lattice is a way of drawing the
        market, not a claim about it.
      </p>

      <style jsx>{`
        .lattice {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 18px;
        }
        .kicker {
          font-size: 0.65rem;
          font-weight: 900;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #9eacbf;
        }
        .err,
        .warn {
          padding: 10px 12px;
          border-radius: 10px;
          font-size: 0.8rem;
          line-height: 1.5;
        }
        .err {
          background: rgba(255, 59, 77, 0.1);
          border: 1px solid rgba(255, 59, 77, 0.25);
          color: #ff9da6;
        }
        .warn {
          background: rgba(255, 209, 102, 0.08);
          border: 1px solid rgba(255, 209, 102, 0.25);
          color: #ffd166;
        }
        .now {
          display: flex;
          align-items: baseline;
          gap: 8px;
          flex-wrap: wrap;
          min-height: 1.4em;
        }
        .now-label {
          font-size: 0.7rem;
          color: #6b7785;
          text-transform: uppercase;
          letter-spacing: 0.12em;
        }
        .now strong {
          font-size: 1.15rem;
        }
        .now-meta {
          font-size: 0.74rem;
          color: #8d9aa8;
          line-height: 1.5;
        }
        .plane {
          width: 100%;
          max-width: 440px;
          margin: 0 auto;
          display: block;
          overflow: visible;
        }
        .axis {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          fill: #6b7785;
        }
        .cell.clickable {
          cursor: pointer;
        }
        .cell.clickable:hover polygon {
          fill-opacity: 0.2;
        }
        .cell.active polygon {
          filter: drop-shadow(0 0 12px currentColor);
        }
        .name {
          font-size: 12px;
          letter-spacing: 0.02em;
          pointer-events: none;
        }
        .share {
          font-size: 11px;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          pointer-events: none;
        }
        .inputs {
          margin: 0;
          font-size: 0.78rem;
          color: #9eacbf;
          line-height: 1.6;
        }
        .inputs strong {
          color: #f5f7fb;
        }
        .explain {
          margin: 0;
          font-size: 0.76rem;
          line-height: 1.6;
          color: #8d9aa8;
        }
        .explain strong {
          color: #cfd7e3;
        }
        .explain.honest {
          padding: 10px 12px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.025);
          border: 1px dashed rgba(255, 255, 255, 0.09);
        }
        @media (max-width: 640px) {
          .name {
            font-size: 11px;
          }
        }
      `}</style>
    </section>
  );
}
