/**
 * The org chart, one level at a time.
 *
 * This replaced an expand-and-collapse tree, and the reason is worth writing
 * down. In that tree a row with reports expanded when clicked and a row
 * without reports opened its history — two behaviours behind two rows that
 * looked identical, so the only way to learn which you were about to get was
 * to click and find out. A manager's own history was unreachable entirely.
 *
 * So the chart now shows ONE job and its direct reports, and every card in it
 * carries the same two actions in the same two places:
 *
 *     the card body   →  that job becomes the one in focus
 *     "History"       →  that job's record opens
 *
 * No exceptions, including for jobs nobody reports to. Focusing one of those
 * is a real destination that says so plainly, which is a better answer than a
 * row that quietly behaves differently from its neighbours.
 *
 * What the reader loses is seeing four levels at once. What they get back is a
 * trail that says exactly where they are, a route back up from every screen,
 * and a search box — because once you can only see one level, being able to
 * jump straight to a job stops being a convenience and starts being the point.
 */

import { useMemo, useState } from 'react';
import type { OrgModel } from '../../domain/types.ts';
import { quarterLabel } from '../../domain/dates.ts';
import { buildHierarchy, pathTo, type TreeNode } from '../../domain/hierarchy.ts';
import { Card, CardHead } from '../ui/primitives.tsx';
import { RelationBadge } from '../ui/vocabulary.tsx';
import { Avatar } from '../ui/Avatar.tsx';

/* ------------------------------------------------------------------ Pieces */

function Holder({ name }: { name: string | null }) {
  if (!name) return <span className="oc-vacant">vacant</span>;
  return (
    <>
      <Avatar name={name} />
      <span className="oc-holder-name">{name}</span>
    </>
  );
}

function reportsLabel(node: TreeNode): string {
  const direct = node.children.length;
  if (direct === 0) return 'no reports';
  const below = node.descendantCount;
  return below > direct
    ? `${direct} direct · ${below} below`
    : `${direct} direct report${direct === 1 ? '' : 's'}`;
}

/**
 * One job, as a card in the grid of reports.
 *
 * Two buttons, never one. The body drills; the footer link opens the record.
 * They are separated by a rule so the two targets are visibly two targets —
 * the single overloaded row is the thing this whole view exists to undo.
 */
function JobCard({
  node, onFocus, onOpenPosition, model,
}: {
  node: TreeNode;
  onFocus: (id: string) => void;
  onOpenPosition: (id: string) => void;
  model: OrgModel;
}) {
  const { position } = node;
  const verdict = model.lineage.get(position.id);
  const hasReports = node.children.length > 0;

  return (
    <div className="oc-card">
      <button className="oc-card-main" onClick={() => onFocus(position.id)}>
        <span className="oc-card-title">{position.title}</span>
        <span className="oc-card-holder">
          <Holder name={node.holderName} />
          {position.level !== null ? <span className="oc-grade">grade {position.level}</span> : null}
        </span>
        <span className="oc-card-unit">{position.orgUnit}</span>
      </button>

      <div className="oc-card-foot">
        <span className={`oc-card-count ${hasReports ? 'oc-card-count--has' : ''}`.trim()}>
          {reportsLabel(node)}
          {hasReports ? <i aria-hidden="true">›</i> : null}
        </span>
        <span className="row gap-2">
          {verdict && verdict.relation !== 'created' ? (
            <RelationBadge relation={verdict.relation} />
          ) : null}
          <button className="oc-link" onClick={() => onOpenPosition(position.id)}>
            History
          </button>
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- The chart */

export function OrgChart({
  model, quarter, onOpenPosition,
}: {
  model: OrgModel;
  quarter: number;
  onOpenPosition: (id: string) => void;
}) {
  const hierarchy = useMemo(() => buildHierarchy(model, quarter), [model, quarter]);

  /**
   * Where the reader asked to be, root first. Only ever a request: the quarter
   * can change under it and take the job they were looking at out of existence,
   * which is the entire point of a chart you can rewind.
   */
  const [asked, setAsked] = useState<string[]>([]);
  const [query, setQuery] = useState('');

  const top = hierarchy.roots[0] ?? hierarchy.orphans[0] ?? null;

  const { focus, displaced } = useMemo(() => {
    if (!top) return { focus: null, displaced: null };

    // Drop the steps that did not exist in this quarter and stand on the
    // deepest one that did.
    const surviving = asked.filter((id) => hierarchy.index.has(id));
    const wanted = asked[asked.length - 1] ?? null;
    const landedId = surviving[surviving.length - 1] ?? top.position.id;

    return {
      focus: hierarchy.index.get(landedId) ?? top,
      // Worth saying only when the reader asked for something specific and the
      // records could not honour it.
      displaced: wanted && wanted !== landedId
        ? model.positions.get(wanted) ?? null
        : null,
    };
  }, [hierarchy, asked, model, top]);

  // The trail is derived from the live hierarchy rather than from what was
  // clicked, so it is right even when the quarter moved the reader.
  const trail = useMemo(
    () => (focus ? pathTo(hierarchy.index, focus.position.id) : []),
    [hierarchy, focus],
  );

  const focusOn = (id: string) => {
    setAsked(pathTo(hierarchy.index, id).map((n) => n.position.id));
    setQuery('');
  };

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return null;
    return [...hierarchy.index.values()]
      .filter((n) =>
        n.position.title.toLowerCase().includes(q) ||
        n.position.orgUnit.toLowerCase().includes(q) ||
        n.position.division.toLowerCase().includes(q) ||
        (n.holderName ?? '').toLowerCase().includes(q))
      .sort((a, b) => a.position.title.localeCompare(b.position.title))
      .slice(0, 40);
  }, [hierarchy, query]);

  if (!focus) {
    return (
      <Card>
        <p className="small muted">
          No reporting lines were recorded for {quarterLabel(quarter)}, so there is no
          chart to draw. Move the date forward to a quarter the records cover.
        </p>
      </Card>
    );
  }

  const manager = trail.length > 1 ? trail[trail.length - 2] : null;
  const verdict = model.lineage.get(focus.position.id);
  const atTop = trail.length === 1;

  return (
    <div className="stack gap-4">
      {/* ------------------------------------------------------- Find a job */}
      <div className="oc-search no-print">
        <input
          className="field"
          type="search"
          value={query}
          placeholder="Find a job or a person…"
          aria-label="Find a job or a person"
          onChange={(e) => setQuery(e.target.value)}
        />
        <span className="small faint">
          {hierarchy.liveCount} jobs existed in {quarterLabel(quarter)}
        </span>
      </div>

      {results ? (
        <Card flush>
          <CardHead
            title={`${results.length} match${results.length === 1 ? '' : 'es'}`}
            meta="pick one to put it at the centre of the chart"
          />
          {results.length === 0 ? (
            <p className="small muted" style={{ padding: 'var(--s5)' }}>
              Nothing in {quarterLabel(quarter)} matches &ldquo;{query.trim()}&rdquo;. The job
              may have existed in another quarter — try moving the date.
            </p>
          ) : (
            <div className="oc-results">
              {results.map((node) => (
                <button
                  key={node.position.id}
                  className="oc-result"
                  onClick={() => focusOn(node.position.id)}
                >
                  <span className="oc-result-main">
                    <span className="oc-result-title">{node.position.title}</span>
                    <span className="oc-result-sub">
                      {node.holderName ?? 'vacant'} · {node.position.orgUnit}
                    </span>
                  </span>
                  <span className="oc-result-path">
                    {pathTo(hierarchy.index, node.position.id)
                      .slice(0, -1)
                      .map((n) => n.position.title)
                      .join(' › ') || 'top of the chart'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* ------------------------------------------------------- Notice */}
          {displaced ? (
            <div className="notice notice-info">
              <strong>{displaced.title}</strong> did not exist in {quarterLabel(quarter)}, so
              the chart has moved up to <strong>{focus.position.title}</strong>.
            </div>
          ) : null}

          {/* -------------------------------------------------------- Trail */}
          <nav className="oc-trail" aria-label="Chain of command">
            <button className="oc-crumb" onClick={() => setAsked([])} disabled={atTop}>
              Top
            </button>
            {trail.map((node, i) => (
              <span key={node.position.id} className="row gap-2">
                <i className="oc-crumb-sep" aria-hidden="true">›</i>
                {i === trail.length - 1 ? (
                  <span className="oc-crumb-now" aria-current="true">{node.position.title}</span>
                ) : (
                  <button className="oc-crumb" onClick={() => focusOn(node.position.id)}>
                    {node.position.title}
                  </button>
                )}
              </span>
            ))}
          </nav>

          {/* --------------------------------------------------- The focus */}
          {manager ? (
            <button className="oc-up" onClick={() => focusOn(manager.position.id)}>
              <i aria-hidden="true">↑</i>
              reports to <strong>{manager.position.title}</strong>
            </button>
          ) : null}

          <div className="oc-focus">
            <div className="oc-focus-head">
              <div style={{ minWidth: 0 }}>
                <div className="oc-focus-title">{focus.position.title}</div>
                <div className="oc-focus-holder">
                  <Holder name={focus.holderName} />
                  {focus.position.level !== null ? (
                    <span className="oc-grade">grade {focus.position.level}</span>
                  ) : null}
                </div>
              </div>
              {verdict && verdict.relation !== 'created' ? (
                <RelationBadge relation={verdict.relation} />
              ) : null}
            </div>

            <div className="oc-focus-foot">
              <span className="small muted">
                {focus.position.orgUnit} · {focus.position.division}
                {focus.descendantCount > 0
                  ? ` · ${focus.descendantCount} ${focus.descendantCount === 1 ? 'job' : 'jobs'} below in total`
                  : ''}
              </span>
              <button className="btn btn-sm" onClick={() => onOpenPosition(focus.position.id)}>
                See its history →
              </button>
            </div>
          </div>

          {/* ------------------------------------------------- Its reports */}
          {focus.children.length > 0 ? (
            <div className="stack gap-3">
              <div className="oc-section">
                Reports directly to this job
                <span className="tnum">({focus.children.length})</span>
              </div>
              <div className="oc-reports">
                {focus.children.map((child) => (
                  <JobCard
                    key={child.position.id}
                    node={child}
                    onFocus={focusOn}
                    onOpenPosition={onOpenPosition}
                    model={model}
                  />
                ))}
              </div>
            </div>
          ) : (
            <Card tight>
              <p className="small muted">
                Nobody reported to this job in {quarterLabel(quarter)}. Use the trail above
                to go back up, or open its history to see how the job itself changed.
              </p>
            </Card>
          )}

          {/* ------------------------------------------ Outside the chart */}
          {atTop && hierarchy.orphans.length > 0 ? (
            <div className="stack gap-3" style={{ marginTop: 'var(--s4)' }}>
              <div className="oc-section">
                Sits outside the chart
                <span className="tnum">({hierarchy.orphans.length})</span>
              </div>
              <p className="small muted" style={{ maxWidth: '68ch', margin: 0 }}>
                These jobs existed in {quarterLabel(quarter)}, but nothing in the records says
                who they reported to. We will not guess a manager, so they cannot be placed
                above — they open the same way as any other job.
              </p>
              <div className="oc-reports">
                {hierarchy.orphans.map((node) => (
                  <JobCard
                    key={node.position.id}
                    node={node}
                    onFocus={focusOn}
                    onOpenPosition={onOpenPosition}
                    model={model}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
