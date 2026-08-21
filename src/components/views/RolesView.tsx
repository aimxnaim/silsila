/**
 * Requirement 2: reconstruct and present the history of a role over time.
 *
 * The list is grouped by what the classifier concluded, not alphabetically,
 * because the interesting question is never "what roles exist" — it is "which
 * of these are actually new".
 */

import { useMemo, useState } from 'react';
import type { LineageRelation, OrgModel } from '../../domain/types.ts';
import { formatMonthYear } from '../../domain/dates.ts';
import { Card, CardHead, Eyebrow } from '../ui/primitives.tsx';
import { RELATION_LABEL, RELATION_MEANING, RelationBadge } from '../ui/vocabulary.tsx';

const ORDER: LineageRelation[] = ['rename', 'redesignated', 'split', 'merge', 'succeeded', 'created'];

export function RolesView({
  model, onOpenPosition,
}: { model: OrgModel; onOpenPosition: (id: string) => void }) {
  const [filter, setFilter] = useState<LineageRelation | 'all'>('all');

  const grouped = useMemo(() => {
    const out = new Map<LineageRelation, string[]>();
    for (const rel of ORDER) out.set(rel, []);
    for (const v of model.lineage.values()) out.get(v.relation)!.push(v.positionId);
    for (const list of out.values()) {
      list.sort((a, b) =>
        (model.positions.get(a)?.createdAt ?? '').localeCompare(model.positions.get(b)?.createdAt ?? ''),
      );
    }
    return out;
  }, [model]);

  const visible = ORDER.filter((rel) => (filter === 'all' || filter === rel) && grouped.get(rel)!.length > 0);

  return (
    <div className="stack gap-5">
      <div className="page-head">
        <Eyebrow>Every job in the organisation</Eyebrow>
        <h2 style={{ marginTop: 'var(--s3)', maxWidth: '22ch' }}>
          Which of these jobs are <em>actually new</em>?
        </h2>
        <p className="measure muted" style={{ marginTop: 'var(--s4)', fontSize: 16 }}>
          Sorting a list of job titles alphabetically tells you nothing. These are
          grouped by what each job&rsquo;s <strong>arrival actually meant</strong> —
          whether somebody was hired, or an existing job was simply given a new name.
        </p>
        <p className="measure muted small" style={{ marginTop: 'var(--s3)' }}>
          Click any row to see where the job came from, where it went, and the four
          measurements behind our conclusion.
        </p>
      </div>

      <div className="chiprow no-print">
        <button
          className="tab"
          aria-selected={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          Everything ({model.positions.size})
        </button>
        {ORDER.map((rel) => {
          const n = grouped.get(rel)!.length;
          if (n === 0) return null;
          return (
            <button
              key={rel}
              className="tab"
              aria-selected={filter === rel}
              onClick={() => setFilter(rel)}
            >
              {RELATION_LABEL[rel]} {n}
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
                        <div style={{ fontWeight: 500 }}>{pos.title}</div>
                        <div className="micro faint">{pos.orgUnit} · <span className="mono">{pos.id}</span></div>
                      </td>
                      <td className="small muted">{pos.division}</td>
                      <td className="small muted tnum">
                        {formatMonthYear(pos.createdAt)} — {pos.closedAt ? formatMonthYear(pos.closedAt) : 'present'}
                      </td>
                      <td className="small tnum">
                        {Math.round(v.confidence * 100)}%
                        {v.needsReview ? (
                          <div className="micro" style={{ color: 'var(--saffron-deep)' }}>
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
    </div>
  );
}
