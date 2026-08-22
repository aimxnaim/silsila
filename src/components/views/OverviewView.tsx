/**
 * Company overview — the first screen after the front page.
 *
 * Figures, then departments, then the year. Every card leads somewhere: the
 * department cards open the people inside them, the year chart opens the
 * timeline. Nothing here is a number you can only look at.
 */

import { useMemo } from 'react';
import type { Metrics, OrgModel } from '../../domain/types.ts';
import { WINDOW_START_YEAR, toQuarterIndex } from '../../domain/dates.ts';
import { departments } from '../../domain/overview.ts';
import { deptAbbr, deptColor } from '../ui/vocabulary.tsx';

export function OverviewView({
  model, metrics, onOpenDept, onGoToTimeline,
}: {
  model: OrgModel;
  metrics: Metrics;
  onOpenDept: (division: string) => void;
  onGoToTimeline: () => void;
}) {
  const depts = useMemo(() => departments(model), [model]);
  const relabelled = metrics.renameCount + metrics.splitCount + metrics.mergeCount;

  // Scaled against the largest department, not the firm: against the firm every
  // bar is a stub and the comparison the bar exists for is unreadable.
  const largest = Math.max(...depts.map((d) => d.headcount), 1);

  /** Jobs created per year — the shape of the period, at a glance. */
  const years = useMemo(() => {
    const counts = new Map<number, number>();
    for (const pos of model.positions.values()) {
      const q = toQuarterIndex(pos.createdAt);
      if (q === null) continue;
      const year = WINDOW_START_YEAR + Math.floor(q / 4);
      counts.set(year, (counts.get(year) ?? 0) + 1);
    }
    const out = [...counts.entries()].sort((a, b) => a[0] - b[0]);
    const peak = Math.max(...out.map(([, n]) => n), 1);
    return out.map(([year, n]) => ({ year, n, h: `${Math.round((n / peak) * 100)}%` }));
  }, [model]);

  return (
    <div className="stack gap-6">
      <div>
        <div className="page-title">Company overview</div>
        <div className="page-sub">
          {metrics.peopleCount} people across {depts.length} departments. Click any
          department to see who works there.
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-top">
            <span className="kpi-label">Total headcount</span>
            <span className="kpi-tag kpi-tag--stone">H</span>
          </div>
          <span className="kpi-value tnum">{metrics.headcountEnd}</span>
          <span className="kpi-note">in seats at the end of the period</span>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <span className="kpi-label">Departments</span>
            <span className="kpi-tag kpi-tag--stone">D</span>
          </div>
          <span className="kpi-value tnum">{depts.length}</span>
          <span className="kpi-note">{depts.slice(0, 3).map((d) => d.division).join(', ')}</span>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <span className="kpi-label">Relabelled, not new</span>
            <span className="kpi-tag kpi-tag--verm">R</span>
          </div>
          <span className="kpi-value tnum">{relabelled}</span>
          <span className="kpi-note">renamed, split or merged — nobody was hired</span>
        </div>

        <div className="kpi">
          <div className="kpi-top">
            <span className="kpi-label">Genuinely new</span>
            <span className="kpi-tag kpi-tag--ink">N</span>
          </div>
          <span className="kpi-value tnum">{metrics.genuinelyNewCount}</span>
          <span className="kpi-note">real growth over the period</span>
        </div>
      </div>

      <div>
        <div className="row gap-3 wrap" style={{ alignItems: 'baseline', marginBottom: 'var(--s3)' }}>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Departments</div>
          <div className="small muted">click a card to open its people</div>
        </div>

        <div className="dept-grid">
          {depts.map((d) => (
            <button key={d.division} className="dept" onClick={() => onOpenDept(d.division)}>
              <span className="dept-top">
                <span className="dept-tile" style={{ background: deptColor(d.division) }}>
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
                    background: deptColor(d.division),
                  }}
                />
              </span>

              <span className="dept-foot">
                <span>{Math.round((d.headcount / Math.max(metrics.headcountEnd, 1)) * 100)}% of the firm</span>
                <span>{d.changes} changed</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="row spread gap-4 wrap" style={{ alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Work through the year</div>
            <div className="small muted" style={{ marginTop: 3 }}>
              Jobs opened each year, {years[0]?.year} to {years[years.length - 1]?.year}.
            </div>
          </div>
          <button className="backlink no-print" style={{ color: 'var(--brand)' }} onClick={onGoToTimeline}>
            Open full timeline &rsaquo;
          </button>
        </div>

        <div className="minichart">
          {years.map((y) => (
            <div className="minicol" key={y.year} title={`${y.year} — ${y.n} jobs opened`}>
              <i style={{ height: y.h }} />
              <span>{y.year}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
