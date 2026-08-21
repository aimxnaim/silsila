/**
 * The connection view. This is requirement 4 of the brief, and it is the one
 * most likely to be answered with two separate trackers side by side.
 *
 * It is not two trackers. Every position in the chosen division gets a group
 * of three lanes drawn against ONE shared time axis:
 *
 *     Position    when the seat existed
 *     Held by     which human sat in it, and when
 *     Reports to  where it sat in the hierarchy, hatched where unrecorded
 *
 * Reading down a group answers "what happened to this role". Reading across a
 * person's bars answers "what happened to this human". The point of putting
 * them on one axis is that the two questions turn out to be the same question.
 */

import { useMemo, useState } from 'react';
import type { Metrics, OrgModel } from '../../domain/types.ts';
import { quarterLabel, quarterLabelShort, toQuarterIndex } from '../../domain/dates.ts';
import { snapshotAt } from '../../domain/metrics.ts';
import { Badge, Card, CardHead, Eyebrow } from '../ui/primitives.tsx';
import { RelationBadge } from '../ui/vocabulary.tsx';

/** Convert a quarter span into a percentage span across the track. */
function span(fromQ: number, toQ: number, total: number) {
  const left = (fromQ / total) * 100;
  const width = ((toQ - fromQ + 1) / total) * 100;
  return { left: `${left}%`, width: `${Math.max(width, 1.2)}%` };
}

export function TimelineView({
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

  // Default to the division carrying the most lineage activity — that is
  // where the interesting story is, and an empty-looking first screen is a
  // wasted first impression.
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
    () =>
      [...model.positions.values()]
        .filter((p) => p.division === division)
        .sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.title.localeCompare(b.title)),
    [model, division],
  );

  const snapshot = useMemo(() => snapshotAt(model, quarter), [model, quarter]);
  const snapshotForDivision = snapshot.filter((r) => r.division === division);

  const maxHeadcount = Math.max(...metrics.headcountByQuarter, 1);
  const ticks = Array.from({ length: Math.min(N, 12) }, (_, i) =>
    Math.round((i * (N - 1)) / (Math.min(N, 12) - 1)),
  );

  return (
    <div className="stack gap-5">
      {/* ---- The headline. The question an HR lead actually arrived with. -- */}
      <Card>
        <Eyebrow>What the records say</Eyebrow>
        <h2 style={{ marginTop: 'var(--s3)', maxWidth: '32ch' }}>
          Headcount went from {metrics.headcountStart} to {metrics.headcountEnd}.{' '}
          <span className="accent">
            {metrics.renameCount + metrics.splitCount + metrics.mergeCount} of those
            positions were relabelled, not created.
          </span>
        </h2>
        <div className="row gap-4 wrap small muted" style={{ marginTop: 'var(--s4)' }}>
          <span><strong className="tnum">{metrics.renameCount}</strong> renamed or redesignated</span>
          <span><strong className="tnum">{metrics.splitCount}</strong> split from an earlier seat</span>
          <span><strong className="tnum">{metrics.mergeCount}</strong> merged from several</span>
          <span><strong className="tnum">{metrics.genuinelyNewCount}</strong> genuinely new</span>
          <span><strong className="tnum">{metrics.issueCount + metrics.succeededCount}</strong> we cannot confirm</span>
        </div>
      </Card>

      {/* ---- Scrubber ---------------------------------------------------- */}
      <Card>
        <div className="row gap-4 wrap spread" style={{ marginBottom: 'var(--s4)' }}>
          <div>
            <Eyebrow>Viewing</Eyebrow>
            <div style={{ fontSize: 'var(--text-title)', marginTop: 4 }} className="tnum">
              {quarterLabel(quarter)}
            </div>
          </div>
          <label className="row gap-2 small muted no-print">
            Division
            <select
              className="select"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
            >
              {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
        </div>

        <div className="scrubber no-print">
          <span className="micro faint tnum">{quarterLabelShort(0)}</span>
          <input
            type="range"
            min={0}
            max={N - 1}
            step={1}
            value={quarter}
            onChange={(e) => onQuarterChange(Number(e.target.value))}
            aria-label="Move through time"
          />
          <span className="micro faint tnum">{quarterLabelShort(N - 1)}</span>
        </div>
        <p className="micro faint no-print" style={{ marginTop: 'var(--s2)' }}>
          Drag the handle, or focus it and use the arrow keys, to move the whole
          view through time.
        </p>
      </Card>

      {/* ---- The three lanes -------------------------------------------- */}
      <Card flush>
        <CardHead
          title={division}
          meta={`${shown.length} positions · ${quarterLabel(0)} to ${quarterLabel(N - 1)}`}
        />

        <div className="scroll-x">
          <div className="tl" style={{ minWidth: 720 }}>
            <div className="tl-scale">
              {ticks.map((t) => (
                <div className="tl-tick" key={t}>{quarterLabelShort(t)}</div>
              ))}
            </div>

            <div className="tl-body">
              <div className="tl-playhead-wrap">
                <div
                  className="tl-playhead"
                  style={{ left: `${((quarter + 0.5) / N) * 100}%` }}
                />
              </div>

              {shown.map((pos) => {
                const from = toQuarterIndex(pos.createdAt) ?? 0;
                const to = pos.closedAt ? (toQuarterIndex(pos.closedAt) ?? N - 1) : N - 1;
                const verdict = model.lineage.get(pos.id);
                const assignments = pos.assignmentIds.map((id) => model.assignments.get(id)!);

                return (
                  <div className="tl-group" key={pos.id}>
                    <div className="tl-group-head">
                      <strong className="small">{pos.title}</strong>
                      <span className="micro faint mono">{pos.id}</span>
                      {verdict ? <RelationBadge relation={verdict.relation} /> : null}
                      {pos.level !== null ? (
                        <span className="micro faint">Grade {pos.level}</span>
                      ) : null}
                    </div>

                    {/* Lane 1 — the seat itself. */}
                    <div className="tl-row">
                      <div className="tl-label">
                        <span className="micro faint">Position</span>
                      </div>
                      <div className="tl-track">
                        <button
                          className="tl-bar lane-role"
                          style={span(from, to, N)}
                          onClick={() => onOpenPosition(pos.id)}
                          title={`${pos.title} — open the lineage and the classifier's reasoning`}
                        >
                          {pos.title}
                        </button>
                      </div>
                    </div>

                    {/* Lane 2 — the humans who sat in it. */}
                    {assignments.map((a) => {
                      const af = toQuarterIndex(a.startDate) ?? 0;
                      const at = a.endDate ? (toQuarterIndex(a.endDate) ?? N - 1) : N - 1;
                      const person = model.people.get(a.personId);
                      return (
                        <div className="tl-row" key={a.id}>
                          <div className="tl-label">
                            <span className="micro faint">Held by</span>
                            <span className="tl-label-title">{person?.name}</span>
                          </div>
                          <div className="tl-track">
                            <button
                              className="tl-bar lane-person"
                              style={span(af, at, N)}
                              onClick={() => onOpenPerson(a.personId)}
                              title={`${person?.name} — open the full trajectory`}
                            >
                              {person?.name}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Lane 3 — the reporting line, hatched where unrecorded. */}
                    <div className="tl-row">
                      <div className="tl-label">
                        <span className="micro faint">Reports to</span>
                      </div>
                      <div className="tl-track">
                        {assignments.map((a) => {
                          const af = toQuarterIndex(a.startDate) ?? 0;
                          const at = a.endDate ? (toQuarterIndex(a.endDate) ?? N - 1) : N - 1;
                          const mgr = a.reportsToPositionId
                            ? model.positions.get(a.reportsToPositionId)
                            : null;
                          return (
                            <span
                              key={a.id}
                              className={`tl-bar ${mgr ? 'lane-reporting' : 'lane-unknown'}`}
                              style={{ ...span(af, at, N), cursor: 'default' }}
                              title={
                                mgr
                                  ? `Reported to ${mgr.title} — source: ${a.source}`
                                  : 'No reporting line was recorded for this period. We will not guess.'
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

        <div className="legend" style={{ padding: 'var(--s4) var(--s5)', borderTop: '1px solid var(--line)' }}>
          <span className="legend-key">
            <span className="legend-swatch" style={{ borderLeftColor: 'var(--ink)' }} /> Position
          </span>
          <span className="legend-key">
            <span className="legend-swatch" style={{ borderLeftColor: 'var(--accent)', background: 'var(--surface-sunk)' }} /> Person
          </span>
          <span className="legend-key">
            <span className="legend-swatch" style={{ borderStyle: 'dashed', borderLeftColor: 'var(--ink-3)' }} /> Reporting line
          </span>
          <span className="legend-key">
            <span className="legend-swatch hatch" /> Unknown — never interpolated
          </span>
        </div>
      </Card>

      {/* ---- Snapshot + headcount --------------------------------------- */}
      <div className="grid-2">
        <Card flush>
          <CardHead
            title={`The organisation at ${quarterLabel(quarter)}`}
            meta={`${snapshotForDivision.length} live positions in ${division}`}
          />
          <div className="scroll-y" style={{ maxHeight: 340 }}>
            <table>
              <thead>
                <tr><th>Position</th><th>Held by</th><th>Reports to</th></tr>
              </thead>
              <tbody>
                {snapshotForDivision.map((r) => (
                  <tr
                    key={r.positionId}
                    className="clickable"
                    onClick={() => onOpenPosition(r.positionId)}
                  >
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.title}</div>
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
                  <tr><td colSpan={3} className="faint small">No positions were live in this division at {quarterLabel(quarter)}.</td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHead title="Headcount across the whole organisation" meta={`peak ${maxHeadcount}`} />
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
          <div className="row spread micro faint" style={{ marginTop: 'var(--s2)' }}>
            <span>{quarterLabelShort(0)}</span>
            <span>{quarterLabelShort(N - 1)}</span>
          </div>
          <p className="small muted" style={{ marginTop: 'var(--s4)' }}>
            <strong className="tnum">{metrics.headcountEnd - metrics.headcountStart}</strong>{' '}
            more people than at the start of the window. How much of that is genuine
            growth rather than relabelling is exactly what the{' '}
            <Badge tone="ink">Roles</Badge> view answers.
          </p>
        </Card>
      </div>
    </div>
  );
}
