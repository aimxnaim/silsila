/**
 * Timeline — every job plotted over the window.
 *
 * Two modes, because two different questions get asked of this data. "By year"
 * answers how busy a period was; "By job" answers what is still open right now.
 * A single chart that tried to do both would answer neither, which is the usual
 * failure of a Gantt chart shown to a first-time reader.
 */

import { useMemo, useState } from 'react';
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
  toQ: number;
  openEnded: boolean;
  createdAt: string | null;
  closedAt: string | null;
}

export function TimeChart({
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
  const [mode, setMode] = useState<'year' | 'job'>('year');

  const rows: Row[] = useMemo(() => {
    return [...model.positions.values()].map((pos) => {
      const verdict = model.lineage.get(pos.id);
      const relation = verdict?.relation ?? 'created';

      // The most recent occupant is the one a reader is asking about.
      const assignments = pos.assignmentIds.map((id) => model.assignments.get(id)!);
      const latest = assignments[assignments.length - 1];
      const person = latest ? model.people.get(latest.personId) : null;

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
        toQ: pos.closedAt ? (toQuarterIndex(pos.closedAt) ?? N - 1) : N - 1,
        openEnded: !pos.closedAt,
        createdAt: pos.createdAt,
        closedAt: pos.closedAt,
      };
    }).sort((a, b) => b.fromQ - a.fromQ || a.title.localeCompare(b.title));
  }, [model, N]);

  /**
   * Each year with the number of quarters it actually occupies. The window
   * ends mid-year, so the last column is narrower than the rest — laying the
   * scale out in equal columns would put the 2026 label above 2025's bars.
   */
  const years = useMemo(() => {
    const out: Array<{ year: number; quarters: number }> = [];
    for (let q = 0; q < N; q++) {
      const year = WINDOW_START_YEAR + Math.floor(q / 4);
      const last = out[out.length - 1];
      if (last && last.year === year) last.quarters++;
      else out.push({ year, quarters: 1 });
    }
    return out;
  }, [N]);

  /** One column per year, segmented by state. */
  const columns = useMemo(() => {
    const byYear = new Map<number, Record<State, number>>();
    for (const y of years) byYear.set(y.year, { settled: 0, check: 0, new: 0 });
    for (const r of rows) {
      const y = WINDOW_START_YEAR + Math.floor(r.fromQ / 4);
      const bucket = byYear.get(y);
      if (bucket) bucket[r.state]++;
    }
    const entries = [...byYear.entries()];
    const peak = Math.max(...entries.map(([, b]) => b.settled + b.check + b.new), 1);
    return entries.map(([year, b]) => {
      const total = b.settled + b.check + b.new;
      const h = (total / peak) * 230;
      return {
        year,
        total,
        segs: (['new', 'check', 'settled'] as State[]).map((k) => ({
          state: k,
          px: total === 0 ? 0 : Math.round((b[k] / total) * h),
        })),
      };
    });
  }, [rows, years]);

  /**
   * The scrubber starts at the end of the window, which is a sensible default
   * everywhere else and a bad one here: the final year is a stub and usually
   * has nothing in it, so the view would open on an empty chart and an empty
   * table. Fall back to the last year that actually has rows.
   */
  const scrubbedYear = WINDOW_START_YEAR + Math.floor(quarter / 4);
  const selectedYear = columns.some((c) => c.year === scrubbedYear && c.total > 0)
    ? scrubbedYear
    : ([...columns].reverse().find((c) => c.total > 0)?.year ?? scrubbedYear);

  const yearRows = rows.filter((r) => WINDOW_START_YEAR + Math.floor(r.fromQ / 4) === selectedYear);

  return (
    <div className="stack gap-5">
      <div className="row spread gap-4 wrap" style={{ alignItems: 'flex-end' }}>
        <div>
          <div className="page-title">Timeline</div>
          <div className="page-sub" style={{ maxWidth: '64ch' }}>
            Every job, plotted over {years[0]?.year}–{years[years.length - 1]?.year}. Two questions:
            how busy was each year, and what is still open right now.
          </div>
        </div>

        <div className="segmented no-print">
          <button aria-pressed={mode === 'year'} onClick={() => setMode('year')}>By year</button>
          <button aria-pressed={mode === 'job'} onClick={() => setMode('job')}>By job</button>
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

      {mode === 'year' ? (
        <>
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>Jobs opened per year</div>
            <div className="small muted">
              A taller column means a busier year. Click one to see what opened.
            </div>

            <div className="stack-chart">
              {columns.map((c) => (
                <button
                  key={c.year}
                  className="stack-col"
                  aria-pressed={c.year === selectedYear}
                  onClick={() => onQuarterChange((c.year - WINDOW_START_YEAR) * 4)}
                  title={`${c.year} — ${c.total} jobs opened`}
                >
                  <span className="stack-num">{c.total}</span>
                  <span className="stack-bars">
                    {c.segs.map((s) => (
                      <span key={s.state} style={{ height: s.px, background: STATE[s.state].bar, display: 'block' }} />
                    ))}
                  </span>
                </button>
              ))}
            </div>
            <div className="stack-axis">
              {columns.map((c) => (
                <span key={c.year} data-on={c.year === selectedYear}>{c.year}</span>
              ))}
            </div>
          </div>

          <div className="card card-flush">
            <div className="card-head">
              <h3>{selectedYear}</h3>
              <span className="micro faint">
                {yearRows.length} jobs opened in this year · scrubber at {quarterLabel(quarter)}
              </span>
            </div>
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
                  {yearRows.map((r) => (
                    <tr key={r.positionId} className="clickable" onClick={() => onOpenPosition(r.positionId)}>
                      <td className="mono">{r.positionId}</td>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.title}</div>
                        <div className="micro faint">{r.orgUnit}</div>
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
                  {yearRows.length === 0 ? (
                    <tr><td colSpan={5} className="faint">Nothing opened in {selectedYear}.</td></tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2 }}>One row per job</div>
          <div className="small muted">
            Each bar starts when the seat was created and ends when it closed. Click a bar
            to open its full history.
          </div>

          <div className="lane-head">
            <div />
            <div
              className="lane-head-scale"
              style={{ gridTemplateColumns: years.map((y) => `${y.quarters}fr`).join(' ') }}
            >
              {years.map((y) => <span key={y.year}>{y.year}</span>)}
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
    </div>
  );
}
