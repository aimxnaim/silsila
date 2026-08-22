/**
 * The overview — the first screen after the front page.
 *
 * It is arranged as a dashboard because that is the shape a business reader
 * already knows how to enter: figures at the top, a breakdown they can drill
 * into, then a feed of things that happened which they can open one by one.
 *
 * What makes it more than a scoreboard is that every figure leads somewhere.
 * The department cards drill into the people inside them; the change feed rows
 * open the full evidence behind each classification. Nothing here is a number
 * you can only look at.
 *
 * This screen also carries requirement 4 of the brief — showing how the role
 * history and the person history connect — through the story strips further
 * down and the optional time-axis chart beneath them.
 */

import { useMemo, useState } from 'react';
import type { LineageRelation, Metrics, OrgModel } from '../../domain/types.ts';
import { formatMonthYear, quarterLabel } from '../../domain/dates.ts';
import { changeFeed, departments, peopleIn } from '../../domain/overview.ts';
import { featuredPerson, PLAIN_LABEL, PLAIN_MEANING } from '../../domain/narrate.ts';
import { chains } from '../../domain/chains.ts';
import { StoryStrip } from './StoryStrip.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { Button, Card, CardHead, Eyebrow } from '../ui/primitives.tsx';
import { RelationBadge } from '../ui/vocabulary.tsx';

const FILTERS: Array<{ id: LineageRelation | 'all' | 'changed'; label: string }> = [
  { id: 'changed', label: 'Everything that changed' },
  { id: 'rename', label: 'Renamed' },
  { id: 'redesignated', label: 'Renamed + regraded' },
  { id: 'split', label: 'Split' },
  { id: 'merge', label: 'Merged' },
  { id: 'succeeded', label: 'Needs a check' },
  { id: 'created', label: 'Brand new' },
  { id: 'all', label: 'All jobs' },
];

export function OverviewView({
  model, metrics, onOpenPosition, onOpenPerson, onGoToOrgChart,
}: {
  model: OrgModel;
  metrics: Metrics;
  onOpenPosition: (id: string) => void;
  onOpenPerson: (id: string) => void;
  onGoToOrgChart: () => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<LineageRelation | 'all' | 'changed'>('changed');
  const [openDivision, setOpenDivision] = useState<string | null>(null);

  const depts = useMemo(() => departments(model), [model]);
  const feed = useMemo(() => changeFeed(model), [model]);
  const allChains = useMemo(() => chains(model), [model]);
  const featured = useMemo(() => featuredPerson(model), [model]);

  const insideDivision = openDivision ? peopleIn(model, openDivision) : [];

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return feed.filter((event) => {
      if (filter === 'changed' && event.relation === 'created') return false;
      if (filter !== 'all' && filter !== 'changed' && event.relation !== filter) return false;
      if (openDivision && event.division !== openDivision) return false;
      if (!q) return true;
      return (
        event.title.toLowerCase().includes(q) ||
        event.division.toLowerCase().includes(q) ||
        event.orgUnit.toLowerCase().includes(q) ||
        event.affected.some((p) => p.name.toLowerCase().includes(q))
      );
    });
  }, [feed, filter, query, openDivision]);

  const relabelled = metrics.renameCount + metrics.splitCount + metrics.mergeCount;

  return (
    <div className="stack gap-5">
      {/* ---- Header --------------------------------------------------- */}
      <div className="page-head">
        <Eyebrow>Overview</Eyebrow>
        <h2 style={{ marginTop: 'var(--s3)', maxWidth: '26ch' }}>
          Did we grow, or did we just <em>rename things</em>?
        </h2>
        <p className="measure muted" style={{ marginTop: 'var(--s4)', fontSize: 16 }}>
          Everything below was rebuilt from one spreadsheet of {model.stats.rowsRead} rows.
          It covers {quarterLabel(0)} to {quarterLabel(model.window.quarterCount - 1)}.
        </p>
      </div>

      {/* ---- KPI row --------------------------------------------------- */}
      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-top">
            <span className="kpi-label">People on record</span>
            <span className="kpi-tag kpi-tag--stone">P</span>
          </div>
          <span className="kpi-value">{metrics.peopleCount}</span>
          <span className="kpi-note">everyone who appears in the file</span>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <span className="kpi-label">Jobs tracked</span>
            <span className="kpi-tag kpi-tag--stone">J</span>
          </div>
          <span className="kpi-value">{metrics.positionCount}</span>
          <span className="kpi-note">seats, across the whole period</span>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <span className="kpi-label">Looked new, weren&rsquo;t</span>
            <span className="kpi-tag kpi-tag--verm">R</span>
          </div>
          <span className="kpi-value">{relabelled}</span>
          <span className="kpi-note">renamed, split or merged — nobody was hired</span>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <span className="kpi-label">Genuinely new</span>
            <span className="kpi-tag kpi-tag--ink">N</span>
          </div>
          <span className="kpi-value">{metrics.genuinelyNewCount}</span>
          <span className="kpi-note">real growth, not relabelling</span>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <span className="kpi-label">Can&rsquo;t confirm</span>
            <span className="kpi-tag kpi-tag--saff">?</span>
          </div>
          <span className="kpi-value">{metrics.issueCount + metrics.succeededCount}</span>
          <span className="kpi-note">gaps we refuse to guess at</span>
        </div>
      </div>

      {/* ---- Headline answer -------------------------------------------- */}
      <Card>
        <p style={{ fontSize: 17, lineHeight: 1.55 }} className="measure">
          Headcount went from <strong className="tnum">{metrics.headcountStart}</strong> to{' '}
          <strong className="tnum">{metrics.headcountEnd}</strong> people — but{' '}
          <strong className="tnum">{relabelled}</strong> of the positions that look new on
          the org chart were <em>not new at all</em>. They were existing jobs that got
          renamed, split apart or merged together.
        </p>
        <p className="measure muted small" style={{ marginTop: 'var(--s3)' }}>
          No HR system can make that distinction, because it overwrites the old title when
          the new one is entered. That is the gap this tool fills.
        </p>
      </Card>

      {/* ---- Departments, drilling down --------------------------------- */}
      <div>
        <div className="row gap-3 wrap spread" style={{ marginBottom: 'var(--s4)' }}>
          <div>
            <Eyebrow>By department</Eyebrow>
            <h3 style={{ marginTop: 6 }}>Where the people are</h3>
            <p className="small muted" style={{ marginTop: 4, maxWidth: '62ch' }}>
              Click a department to see who works there and what changed inside it. Click
              again to clear.
            </p>
          </div>
          <Button onClick={onGoToOrgChart}>See the full org chart →</Button>
        </div>

        <div className="dept-grid">
          {depts.map((d) => (
            <button
              key={d.division}
              className="dept"
              aria-pressed={openDivision === d.division}
              onClick={() => setOpenDivision(openDivision === d.division ? null : d.division)}
            >
              <span className="dept-name">{d.division}</span>
              <span className="micro faint">{d.units.length} teams · {d.units.slice(0, 2).join(', ')}{d.units.length > 2 ? '…' : ''}</span>
              <span className="dept-nums">
                <span className="dept-num"><b className="tnum">{d.headcount}</b><span>people now</span></span>
                <span className="dept-num"><b className="tnum">{d.positions}</b><span>jobs</span></span>
                <span className="dept-num"><b className="tnum">{d.changes}</b><span>changes</span></span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ---- Inside one department -------------------------------------- */}
      {openDivision ? (
        <Card flush>
          <CardHead
            title={`Inside ${openDivision}`}
            meta={`${insideDivision.length} people have worked here`}
          />
          <div className="scroll-y" style={{ maxHeight: 380 }}>
            <table>
              <thead>
                <tr><th style={{ width: 52 }} /><th>Person</th><th>Job</th><th>Team</th><th>Status</th></tr>
              </thead>
              <tbody>
                {insideDivision.map((p) => (
                  <tr key={p.personId} className="clickable" onClick={() => onOpenPerson(p.personId)}>
                    <td><Avatar name={p.name} /></td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.name}</div>
                      <div className="micro faint mono">{p.personId}</div>
                    </td>
                    <td className="small">{p.title}</td>
                    <td className="small muted">{p.orgUnit}</td>
                    <td className="small">
                      {p.current
                        ? <span className="badge badge-ink">Current</span>
                        : <span className="badge">Moved on</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      {/* ---- The change feed -------------------------------------------- */}
      <div>
        <div style={{ marginBottom: 'var(--s4)' }}>
          <Eyebrow>Every structural change</Eyebrow>
          <h3 style={{ marginTop: 6 }}>What happened, newest first</h3>
          <p className="small muted" style={{ marginTop: 4, maxWidth: '62ch' }}>
            One row per job whose arrival meant something. Search by job, team or person.
            Click any row for the evidence behind the classification.
          </p>
        </div>

        <div className="toolbar no-print" style={{ marginBottom: 'var(--s3)' }}>
          <input
            className="search"
            placeholder="Search job, team or person…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search the change feed"
          />
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className="chip"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <Card flush>
          <div className="scroll-y" style={{ maxHeight: 520 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 96 }}>When</th>
                  <th>The job</th>
                  <th>What happened</th>
                  <th>Who it affected</th>
                  <th style={{ width: 74 }}>Sure?</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((event) => (
                  <tr key={event.positionId} className="clickable" onClick={() => onOpenPosition(event.positionId)}>
                    <td><span className="feed-when">{formatMonthYear(event.date)}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{event.title}</div>
                      <div className="micro faint">{event.orgUnit} · {event.division}</div>
                    </td>
                    <td>
                      <RelationBadge relation={event.relation} />
                      <div className="micro muted" style={{ marginTop: 4, maxWidth: '34ch' }}>
                        {PLAIN_MEANING[event.relation]}
                      </div>
                    </td>
                    <td>
                      {event.affected.length > 0 ? (
                        <span className="row gap-2">
                          <span className="avatar-stack">
                            {event.affected.slice(0, 3).map((p) => <Avatar key={p.id} name={p.name} />)}
                          </span>
                          <span className="small">
                            {event.affected.length === 1
                              ? event.affected[0].name
                              : `${event.affected.length} people`}
                          </span>
                        </span>
                      ) : (
                        <span className="faint small">nobody recorded</span>
                      )}
                    </td>
                    <td className="small tnum">
                      {Math.round(event.confidence * 100)}%
                      {event.needsReview ? (
                        <div className="micro" style={{ color: 'var(--wr-fg)' }}>check</div>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr><td colSpan={5} className="faint small">
                    Nothing matches that. Try clearing the search or the filter.
                  </td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="micro faint" style={{ marginTop: 'var(--s2)' }}>
          Showing {rows.length} of {feed.length} jobs
          {openDivision ? ` in ${openDivision}` : ''}.
        </p>
      </div>

      {/* ---- One named person, as a way in ------------------------------ */}
      {featured ? (
        <div className="story">
          <Eyebrow>Why this matters</Eyebrow>
          <h3 style={{ marginTop: 'var(--s3)' }}>{featured.name}</h3>
          <p>
            Her HR record shows <strong>{featured.titles} different job titles</strong> since
            2021. Read on its own, that looks like someone who keeps moving around.
          </p>
          <p>
            <em>She never changed jobs.</em> The organisation renamed her seat
            {featured.renames > 1 ? ` ${featured.renames} times` : ''} underneath her. On a
            promotion panel that difference decides whether she looks focused or restless.
          </p>
          <div style={{ marginTop: 'var(--s4)' }} className="no-print">
            <Button variant="primary" onClick={() => onOpenPerson(featured.personId)}>
              Open her record
            </Button>
          </div>
        </div>
      ) : null}

      {/* ---- Story strips ------------------------------------------------ */}
      <div>
        <div className="page-head">
          <Eyebrow>The detail</Eyebrow>
          <h3>Every job that changed, start to finish</h3>
          <p className="small muted" style={{ marginTop: 4, maxWidth: '66ch' }}>
            Read each row left to right. Each card is one version of a job — what it was
            called, when it existed, who was in it. The arrow between two cards says what
            the change actually meant.
          </p>
        </div>
        {allChains.map((chain) => (
          <StoryStrip key={chain.id} model={model} chain={chain} onOpenPosition={onOpenPosition} />
        ))}
      </div>

      <Card tight>
        <p className="small muted">
          Of {model.positions.size} jobs, {allChains.reduce((n, c) => n + c.members.length, 0)}{' '}
          have a history worth reading. The rest were created once and never changed —
          they appear in the feed above marked{' '}
          <em>{PLAIN_LABEL.created.toLowerCase()}</em>.
        </p>
      </Card>
    </div>
  );
}
