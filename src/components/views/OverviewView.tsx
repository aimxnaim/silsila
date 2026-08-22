/**
 * Company overview — the front door.
 *
 * Four figures, then the history itself. The history used to live behind a tab
 * called "Timeline", which meant the page that claims to say what the records
 * contain could only gesture at it with a chart of five columns and a link.
 * The full thing is here now, and the five-column teaser is gone: a summary of
 * a chart that sits directly underneath it was never worth the room.
 *
 * The department cards moved the other way, out to a tab of their own. They
 * were the most-clicked thing on this page and they are a destination, not a
 * summary — see DepartmentsView.
 */

import { useMemo } from 'react';
import type { Metrics, OrgModel } from '../../domain/types.ts';
import { departments } from '../../domain/overview.ts';
import { toneAt } from '../ui/vocabulary.tsx';
import { ChangeSection } from './ChangeSection.tsx';

export function OverviewView({
  model, metrics, quarter, onQuarterChange, onGoToDepartments, onAnalyse,
  onOpenPosition, onOpenPerson,
}: {
  model: OrgModel;
  metrics: Metrics;
  quarter: number;
  onQuarterChange: (q: number) => void;
  onGoToDepartments: () => void;
  onAnalyse: () => void;
  onOpenPosition: (id: string) => void;
  onOpenPerson: (id: string) => void;
}) {
  const depts = useMemo(() => departments(model), [model]);
  const relabelled = metrics.renameCount + metrics.splitCount + metrics.mergeCount;

  return (
    <div className="stack gap-6">
      <div>
        <div className="page-title">Company overview</div>
        <div className="page-sub">
          {metrics.peopleCount} people across {depts.length} departments,{' '}
          {model.window.startYear} onwards. What the records contain, and how the shape
          of the place moved.
        </div>
      </div>

      {/* ---- The one thing this page asks the reader to do -------------- */}
      <button className="analyse" onClick={onAnalyse}>
        <span className="analyse-mark" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="8.6" cy="8.6" r="5.4" />
            <path d="M12.6 12.6L17 17" />
            <path d="M6.4 9.6v1.8M8.6 7.2v4.2M10.8 8.8v2.6" />
          </svg>
        </span>
        <span className="analyse-text">
          <span className="analyse-title">Feature Analysis</span>
          <span className="analyse-sub">
            Read these records for patterns worth an HR conversation &mdash; across the
            organisation, or for one person. Every finding shows the rule behind it.
          </span>
        </span>
        <span className="analyse-go" aria-hidden="true">&rarr;</span>
      </button>

      <div className="kpi-row">
        <div className="kpi" style={{ '--tone': toneAt(0).ink, '--tone-bg': toneAt(0).bg } as React.CSSProperties}>
          <div className="kpi-top">
            <span className="kpi-label">Total headcount</span>
            <span className="kpi-tag">H</span>
          </div>
          <span className="kpi-value tnum">{metrics.headcountEnd}</span>
          <span className="kpi-note">in seats at the end of the period</span>
        </div>

        {/* The one KPI that is also a door, because it has somewhere to go. */}
        <button
          className="kpi kpi-link"
          onClick={onGoToDepartments}
          style={{ '--tone': toneAt(2).ink, '--tone-bg': toneAt(2).bg } as React.CSSProperties}
        >
          <div className="kpi-top">
            <span className="kpi-label">Departments</span>
            <span className="kpi-tag">D</span>
          </div>
          <span className="kpi-value tnum">{depts.length}</span>
          <span className="kpi-note">
            {depts.slice(0, 3).map((d) => d.division).join(', ')} &mdash; see all &rsaquo;
          </span>
        </button>

        <div className="kpi" style={{ '--tone': toneAt(1).ink, '--tone-bg': toneAt(1).bg } as React.CSSProperties}>
          <div className="kpi-top">
            <span className="kpi-label">Relabelled, not new</span>
            <span className="kpi-tag">R</span>
          </div>
          <span className="kpi-value tnum">{relabelled}</span>
          <span className="kpi-note">renamed, split or merged — nobody was hired</span>
        </div>

        <div className="kpi" style={{ '--tone': toneAt(4).ink, '--tone-bg': toneAt(4).bg } as React.CSSProperties}>
          <div className="kpi-top">
            <span className="kpi-label">Genuinely new</span>
            <span className="kpi-tag">N</span>
          </div>
          <span className="kpi-value tnum">{metrics.genuinelyNewCount}</span>
          <span className="kpi-note">real growth over the period</span>
        </div>
      </div>

      <ChangeSection
        model={model}
        metrics={metrics}
        quarter={quarter}
        onQuarterChange={onQuarterChange}
        onOpenPosition={onOpenPosition}
        onOpenPerson={onOpenPerson}
      />
    </div>
  );
}
