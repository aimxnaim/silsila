/**
 * Requirement 2: reconstruct and present the history of a role over time.
 *
 * Two ways in, because two different questions get asked of this data.
 *
 * "Org chart" is the default, because who-reports-to-whom is the one
 * organisational picture everybody already knows how to read. A list of 78
 * job titles is not navigable; a tree from the chief executive downwards is.
 * The thing that makes it more than an ordinary org chart is the date picker:
 * this tree can be rebuilt for ANY past quarter, which is the entire point of
 * the product. Set it to 2021 and then to 2026 and the shape of the company
 * visibly changes.
 *
 * "By what changed" is the analytical view — every job grouped by whether its
 * arrival meant somebody was hired, or an existing job was renamed.
 */

import { useMemo, useState } from 'react';
import type { LineageRelation, OrgModel } from '../../domain/types.ts';
import { formatMonthYear, quarterLabel } from '../../domain/dates.ts';
import { buildHierarchy, type TreeNode } from '../../domain/hierarchy.ts';
import { Badge, Card, CardHead, Eyebrow } from '../ui/primitives.tsx';
import { RELATION_LABEL, RELATION_MEANING, RelationBadge } from '../ui/vocabulary.tsx';

const ORDER: LineageRelation[] = ['rename', 'redesignated', 'split', 'merge', 'succeeded', 'created'];

/* -------------------------------------------------------------- The tree */

function TreeRow({
  node, depth, expanded, onToggle, onOpenPosition, model,
}: {
  node: TreeNode;
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onOpenPosition: (id: string) => void;
  model: OrgModel;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.position.id);
  const verdict = model.lineage.get(node.position.id);

  return (
    <div className="tree-node">
      <button
        className="tree-row"
        onClick={() => (hasChildren ? onToggle(node.position.id) : onOpenPosition(node.position.id))}
      >
        <span className={`tree-twist ${hasChildren ? '' : 'tree-twist--leaf'}`} aria-hidden="true">
          {hasChildren ? (isOpen ? '−' : '+') : '·'}
        </span>

        <span className="tree-main">
          <span className="tree-title">{node.position.title}</span>
          <span className="tree-who">
            {node.holderName ?? <em>vacant</em>}
            {node.position.level !== null ? ` · grade ${node.position.level}` : ''}
          </span>
        </span>

        <span className="tree-meta">
          {hasChildren ? (
            <span className="tree-count">{node.descendantCount} below</span>
          ) : null}
          {verdict && verdict.relation !== 'created' ? (
            <RelationBadge relation={verdict.relation} />
          ) : null}
        </span>
      </button>

      {hasChildren && isOpen ? (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeRow
              key={child.position.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onOpenPosition={onOpenPosition}
              model={model}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------- The view */

export function RolesView({
  model, onOpenPosition,
}: { model: OrgModel; onOpenPosition: (id: string) => void }) {
  const [mode, setMode] = useState<'tree' | 'changes'>('tree');
  const [quarter, setQuarter] = useState(model.window.quarterCount - 1);
  const [filter, setFilter] = useState<LineageRelation | 'all'>('all');

  const hierarchy = useMemo(() => buildHierarchy(model, quarter), [model, quarter]);

  // Open the top two levels by default: enough to show the shape of the
  // company without burying the reader in 78 rows.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const defaultExpanded = useMemo(() => {
    const ids = new Set<string>();
    for (const root of hierarchy.roots) {
      ids.add(root.position.id);
      for (const child of root.children) ids.add(child.position.id);
    }
    return ids;
  }, [hierarchy]);

  const effective = expanded.size === 0 ? defaultExpanded : expanded;

  const toggle = (id: string) => {
    const next = new Set(effective);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    // Guard against the set emptying, which would silently re-apply defaults.
    setExpanded(next.size === 0 ? new Set(['__none__']) : next);
  };

  const grouped = useMemo(() => {
    const out = new Map<LineageRelation, string[]>();
    for (const rel of ORDER) out.set(rel, []);
    for (const v of model.lineage.values()) out.get(v.relation)!.push(v.positionId);
    for (const list of out.values()) {
      list.sort((a, b) =>
        (model.positions.get(a)?.createdAt ?? '').localeCompare(model.positions.get(b)?.createdAt ?? ''));
    }
    return out;
  }, [model]);

  const visible = ORDER.filter((rel) => (filter === 'all' || filter === rel) && grouped.get(rel)!.length > 0);

  return (
    <div className="stack gap-5">
      <div className="page-head">
        <Eyebrow>Every job in the organisation</Eyebrow>
        <h2 style={{ marginTop: 'var(--s3)', maxWidth: '22ch' }}>
          The org chart, <em>at any point in its past</em>
        </h2>
        <p className="measure muted" style={{ marginTop: 'var(--s4)', fontSize: 16 }}>
          Start at the chief executive and open the branches downwards, the same as any
          org chart. The difference is the date at the top: change it and you are looking
          at the company as it actually was in that quarter — jobs that had not been
          created yet disappear, and jobs that were later closed come back.
        </p>
      </div>

      <div className="row gap-4 wrap spread no-print">
        <div className="segmented">
          <button aria-pressed={mode === 'tree'} onClick={() => setMode('tree')}>Org chart</button>
          <button aria-pressed={mode === 'changes'} onClick={() => setMode('changes')}>By what changed</button>
        </div>

        {mode === 'tree' ? (
          <label className="row gap-2 small muted">
            Showing the company as it was in
            <select
              className="select"
              value={quarter}
              onChange={(e) => setQuarter(Number(e.target.value))}
            >
              {Array.from({ length: model.window.quarterCount }, (_, i) => (
                <option key={i} value={i}>{quarterLabel(i)}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {/* ---------------------------------------------------------- Tree */}
      {mode === 'tree' ? (
        <>
          <Card flush>
            <CardHead
              title={`${hierarchy.liveCount} jobs existed in ${quarterLabel(quarter)}`}
              meta="click a row with + to open it · click a job with no reports to see its history"
            />
            <div className="tree" style={{ border: 0, borderRadius: 0 }}>
              {hierarchy.roots.map((root) => (
                <TreeRow
                  key={root.position.id}
                  node={root}
                  depth={0}
                  expanded={effective}
                  onToggle={toggle}
                  onOpenPosition={onOpenPosition}
                  model={model}
                />
              ))}
              {hierarchy.roots.length === 0 ? (
                <p className="small faint" style={{ padding: 'var(--s5)' }}>
                  No reporting lines were recorded for this quarter, so there is no tree
                  to draw. Every job for this period is listed below.
                </p>
              ) : null}
            </div>
          </Card>

          {hierarchy.orphans.length > 0 ? (
            <Card flush>
              <CardHead
                title={`${hierarchy.orphans.length} jobs sit outside the tree`}
                meta="no reporting line was ever recorded for these"
              />
              <p className="small muted" style={{ padding: 'var(--s4) var(--s5) 0' }}>
                These jobs existed in {quarterLabel(quarter)}, but nothing in the records
                says who they reported to. We will not guess a manager, so they cannot be
                placed in the chart above.
              </p>
              <div className="tree" style={{ border: 0, borderRadius: 0, marginTop: 'var(--s4)' }}>
                {hierarchy.orphans.map((node) => (
                  <TreeRow
                    key={node.position.id}
                    node={node}
                    depth={0}
                    expanded={effective}
                    onToggle={toggle}
                    onOpenPosition={onOpenPosition}
                    model={model}
                  />
                ))}
              </div>
            </Card>
          ) : null}
        </>
      ) : (
        /* ------------------------------------------------- By what changed */
        <>
          <p className="measure muted" style={{ marginTop: 'calc(-1 * var(--s2))' }}>
            Sorting job titles alphabetically tells you nothing. These are grouped by what
            each job&rsquo;s <strong>arrival actually meant</strong> — whether somebody was
            hired, or an existing job was simply given a new name.
          </p>

          <div className="chiprow no-print">
            <button className="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>
              Everything ({model.positions.size})
            </button>
            {ORDER.map((rel) => {
              const n = grouped.get(rel)!.length;
              if (n === 0) return null;
              return (
                <button key={rel} className="tab" aria-selected={filter === rel} onClick={() => setFilter(rel)}>
                  {RELATION_LABEL[rel]} ({n})
                </button>
              );
            })}
          </div>

          {visible.map((rel) => (
            <Card flush key={rel}>
              <CardHead
                title={<span className="row gap-3"><RelationBadge relation={rel} /></span>}
                meta={RELATION_MEANING[rel]}
              />
              <div className="scroll-y" style={{ maxHeight: 460 }}>
                <table>
                  <thead>
                    <tr>
                      <th>The job</th>
                      <th>Part of</th>
                      <th>Existed from — to</th>
                      <th style={{ width: 110 }}>How sure we are</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.get(rel)!.map((id) => {
                      const pos = model.positions.get(id)!;
                      const v = model.lineage.get(id)!;
                      return (
                        <tr key={id} className="clickable" onClick={() => onOpenPosition(id)}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{pos.title}</div>
                            <div className="micro faint">{pos.orgUnit}</div>
                          </td>
                          <td className="small muted">{pos.division}</td>
                          <td className="small muted tnum">
                            {formatMonthYear(pos.createdAt)} — {pos.closedAt ? formatMonthYear(pos.closedAt) : 'now'}
                          </td>
                          <td className="small tnum">
                            {Math.round(v.confidence * 100)}%
                            {v.needsReview ? (
                              <div className="micro" style={{ color: 'var(--wr-fg)' }}>
                                a person should check
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </>
      )}

      <Card tight>
        <p className="small muted">
          <Badge tone="ink">Tip</Badge>{' '}
          Set the date above to {quarterLabel(0)}, then to {quarterLabel(model.window.quarterCount - 1)},
          and watch the tree change. Every job that appears in between is either genuine
          growth or a renamed version of something that was already there — which is
          exactly what the <strong>By what changed</strong> view separates.
        </p>
      </Card>
    </div>
  );
}
