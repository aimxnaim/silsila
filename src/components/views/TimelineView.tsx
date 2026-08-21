/**
 * The connection view. This is requirement 4 of the brief, and it is the one
 * most likely to be answered with two separate trackers side by side.
 *
 * It is not two trackers. Every position in the chosen division gets a group
 * of lanes drawn against ONE shared time axis:
 *
 *     the job        when the seat existed
 *     the person     which human sat in it, and when
 *     reports to     where it sat in the hierarchy, hatched where unrecorded
 *
 * Reading down a group answers "what happened to this role". Reading across a
 * person's bars answers "what happened to this human". The point of putting
 * them on one axis is that the two questions turn out to be the same question.
 *
 * The page is deliberately arranged so a reader who has never seen it can get
 * their bearings without being told anything:
 *
 *   1. a question in plain words, and its answer
 *   2. one real person's story, named, as a way in
 *   3. "how to read this" immediately above the chart, not buried in a legend
 *   4. the chart, with year gridlines and dates written on the bars
 *   5. the organisation at the chosen moment, as an ordinary table
 */

import { useMemo, useState } from 'react';
import type { Metrics, OrgModel, Position } from '../../domain/types.ts';
import {
  WINDOW_START_YEAR, formatMonthYear, quarterLabel, toQuarterIndex,
} from '../../domain/dates.ts';
import { snapshotAt } from '../../domain/metrics.ts';
import { narratePosition, featuredPerson, PLAIN_LABEL } from '../../domain/narrate.ts';
import { chains } from '../../domain/chains.ts';
import { StoryStrip } from './StoryStrip.tsx';
import { Badge, Button, Card, CardHead, Eyebrow } from '../ui/primitives.tsx';
import { RelationBadge } from '../ui/vocabulary.tsx';

/** Convert a quarter span into a percentage span across the track. */
function span(fromQ: number, toQ: number, total: number) {
  return {
    left: `${(fromQ / total) * 100}%`,
    width: `${Math.max(((toQ - fromQ + 1) / total) * 100, 2)}%`,
  };
}

function range(from: string | null, to: string | null): string {
  return `${formatMonthYear(from)} — ${to ? formatMonthYear(to) : 'now'}`;
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

  // Open on the division carrying the most lineage activity. That is where the
  // interesting story is, and a first screen that looks empty is wasted.
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

  // The chart is powerful but it is not the way in. It starts closed.
  const [chartOpen, setChartOpen] = useState(false);

  const allChains = useMemo(() => chains(model), [model]);

  const shown = useMemo(
    () =>
      [...model.positions.values()]
        .filter((p) => p.division === division)
        .sort((a, b) =>
          (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.title.localeCompare(b.title)),
    [model, division],
  );

  const snapshot = useMemo(() => snapshotAt(model, quarter), [model, quarter]);
  const snapshotForDivision = snapshot.filter((r) => r.division === division);
  const featured = useMemo(() => featuredPerson(model), [model]);

  const maxHeadcount = Math.max(...metrics.headcountByQuarter, 1);
  const relabelled = metrics.renameCount + metrics.splitCount + metrics.mergeCount;

  // Year columns rather than arbitrary ticks: a reader looking for "2023"
  // should find a column labelled 2023, not a tick labelled Q3'23.
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
      {/* ---- 1. The question, and the answer ---------------------------- */}
      <Card>
        <Eyebrow>The question this answers</Eyebrow>
        <h2 style={{ marginTop: 'var(--s3)', maxWidth: '24ch' }}>
          Did we grow, or did we just <em>rename things</em>?
        </h2>
        <p className="measure muted" style={{ marginTop: 'var(--s4)', fontSize: 16 }}>
          Across the whole organisation, headcount went from{' '}
          <strong className="tnum">{metrics.headcountStart}</strong> to{' '}
          <strong className="tnum">{metrics.headcountEnd}</strong> people. But{' '}
          <strong className="tnum">{relabelled}</strong> of the positions that look new
          were not new at all — they were existing jobs that got renamed, split apart or
          merged together.
        </p>

        <div className="grid-4" style={{ marginTop: 'var(--s5)' }}>
          {[
            [metrics.renameCount, 'renamed — same job, new title'],
            [metrics.splitCount, 'split — one job became two'],
            [metrics.mergeCount, 'merged — several became one'],
            [metrics.genuinelyNewCount, 'brand new — genuine growth'],
            [metrics.issueCount + metrics.succeededCount, 'we cannot confirm'],
          ].map(([n, label]) => (
            <div className="card card-tight" key={String(label)}>
              <div style={{ fontSize: 30, fontWeight: 500, lineHeight: 1 }} className="tnum">{n}</div>
              <div className="small muted" style={{ marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* ---- 2. A real person, as a way in ------------------------------ */}
      {featured ? (
        <div className="story">
          <Eyebrow>Start here</Eyebrow>
          <h3 style={{ marginTop: 'var(--s3)' }}>{featured.name}</h3>
          <p>
            Her HR record shows <strong>{featured.titles} different job titles</strong> since
            2021. Read on its own, that looks like someone who keeps moving around.
          </p>
          <p>
            <em>She never changed jobs.</em> The organisation renamed her seat
            {featured.renames > 1 ? ` ${featured.renames} times` : ''} underneath her.
            That is the difference this whole tool exists to show — and no HR system on
            the market can tell you which of the two happened.
          </p>
          <div style={{ marginTop: 'var(--s4)' }} className="no-print">
            <Button variant="primary" onClick={() => onOpenPerson(featured.personId)}>
              Open her record
            </Button>
          </div>
        </div>
      ) : null}

      {/* ---- 3. Every change, told left to right ------------------------ */}
      <div>
        <div className="page-head">
          <Eyebrow>What actually happened</Eyebrow>
          <h2 style={{ marginTop: 'var(--s3)', maxWidth: '26ch' }}>
            Every job that <em>changed</em>, start to finish
          </h2>
          <p className="measure muted" style={{ marginTop: 'var(--s4)', fontSize: 16 }}>
            Read each row left to right. Each card is one version of a job — what it was
            called, when it existed, and who was sitting in it. The arrow between two
            cards says what the change actually meant.
          </p>
          <p className="measure muted small" style={{ marginTop: 'var(--s3)' }}>
            {allChains.length} jobs in this organisation have a history worth reading.
            The other {model.positions.size - allChains.reduce((n, c) => n + c.members.length, 0)}{' '}
            were created once and never changed. Click any card for the full record.
          </p>
        </div>

        {allChains.map((chain) => (
          <StoryStrip key={chain.id} model={model} chain={chain} onOpenPosition={onOpenPosition} />
        ))}
      </div>

      {/* ---- 4. The same information on a time axis --------------------- */}
      <div className="row gap-3 wrap spread no-print">
        <div>
          <Eyebrow>Optional</Eyebrow>
          <h3 style={{ marginTop: 6 }}>The same information, on a time axis</h3>
          <p className="small muted" style={{ marginTop: 4, maxWidth: '58ch' }}>
            Useful once you know what you are looking for — it shows jobs, people and
            reporting lines running in parallel, so you can see what was happening
            elsewhere at the same moment.
          </p>
        </div>
        <button className="btn" onClick={() => setChartOpen((v) => !v)}>
          {chartOpen ? 'Hide the chart' : 'Show the chart'}
        </button>
      </div>

      {chartOpen ? (
      <Card flush>
        <CardHead
          title={<span>The {division} team, over time</span>}
          meta={`${shown.length} positions`}
        />

        {/* The controls sit above the key so the reader sets the scene first. */}
        <div
          className="row gap-4 wrap spread no-print"
          style={{ padding: 'var(--s4) var(--s5)', borderBottom: '1px solid var(--hairline)' }}
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
              type="range"
              min={0}
              max={N - 1}
              step={1}
              value={quarter}
              onChange={(e) => onQuarterChange(Number(e.target.value))}
              aria-label="Move through time"
            />
            <span className="scrub-out">{quarterLabel(quarter)}</span>
          </div>
        </div>

        {/* "How to read this" — above the chart, not hidden in a footer. */}
        <div className="readme-strip">
          <div className="readme-key">
            <span className="readme-swatch" style={{ background: 'var(--vermillion)' }} />
            <span>
              <b>Red bar = a job</b>
              <span>One seat in the org chart. It starts when the job was created and ends when it was closed.</span>
            </span>
          </div>
          <div className="readme-key">
            <span className="readme-swatch" style={{ background: 'var(--ink)' }} />
            <span>
              <b>Black bar = a person</b>
              <span>The human sitting in that job, for exactly the period they sat in it.</span>
            </span>
          </div>
          <div className="readme-key">
            <span className="readme-swatch" style={{ background: 'var(--stone)' }} />
            <span>
              <b>Grey bar = their manager</b>
              <span>Which job this one reported into at the time.</span>
            </span>
          </div>
          <div className="readme-key">
            <span className="readme-swatch hatch" />
            <span>
              <b>Stripes = we don&rsquo;t know</b>
              <span>The records never said. We leave the gap rather than guessing.</span>
            </span>
          </div>
        </div>

        <p className="small muted" style={{ padding: 'var(--s4) var(--s5) 0' }}>
          Time runs left to right, {years[0]?.year} on the left to{' '}
          {years[years.length - 1]?.year} on the right. The red vertical line is the
          moment you have selected above — drag the slider and it moves. Click any bar
          to see where the information came from.
        </p>

        <div className="scroll-x" style={{ padding: 'var(--s4) var(--s5) 0' }}>
          <div className="tl" style={{ minWidth: 820 }}>
            <div className="tl-scale">
              {years.map((y) => (
                <div className="tl-year" key={y.year} style={{ flex: `${y.quarters} 1 0` }}>
                  {y.year}
                </div>
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
                        {pos.level !== null ? <span className="micro faint">Grade {pos.level}</span> : null}
                      </div>
                      <p className="tl-story">{narratePosition(model, pos)}</p>
                    </div>

                    {/* Lane 1 — the seat itself. */}
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
                          title={`${pos.title} — click for the full history and how we classified it`}
                        >
                          {range(pos.createdAt, pos.closedAt)}
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
                              title={`${person?.name} — click for their full career trajectory`}
                            >
                              {range(a.startDate, a.endDate)}
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Lane 3 — the reporting line, hatched where unrecorded. */}
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
                              return titles.length === 1 ? titles[0] : `${titles.length} different managers`;
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

        <div style={{ padding: 'var(--s4) var(--s5) var(--s5)' }}>
          <p className="micro faint">
            Each block below a red bar is someone who sat in that job. Where a red bar
            ends and another begins, the classification pill says whether that was a new
            job or the same job under a new name.
          </p>
        </div>
      </Card>

      ) : null}

      {/* ---- 5. The organisation at the chosen moment -------------------- */}
      <div className="grid-2">
        <Card flush>
          <CardHead
            title={`Who was where in ${quarterLabel(quarter)}`}
            meta={`${snapshotForDivision.length} live jobs`}
          />
          <p className="small muted" style={{ padding: 'var(--s4) var(--s5) 0' }}>
            This table follows the slider. Move it and you are looking at a different
            quarter of the organisation&rsquo;s life.
          </p>
          <div className="scroll-y" style={{ maxHeight: 340, marginTop: 'var(--s4)' }}>
            <table>
              <thead>
                <tr><th>The job</th><th>Who held it</th><th>Reported to</th></tr>
              </thead>
              <tbody>
                {snapshotForDivision.map((r) => (
                  <tr key={r.positionId} className="clickable" onClick={() => onOpenPosition(r.positionId)}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.title}</div>
                      <div className="micro faint">{r.orgUnit}</div>
                    </td>
                    <td className="small">{r.holderName ?? <span className="faint">nobody — vacant</span>}</td>
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
            The whole organisation, not just {division}. The red column is the quarter
            you have selected.
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
          <p className="small muted" style={{ marginTop: 'var(--s4)' }}>
            <strong className="tnum">{metrics.headcountEnd - metrics.headcountStart} more people</strong>{' '}
            than at the start. How much of that is real growth rather than relabelling is
            what the <Badge tone="ink">Roles</Badge> tab breaks down —{' '}
            <strong className="tnum">{metrics.genuinelyNewCount}</strong> of the jobs there
            are marked <em>{PLAIN_LABEL.created}</em>.
          </p>
        </Card>
      </div>
    </div>
  );
}
