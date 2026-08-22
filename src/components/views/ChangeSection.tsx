/**
 * How the organisation changed — the history section of the overview.
 *
 * This used to be a tab called "Timeline", and the name was the problem: it
 * told a reader the shape of the thing rather than the question it answers.
 * Nobody arrives at an HR tool wanting a timeline. They arrive wanting to
 * know whether the place actually grew. So the section is named after the
 * question, and it sits on the overview — the page that already claims to say
 * what the records contain — instead of behind a tab of its own.
 *
 * Two modes, because two different questions get asked of this data:
 *
 *   Quarter by quarter   the line   HOW BIG — people in a seat each quarter.
 *                        the strip  HOW BUSY — jobs opened, by state.
 *   Job by job           one row per seat, created to closed.
 *
 * Hover reads, click commits. Moving the pointer shows the numbers for a
 * quarter; clicking selects it, and the ledger below follows. Keeping those
 * two apart is what lets the chart be a control without the selection and the
 * chart ever disagreeing — the previous version had to guess a "sensible"
 * year when the selection pointed somewhere empty, and the guess was visible.
 *
 * One honesty problem shapes the whole strip. Forty-four of this file's
 * eighty-four seats "open" in the first quarter, because that is where the
 * records begin, not because the bank hired forty-four people that January.
 * Scaling the columns to that number would flatten every real quarter to a
 * pixel. So the opening quarter is drawn hatched — the interface's mark for
 * WE DO NOT KNOW — labelled, excluded from the scale, and never counted as
 * growth. This is the same correction metrics.ts makes to the headline.
 */

import { useMemo, useRef, useState } from 'react';
import type { LineageRelation, Metrics, OrgModel } from '../../domain/types.ts';
import { WINDOW_START_YEAR, formatMonthYear, quarterLabel, toQuarterIndex } from '../../domain/dates.ts';
import { Badge } from '../ui/primitives.tsx';
import { STATE, stateOf, type State } from '../ui/vocabulary.tsx';

interface Row {
  positionId: string;
  title: string;
  division: string;
  orgUnit: string;
  holder: string | null;
  holderId: string | null;
  relation: LineageRelation;
  state: State;
  fromQ: number;
  closedQ: number | null;
  toQ: number;
  openEnded: boolean;
  createdAt: string | null;
  closedAt: string | null;
}

/** Per-quarter figures. Everything the trend view draws comes from here. */
interface QStat {
  q: number;
  headcount: number;
  opened: number;
  closed: number;
  byState: Record<State, number>;
}

/* ---- Plot geometry ------------------------------------------------------
 *
 * One viewBox, uniformly scaled, so the crosshair can cross the line plot and
 * the activity strip as a single element. Strokes are non-scaling so a 2px
 * line is 2px at every container width.
 */
const W = 960;
const PAD = { l: 46, r: 16, t: 16 };
const LINE_H = 168;
const GAP = 18;
const STRIP_H = 52;
const AXIS_H = 34;
const PLOT_TOP = PAD.t;
const PLOT_BOT = PAD.t + LINE_H;
const STRIP_TOP = PLOT_BOT + GAP;
const STRIP_BOT = STRIP_TOP + STRIP_H;
const H = STRIP_BOT + AXIS_H;

/** The quarter the records start in. Its "openings" are inheritance, not growth. */
const BASELINE_Q = 0;

/** Round numbers on the y axis, at most seven intervals. */
function axisTicks(max: number): { ceiling: number; values: number[] } {
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  const step = steps.find((s) => Math.ceil(max / s) <= 7) ?? 2000;
  const ceiling = Math.max(Math.ceil(max / step) * step, step);
  const values: number[] = [];
  for (let v = 0; v <= ceiling; v += step) values.push(v);
  return { ceiling, values };
}

export function ChangeSection({
  model, metrics, quarter, onQuarterChange, onOpenPosition, onOpenPerson,
}: {
  model: OrgModel;
  metrics: Metrics;
  quarter: number;
  onQuarterChange: (q: number) => void;
  onOpenPosition: (id: string) => void;
  onOpenPerson: (id: string) => void;
}) {
  const N = model.window.quarterCount;
  const [mode, setMode] = useState<'trend' | 'job'>('trend');
  const [ledger, setLedger] = useState<'opened' | 'closed'>('opened');
  const [hoverQ, setHoverQ] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const rows: Row[] = useMemo(() => {
    return [...model.positions.values()].map((pos) => {
      const verdict = model.lineage.get(pos.id);
      const relation = verdict?.relation ?? 'created';

      // The most recent occupant is the one a reader is asking about.
      const assignments = pos.assignmentIds.map((id) => model.assignments.get(id)!);
      const latest = assignments[assignments.length - 1];
      const person = latest ? model.people.get(latest.personId) : null;
      const closedQ = pos.closedAt ? toQuarterIndex(pos.closedAt) : null;

      return {
        positionId: pos.id,
        title: pos.title,
        division: pos.division,
        orgUnit: pos.orgUnit,
        holder: person?.name ?? null,
        holderId: person?.id ?? null,
        relation,
        state: stateOf(relation, verdict?.needsReview ?? false),
        fromQ: toQuarterIndex(pos.createdAt) ?? 0,
        closedQ,
        toQ: closedQ ?? N - 1,
        openEnded: !pos.closedAt,
        createdAt: pos.createdAt,
        closedAt: pos.closedAt,
      };
    }).sort((a, b) => b.fromQ - a.fromQ || a.title.localeCompare(b.title));
  }, [model, N]);

  /** Every quarter in the window, whether or not anything happened in it. */
  const stats: QStat[] = useMemo(() => {
    const out: QStat[] = Array.from({ length: N }, (_, q) => ({
      q,
      headcount: metrics.headcountByQuarter[q] ?? 0,
      opened: 0,
      closed: 0,
      byState: { settled: 0, check: 0, new: 0 },
    }));
    for (const r of rows) {
      const open = out[r.fromQ];
      if (open) { open.opened++; open.byState[r.state]++; }
      if (r.closedQ !== null && out[r.closedQ]) out[r.closedQ].closed++;
    }
    return out;
  }, [rows, N, metrics]);

  /** Years, with the quarter each one starts and ends on. */
  const yearSpans = useMemo(() => {
    const out: Array<{ year: number; from: number; to: number }> = [];
    for (let q = 0; q < N; q++) {
      const year = WINDOW_START_YEAR + Math.floor(q / 4);
      const last = out[out.length - 1];
      if (last && last.year === year) last.to = q;
      else out.push({ year, from: q, to: q });
    }
    return out;
  }, [N]);

  const step = (W - PAD.l - PAD.r) / N;
  const x = (q: number) => PAD.l + (q + 0.5) * step;
  const bandLeft = (q: number) => PAD.l + q * step;

  const { ceiling, values: ticks } = useMemo(
    () => axisTicks(Math.max(...stats.map((s) => s.headcount), 1)),
    [stats],
  );
  const y = (v: number) => PLOT_BOT - (v / ceiling) * LINE_H;

  /** The strip is scaled to real quarters only — see the note at the top. */
  const stripCeiling = Math.max(...stats.filter((s) => s.q !== BASELINE_Q).map((s) => s.opened), 1);
  const stripY = (v: number) => (v / stripCeiling) * STRIP_H;

  const linePoints = stats.map((s) => `${x(s.q).toFixed(1)},${y(s.headcount).toFixed(1)}`).join(' ');
  const areaPath =
    `M ${x(0).toFixed(1)},${PLOT_BOT} ` +
    stats.map((s) => `L ${x(s.q).toFixed(1)},${y(s.headcount).toFixed(1)}`).join(' ') +
    ` L ${x(N - 1).toFixed(1)},${PLOT_BOT} Z`;

  /* ---- Hover reads, click commits ------------------------------------- */

  const activeQ = hoverQ ?? quarter;
  const active = stats[activeQ] ?? stats[stats.length - 1];
  const previous = stats[activeQ - 1] ?? null;
  const netQuarter = previous ? active.headcount - previous.headcount : 0;
  const netStart = active.headcount - (metrics.headcountStart ?? 0);

  function quarterAt(clientX: number): number {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return quarter;
    const viewX = ((clientX - rect.left) / rect.width) * W;
    return Math.max(0, Math.min(N - 1, Math.round((viewX - PAD.l) / step - 0.5)));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const delta = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (delta === 0) return;
    e.preventDefault();
    onQuarterChange(Math.max(0, Math.min(N - 1, quarter + delta)));
  }

  /**
   * The read sits BESIDE the rule, never centred on it — a panel over the
   * pointer covers the line it is there to describe. It flips to the other
   * side once the pointer passes the middle, so it never leaves the card.
   */
  const tipPct = (x(activeQ) / W) * 100;
  const tipShift = tipPct > 55 ? 'calc(-100% - 14px)' : '14px';

  /* ---- What the selected quarter contains ------------------------------ */

  const openedRows = rows.filter((r) => r.fromQ === quarter);
  const closedRows = rows.filter((r) => r.closedQ === quarter);
  const tableRows = ledger === 'opened' ? openedRows : closedRows;

  /**
   * The opening quarter is inheritance, not hiring, and the ledger has to say
   * so in the same breath as the chart does. Without this the readout dashes
   * the figure out as "not growth" while the list underneath cheerfully calls
   * the same forty-four seats "opened".
   */
  const atBaseline = quarter === BASELINE_Q;

  /** Somewhere to go when a quarter is empty, instead of an empty table. */
  const nearest = useMemo(() => {
    const live = stats
      .filter((s) => (ledger === 'opened' ? s.opened : s.closed) > 0 && s.q !== quarter)
      .map((s) => s.q);
    return live
      .sort((a, b) => Math.abs(a - quarter) - Math.abs(b - quarter))
      .slice(0, 3)
      .sort((a, b) => a - b);
  }, [stats, quarter, ledger]);

  return (
    <section className="stack gap-5" id="how-it-changed">
      <div className="row spread gap-4 wrap" style={{ alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>How the organisation changed</div>
          <div className="small muted" style={{ marginTop: 3, maxWidth: '68ch' }}>
            {yearSpans[0]?.year}–{yearSpans[yearSpans.length - 1]?.year}. How many people
            were in a seat, and which jobs opened and closed underneath them.
          </div>
        </div>

        <div className="segmented no-print">
          <button aria-pressed={mode === 'trend'} onClick={() => setMode('trend')}>Quarter by quarter</button>
          <button aria-pressed={mode === 'job'} onClick={() => setMode('job')}>Job by job</button>
        </div>
      </div>

      {/* ---- How to read this -------------------------------------------- */}
      <div className="readme-strip">
        <div className="readme-key">
          <span className="eyebrow">How to read this</span>
        </div>
        {(['settled', 'check', 'new'] as State[]).map((k) => (
          <div className="readme-key" key={k}>
            <span className="readme-swatch" style={{ background: STATE[k].bar }} />
            <span><b>{STATE[k].label}</b><span>{STATE[k].meaning}</span></span>
          </div>
        ))}
      </div>

      {mode === 'trend' ? (
        <>
          <div className="card">
            <div className="row spread gap-4 wrap" style={{ alignItems: 'flex-start' }}>
              {/*
                * No heading here. The section above already named this, and a card
                * that repeats its own section title pushes the chart down a line
                * for nothing. What a reader needs at this point is not the name
                * again, it is how to work the thing.
                */}
              <div className="small muted" style={{ maxWidth: '30ch', paddingTop: 2 }}>
                Hover to read a quarter. Click to select it &mdash; the ledger below follows.
              </div>

              {/* The numbers, always on screen, for whichever quarter is live. */}
              <div className="tl2-readout" data-hover={hoverQ !== null}>
                <div className="tl2-read">
                  <span>Quarter</span>
                  <b>{quarterLabel(activeQ)}</b>
                </div>
                <div className="tl2-read">
                  <span>People</span>
                  <b className="tnum">{active.headcount}</b>
                  <i className="tnum" data-dir={netQuarter > 0 ? 'up' : netQuarter < 0 ? 'down' : 'flat'}>
                    {netQuarter > 0 ? '+' : netQuarter < 0 ? '−' : '±'}{Math.abs(netQuarter)}
                  </i>
                </div>
                <div className="tl2-read">
                  <span>Opened</span>
                  <b className="tnum">{activeQ === BASELINE_Q ? '—' : active.opened}</b>
                </div>
                <div className="tl2-read">
                  <span>Closed</span>
                  <b className="tnum">{active.closed}</b>
                </div>
                <div className="tl2-read">
                  <span>Vs {quarterLabel(0)}</span>
                  <b className="tnum">{netStart > 0 ? '+' : netStart < 0 ? '−' : '±'}{Math.abs(netStart)}</b>
                </div>
              </div>
            </div>

            <div className="tl2-legend">
              <span><i className="tl2-mark-line" aria-hidden="true" /> People in a seat</span>
              <span><i className="tl2-mark-col" aria-hidden="true" /> Jobs opened that quarter</span>
              <span><i className="tl2-mark-ref" aria-hidden="true" /> {quarterLabel(0)} level ({metrics.headcountStart})</span>
              <span><i className="tl2-mark-hatch" aria-hidden="true" /> Before the records</span>
            </div>

            <div className="tl2-scroll scroll-x">
              <div
                className="tl2-frame"
                role="slider"
                tabIndex={0}
                aria-label="Quarter"
                aria-valuemin={0}
                aria-valuemax={N - 1}
                aria-valuenow={quarter}
                aria-valuetext={`${quarterLabel(quarter)}: ${stats[quarter]?.headcount ?? 0} people, ${stats[quarter]?.opened ?? 0} jobs opened, ${stats[quarter]?.closed ?? 0} closed`}
                onKeyDown={onKeyDown}
              >
                <svg
                  ref={svgRef}
                  className="tl2-svg"
                  viewBox={`0 0 ${W} ${H}`}
                  onPointerMove={(e) => setHoverQ(quarterAt(e.clientX))}
                  onPointerLeave={() => setHoverQ(null)}
                  onPointerDown={(e) => onQuarterChange(quarterAt(e.clientX))}
                >
                  <defs>
                    <linearGradient id="tl2-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--ink)" stopOpacity="0.16" />
                      <stop offset="100%" stopColor="var(--ink)" stopOpacity="0.01" />
                    </linearGradient>
                    <pattern id="tl2-hatch" width="8" height="8" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
                      <rect width="8" height="8" fill="var(--surface)" />
                      <rect width="4" height="8" fill="var(--surface-3)" />
                    </pattern>
                  </defs>

                  {/* Alternating year bands, so the eye can count years without the axis. */}
                  {yearSpans.map((s, i) => (
                    i % 2 === 1 ? (
                      <rect
                        key={`band-${s.year}`}
                        x={bandLeft(s.from)}
                        y={PLOT_TOP}
                        width={(s.to - s.from + 1) * step}
                        height={STRIP_BOT - PLOT_TOP}
                        fill="var(--surface-2)"
                      />
                    ) : null
                  ))}

                  {/* The opening quarter: inherited, not grown. */}
                  <rect
                    x={bandLeft(BASELINE_Q)}
                    y={PLOT_TOP}
                    width={step}
                    height={STRIP_BOT - PLOT_TOP}
                    fill="url(#tl2-hatch)"
                    opacity="0.9"
                  />

                  {/* Y axis */}
                  {ticks.map((t) => (
                    <g key={t}>
                      <line
                        x1={PAD.l} y1={y(t)} x2={W - PAD.r} y2={y(t)}
                        stroke={t === 0 ? 'var(--line)' : 'var(--line-soft)'}
                        strokeWidth="1" vectorEffect="non-scaling-stroke"
                      />
                      <text x={PAD.l - 9} y={y(t) + 3.5} className="tl2-tick" textAnchor="end">{t}</text>
                    </g>
                  ))}

                  {/* Where the window started, so growth above it is readable. */}
                  <line
                    x1={PAD.l} y1={y(metrics.headcountStart)} x2={W - PAD.r} y2={y(metrics.headcountStart)}
                    stroke="var(--ink-4)" strokeWidth="1" strokeDasharray="5 4" vectorEffect="non-scaling-stroke"
                  />

                  <path d={areaPath} fill="url(#tl2-fill)" />
                  <polyline
                    points={linePoints}
                    fill="none"
                    stroke="var(--ink)"
                    strokeWidth="2.25"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  {stats.map((s) => (
                    <circle
                      key={`dot-${s.q}`}
                      cx={x(s.q)} cy={y(s.headcount)} r="2.6"
                      fill="var(--surface)" stroke="var(--ink)" strokeWidth="1.5"
                      vectorEffect="non-scaling-stroke"
                    />
                  ))}

                  {/* The activity strip: jobs opened, segmented by state. */}
                  <line
                    x1={PAD.l} y1={STRIP_BOT} x2={W - PAD.r} y2={STRIP_BOT}
                    stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke"
                  />
                  {stats.map((s) => {
                    if (s.q === BASELINE_Q) {
                      return (
                        <text key={`base-${s.q}`} x={x(s.q)} y={STRIP_TOP + 22} className="tl2-basenum" textAnchor="middle">
                          {s.opened}
                        </text>
                      );
                    }
                    if (s.opened === 0) return null;
                    const w = Math.min(step * 0.56, 24);
                    let cursor = STRIP_BOT;
                    return (
                      <g key={`col-${s.q}`}>
                        {(['settled', 'check', 'new'] as State[]).map((k) => {
                          const h = stripY(s.byState[k]);
                          if (h <= 0) return null;
                          cursor -= h;
                          return (
                            <rect
                              key={k}
                              x={x(s.q) - w / 2} y={cursor} width={w} height={h}
                              fill={STATE[k].bar}
                            />
                          );
                        })}
                      </g>
                    );
                  })}

                  {/* X axis: a tick per quarter, a label per year. */}
                  {stats.map((s) => (
                    <line
                      key={`tick-${s.q}`}
                      x1={x(s.q)} y1={STRIP_BOT} x2={x(s.q)} y2={STRIP_BOT + (s.q % 4 === 0 ? 7 : 4)}
                      stroke="var(--line)" strokeWidth="1" vectorEffect="non-scaling-stroke"
                    />
                  ))}
                  {yearSpans.map((s) => (
                    <text
                      key={`yr-${s.year}`}
                      x={bandLeft(s.from) + ((s.to - s.from + 1) * step) / 2}
                      y={STRIP_BOT + 22}
                      className="tl2-year"
                      data-on={WINDOW_START_YEAR + Math.floor(activeQ / 4) === s.year}
                      textAnchor="middle"
                    >
                      {s.year}
                    </text>
                  ))}

                  {/* The selection, always visible. */}
                  <line
                    x1={x(quarter)} y1={PLOT_TOP} x2={x(quarter)} y2={STRIP_BOT}
                    stroke="var(--brand)" strokeWidth="1.5" vectorEffect="non-scaling-stroke"
                  />
                  <circle cx={x(quarter)} cy={y(stats[quarter]?.headcount ?? 0)} r="4.2" fill="var(--brand)" />

                  {/* The read, under the pointer. */}
                  {hoverQ !== null ? (
                    <g pointerEvents="none">
                      <line
                        x1={x(hoverQ)} y1={PLOT_TOP} x2={x(hoverQ)} y2={STRIP_BOT}
                        stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="4 3" vectorEffect="non-scaling-stroke"
                      />
                      <circle
                        cx={x(hoverQ)} cy={y(stats[hoverQ]?.headcount ?? 0)} r="4.6"
                        fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  ) : null}
                </svg>

                {hoverQ !== null ? (
                  <div
                    className="tl2-tip"
                    style={{ left: `${tipPct}%`, transform: `translateX(${tipShift})` }}
                  >
                    <div className="tl2-tip-head">{quarterLabel(hoverQ)}</div>
                    <dl>
                      <div><dt>People</dt><dd className="tnum">{active.headcount}</dd></div>
                      <div><dt>Change</dt><dd className="tnum">{netQuarter > 0 ? '+' : netQuarter < 0 ? '−' : '±'}{Math.abs(netQuarter)}</dd></div>
                      <div><dt>Opened</dt><dd className="tnum">{hoverQ === BASELINE_Q ? '—' : active.opened}</dd></div>
                      <div><dt>Closed</dt><dd className="tnum">{active.closed}</dd></div>
                    </dl>
                    {hoverQ === BASELINE_Q ? (
                      <p className="tl2-tip-note">{active.opened} seats already in place. Records begin here.</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="card card-flush">
            <div className="card-head">
              <h3>{quarterLabel(quarter)}</h3>
              <div className="row gap-3" style={{ alignItems: 'center' }}>
                <span className="micro faint">
                  {stats[quarter]?.headcount ?? 0} people in a seat
                </span>
                <div className="segmented segmented-sm no-print">
                  <button aria-pressed={ledger === 'opened'} onClick={() => setLedger('opened')}>
                    {atBaseline ? 'In place' : 'Opened'} {openedRows.length}
                  </button>
                  <button aria-pressed={ledger === 'closed'} onClick={() => setLedger('closed')}>
                    Closed {closedRows.length}
                  </button>
                </div>
              </div>
            </div>

            {atBaseline && ledger === 'opened' ? (
              <p className="tl2-basenote">
                These {openedRows.length} seats already existed when the records begin.
                They are where the file starts, not hiring.
              </p>
            ) : null}

            {tableRows.length === 0 ? (
              <div className="tl2-empty">
                <b>Nothing {ledger} in {quarterLabel(quarter)}.</b>
                {nearest.length > 0 ? (
                  <>
                    <span>Nearest quarters with something in them:</span>
                    <div className="tl2-chips">
                      {nearest.map((q) => (
                        <button key={q} onClick={() => onQuarterChange(q)}>
                          {quarterLabel(q)}
                          <i className="tnum">{ledger === 'opened' ? stats[q].opened : stats[q].closed}</i>
                        </button>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="scroll-y" style={{ maxHeight: 460 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 130 }}>Position ID</th>
                      <th>Job</th>
                      <th style={{ width: 200 }}>Department</th>
                      <th style={{ width: 180 }}>Person in the seat</th>
                      <th style={{ width: 140 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((r) => (
                      <tr key={r.positionId} className="clickable" onClick={() => onOpenPosition(r.positionId)}>
                        <td className="mono">{r.positionId}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.title}</div>
                          <div className="micro faint">
                            {r.orgUnit} · {formatMonthYear(ledger === 'opened' ? r.createdAt : r.closedAt)}
                          </div>
                        </td>
                        <td>{r.division}</td>
                        <td>
                          {r.holderId ? (
                            <button
                              className="backlink"
                              style={{ color: 'var(--brand)' }}
                              onClick={(e) => { e.stopPropagation(); onOpenPerson(r.holderId!); }}
                            >
                              {r.holder}
                            </button>
                          ) : <span className="faint">vacant</span>}
                        </td>
                        <td><Badge tone={STATE[r.state].tone}>{STATE[r.state].label}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>One row per job</div>
          <div className="small muted">
            Each bar starts when the seat was created and ends when it closed. The red line is{' '}
            {quarterLabel(quarter)}. Click a bar to open its full history.
          </div>

          <div className="lane-head">
            <div />
            <div
              className="lane-head-scale"
              style={{ gridTemplateColumns: yearSpans.map((s) => `${s.to - s.from + 1}fr`).join(' ') }}
            >
              {yearSpans.map((s) => <span key={s.year}>{s.year}</span>)}
            </div>
          </div>

          <div className="scroll-y" style={{ maxHeight: 620 }}>
            {rows.map((r) => (
              <div className="lane-row" key={r.positionId}>
                <div className="lane-label">
                  <b>{r.title}</b>
                  <span>{r.division} · {r.holder ?? 'vacant'}</span>
                </div>
                <div className="lane-track">
                  <i className="lane-now" style={{ left: `${((quarter + 0.5) / N) * 100}%` }} aria-hidden="true" />
                  <button
                    className="lane-bar"
                    style={{
                      left: `${(r.fromQ / N) * 100}%`,
                      width: `${Math.max(((r.toQ - r.fromQ + 1) / N) * 100, 3)}%`,
                      background: STATE[r.state].bar,
                    }}
                    onClick={() => onOpenPosition(r.positionId)}
                    title={`${r.title} — ${formatMonthYear(r.createdAt)} to ${r.closedAt ? formatMonthYear(r.closedAt) : 'now'}`}
                  >
                    {STATE[r.state].label}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="micro faint" style={{ marginTop: 'var(--s4)' }}>
            {rows.length} jobs · {rows.filter((r) => r.openEnded).length} still open ·
            peak headcount {Math.max(...metrics.headcountByQuarter)}
          </p>
        </div>
      )}
    </section>
  );
}
