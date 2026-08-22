/**
 * The time-axis chart — jobs, people and reporting lines in parallel.
 *
 * Deliberately NOT the first thing anyone sees. A Gantt chart demands that the
 * reader already knows what they are looking for, which a first-time viewer
 * does not. It earns its place as the second look, once the story strips have
 * established what a "job" and a "person" lane mean — and it is the only view
 * that shows what was happening elsewhere at the same moment.
 */

import { useMemo, useState } from 'react';
import type { Metrics, OrgModel, Position } from '../../domain/types.ts';
import { WINDOW_START_YEAR, formatMonthYear, quarterLabel, toQuarterIndex } from '../../domain/dates.ts';
import { snapshotAt } from '../../domain/metrics.ts';
import { narratePosition } from '../../domain/narrate.ts';
import { Card, CardHead } from '../ui/primitives.tsx';
import { RelationBadge } from '../ui/vocabulary.tsx';

function span(fromQ: number, toQ: number, total: number) {
  return {
    left: `${(fromQ / total) * 100}%`,
    width: `${Math.max(((toQ - fromQ + 1) / total) * 100, 2)}%`,
  };
}

const range = (from: string | null, to: string | null) =>
  `${formatMonthYear(from)} — ${to ? formatMonthYear(to) : 'now'}`;

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

  const divisions = useMemo(
    () => [...new Set([...model.positions.values()].map((p) => p.division))].sort(),
    [model],
  );

  const busiest = useMemo(() => {
    const scores = new Map<string, number>();
    for (const v of model.lineage.values()) {
      if (v.relation === 'created') continue;
      const div = model.positions.get(v.positionId)?.division;
      if (div) scores.set(div, (scores.get(div) ?? 0) + 1);
    }
    return [...scores.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? divisions[0];
  }, [model, divisions]);

  const [division, setDivision] = useState(busiest);

  const shown = useMemo(
    () => [...model.positions.values()]
      .filter((p) => p.division === division)
      .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.title.localeCompare(b.title)),
    [model, division],
  );

  const snapshotForDivision = useMemo(
    () => snapshotAt(model, quarter).filter((r) => r.division === division),
    [model, quarter, division],
  );

  const maxHeadcount = Math.max(...metrics.headcountByQuarter, 1);

  const years = useMemo(() => {
    const out: Array<{ year: number; quarters: number; startQ: number }> = [];
    for (let q = 0; q < N; q++) {
      const year = WINDOW_START_YEAR + Math.floor(q / 4);
      const last = out[out.length - 1];
      if (last && last.year === year) last.quarters++;
      else out.push({ year, quarters: 1, startQ: q });
    }
    return out;
  }, [N]);

  return (
    <div className="stack gap-5">
      <Card flush>
        <CardHead title={`${division}, on a time axis`} meta={`${shown.length} jobs`} />

        <div
          className="row gap-4 wrap spread no-print"
          style={{ padding: 'var(--s4) var(--s5)', borderBottom: '1px solid var(--line)' }}
        >
          <label className="row gap-2 small muted">
            Show me
            <select className="select" value={division} onChange={(e) => setDivision(e.target.value)}>
              {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>

          <div className="scrubber grow">
            <span className="small muted">Move through time</span>
            <input
              type="range" min={0} max={N - 1} step={1} value={quarter}
              onChange={(e) => onQuarterChange(Number(e.target.value))}
              aria-label="Move through time"
            />
            <span className="scrub-out">{quarterLabel(quarter)}</span>
          </div>
        </div>

        <div className="readme-strip">
          <div className="readme-key">
            <span className="readme-swatch" style={{ background: 'var(--brand)' }} />
            <span><b>Red bar = a job</b><span>One seat. Starts when created, ends when closed.</span></span>
          </div>
          <div className="readme-key">
            <span className="readme-swatch" style={{ background: 'var(--ink)' }} />
            <span><b>Black bar = a person</b><span>The human in that job, for exactly the period they sat in it.</span></span>
          </div>
          <div className="readme-key">
            <span className="readme-swatch" style={{ background: 'var(--nu-bar)' }} />
            <span><b>Grey bar = their manager</b><span>Which job this one reported into at the time.</span></span>
          </div>
          <div className="readme-key">
            <span className="readme-swatch hatch" />
            <span><b>Stripes = we don&rsquo;t know</b><span>The records never said. We leave the gap.</span></span>
          </div>
        </div>

        <div className="scroll-x" style={{ padding: 'var(--s4) var(--s5) 0' }}>
          <div className="tl" style={{ minWidth: 780 }}>
            <div className="tl-scale">
              {years.map((y) => (
                <div className="tl-year" key={y.year} style={{ flex: `${y.quarters} 1 0` }}>{y.year}</div>
              ))}
            </div>

            <div className="tl-body">
              <div className="tl-playhead-wrap">
                {years.slice(1).map((y) => (
                  <div className="tl-gridline" key={y.year} style={{ left: `${(y.startQ / N) * 100}%` }} />
                ))}
                <div className="tl-playhead" style={{ left: `${((quarter + 0.5) / N) * 100}%` }} />
              </div>

              {shown.map((pos: Position) => {
                const from = toQuarterIndex(pos.createdAt) ?? 0;
                const to = pos.closedAt ? (toQuarterIndex(pos.closedAt) ?? N - 1) : N - 1;
                const verdict = model.lineage.get(pos.id);
                const assignments = pos.assignmentIds.map((id) => model.assignments.get(id)!);

                return (
                  <div className="tl-group" key={pos.id}>
                    <div className="tl-group-head">
                      <div className="tl-group-title">
                        <strong>{pos.title}</strong>
                        {verdict ? <RelationBadge relation={verdict.relation} /> : null}
                      </div>
                      <p className="tl-story">{narratePosition(model, pos)}</p>
                    </div>

                    <div className="tl-row">
                      <div className="tl-label">
                        <span className="tl-dot tl-dot--role" />
                        <span className="tl-label-text">
                          <span className="tl-label-kind">The job</span>
                          <span className="tl-label-title">{pos.title}</span>
                        </span>
                      </div>
                      <div className="tl-track">
                        <button
                          className={`tl-bar lane-role ${pos.closedAt ? '' : 'is-open'}`}
                          style={span(from, to, N)}
                          onClick={() => onOpenPosition(pos.id)}
                          title={`${pos.title} — click for the full history`}
                        >
                          {range(pos.createdAt, pos.closedAt)}
                        </button>
                      </div>
                    </div>

                    {assignments.map((a) => {
                      const af = toQuarterIndex(a.startDate) ?? 0;
                      const at = a.endDate ? (toQuarterIndex(a.endDate) ?? N - 1) : N - 1;
                      const person = model.people.get(a.personId);
                      return (
                        <div className="tl-row" key={a.id}>
                          <div className="tl-label">
                            <span className="tl-dot tl-dot--person" />
                            <span className="tl-label-text">
                              <span className="tl-label-kind">Sat in it</span>
                              <span className="tl-label-title">{person?.name}</span>
                            </span>
                          </div>
                          <div className="tl-track">
                            <button
                              className={`tl-bar lane-person ${a.endDate ? '' : 'is-open'}`}
                              style={span(af, at, N)}
                              onClick={() => onOpenPerson(a.personId)}
                              title={`${person?.name} — click for their full record`}
                            >
                              {range(a.startDate, a.endDate)}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <div className="tl-row">
                      <div className="tl-label">
                        <span className="tl-dot" />
                        <span className="tl-label-text">
                          <span className="tl-label-kind">Reported to</span>
                          <span className="tl-label-title">
                            {(() => {
                              const ids = assignments
                                .map((a) => a.reportsToPositionId)
                                .filter((id): id is string => Boolean(id));
                              if (ids.length === 0) return 'never recorded';
                              const titles = [...new Set(ids.map((id) => model.positions.get(id)?.title ?? id))];
                              return titles.length === 1 ? titles[0] : `${titles.length} managers`;
                            })()}
                          </span>
                        </span>
                      </div>
                      <div className="tl-track">
                        {assignments.map((a) => {
                          const af = toQuarterIndex(a.startDate) ?? 0;
                          const at = a.endDate ? (toQuarterIndex(a.endDate) ?? N - 1) : N - 1;
                          const mgr = a.reportsToPositionId ? model.positions.get(a.reportsToPositionId) : null;
                          return (
                            <span
                              key={a.id}
                              className={`tl-bar ${mgr ? 'lane-reporting' : 'lane-unknown'}`}
                              style={span(af, at, N)}
                              title={
                                mgr
                                  ? `Reported to ${mgr.title}. Source: ${a.source}`
                                  : 'No reporting line was ever recorded for this period. We will not guess.'
                              }
                            >
                              {mgr ? mgr.title : 'not recorded'}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div style={{ height: 'var(--s5)' }} />
      </Card>

      <div className="grid-2">
        <Card flush>
          <CardHead
            title={`Who was where in ${quarterLabel(quarter)}`}
            meta={`${snapshotForDivision.length} live jobs`}
          />
          <div className="scroll-y" style={{ maxHeight: 320 }}>
            <table>
              <thead><tr><th>The job</th><th>Who held it</th><th>Reported to</th></tr></thead>
              <tbody>
                {snapshotForDivision.map((r) => (
                  <tr key={r.positionId} className="clickable" onClick={() => onOpenPosition(r.positionId)}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.title}</div>
                      <div className="micro faint">{r.orgUnit}</div>
                    </td>
                    <td className="small">{r.holderName ?? <span className="faint">vacant</span>}</td>
                    <td className="small">
                      {r.reportsKnown
                        ? r.reportsToTitle
                        : <span className="faint" style={{ fontStyle: 'italic' }}>not recorded</span>}
                    </td>
                  </tr>
                ))}
                {snapshotForDivision.length === 0 ? (
                  <tr><td colSpan={3} className="faint small">
                    Nothing in {division} existed yet in {quarterLabel(quarter)}.
                  </td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHead title="Total people, quarter by quarter" meta={`peak ${maxHeadcount}`} />
          <p className="small muted" style={{ marginTop: 'var(--s3)' }}>
            The whole organisation. The red column is the quarter you have selected.
          </p>
          <div className="chart" style={{ marginTop: 'var(--s4)' }}>
            {metrics.headcountByQuarter.map((n, i) => (
              <div
                key={i}
                className={`chart-col ${i === quarter ? 'is-current' : ''}`}
                style={{ height: `${(n / maxHeadcount) * 100}%` }}
                title={`${quarterLabel(i)} — ${n} people`}
              />
            ))}
          </div>
          <div className="row spread micro faint tnum" style={{ marginTop: 'var(--s2)' }}>
            <span>{years[0]?.year}</span>
            <span>{years[years.length - 1]?.year}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
