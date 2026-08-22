/**
 * Departments — the index.
 *
 * Promoted out of the overview and given a tab of its own, because it was the
 * most-clicked thing on a page that had already grown too long, and because
 * "which department" is a question a reader returns to rather than passes
 * through once.
 *
 * Cards first, then the same figures as a table. The cards answer "which one
 * is big" from across the room; the table answers "how do they compare" for a
 * reader who has stopped browsing and started counting. Both open the same
 * department page, so neither is a dead end.
 */

import { useMemo } from 'react';
import type { Metrics, OrgModel } from '../../domain/types.ts';
import { departments } from '../../domain/overview.ts';
import { deptAbbr, toneOf } from '../ui/vocabulary.tsx';

export function DepartmentsView({
  model, metrics, onOpenDept,
}: {
  model: OrgModel;
  metrics: Metrics;
  onOpenDept: (division: string) => void;
}) {
  const depts = useMemo(() => departments(model), [model]);

  // Scaled against the largest department, not the firm: against the firm every
  // bar is a stub and the comparison the bar exists for is unreadable.
  const largest = Math.max(...depts.map((d) => d.headcount), 1);
  const firm = Math.max(metrics.headcountEnd, 1);

  return (
    <div className="stack gap-5">
      <div>
        <div className="page-title">Departments</div>
        <div className="page-sub" style={{ maxWidth: '64ch' }}>
          {depts.length} departments holding {metrics.headcountEnd} people. Open one to
          see everyone in it and how its jobs have changed.
        </div>
      </div>

      <div className="dept-grid">
        {depts.map((d) => (
          <button
            key={d.division}
            className="dept"
            onClick={() => onOpenDept(d.division)}
            style={{
              '--tone': toneOf(d.division).ink,
              '--tone-bg': toneOf(d.division).bg,
              '--tone-line': toneOf(d.division).line,
            } as React.CSSProperties}
          >
            <span className="dept-top">
              <span className="dept-tile" style={{ background: 'var(--tone)' }}>
                {deptAbbr(d.division)}
              </span>
              <span className="dept-name">{d.division}</span>
            </span>

            <span className="dept-count">
              <b className="tnum">{d.headcount}</b>
              <span>people</span>
            </span>

            <span className="dept-bar">
              <span
                className="dept-bar-fill"
                style={{
                  display: 'block',
                  width: `${Math.round((d.headcount / largest) * 100)}%`,
                  background: 'var(--tone)',
                }}
              />
            </span>

            <span className="dept-foot">
              <span>{Math.round((d.headcount / firm) * 100)}% of the firm</span>
              <span>{d.changes} changed</span>
            </span>
          </button>
        ))}
      </div>

      <div className="card card-flush">
        <div className="card-head">
          <h3>Side by side</h3>
          <span className="micro faint">
            &ldquo;Changed&rdquo; counts seats that arrived from an earlier seat &mdash; a
            rename, a split or a merge &mdash; not new hiring
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Department</th>
              <th style={{ width: 115 }}>People now</th>
              <th style={{ width: 110 }}>Ever here</th>
              <th style={{ width: 110 }}>Jobs tracked</th>
              <th style={{ width: 100 }}>Changed</th>
              <th style={{ width: 90 }}>Teams</th>
            </tr>
          </thead>
          <tbody>
            {depts.map((d) => (
              <tr key={d.division} className="clickable" onClick={() => onOpenDept(d.division)}>
                <td>
                  <div className="row gap-3" style={{ minWidth: 0 }}>
                    <span
                      className="dept-tile"
                      style={{ background: toneOf(d.division).ink, width: 26, height: 26, borderRadius: 7, fontSize: 10 }}
                    >
                      {deptAbbr(d.division)}
                    </span>
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{d.division}</span>
                  </div>
                </td>
                <td className="tnum">{d.headcount}</td>
                <td className="tnum">{d.everCount}</td>
                <td className="tnum">{d.positions}</td>
                <td className="tnum">{d.changes}</td>
                <td className="tnum">{d.units.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
