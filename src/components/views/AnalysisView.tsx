/**
 * Feature Analysis — what the records say when you ask them a question.
 *
 * This is not the front door. The overview is, and it stays deliberately
 * factual: counts, departments, a year. Analysis is the act a reader chooses,
 * which is why it lives behind a button rather than under the reader on load.
 * A dashboard nobody asked for teaches people to scroll past it.
 *
 * Two scopes, one set of rules. General reads the whole organisation; By
 * person narrows the identical detectors to one record. The order inside each
 * is the argument: what the workforce IS, then what may need attention, then
 * where to look next.
 */

import { useMemo } from 'react';
import type { Metrics, OrgModel } from '../../domain/types.ts';
import type { AreaId, EvidenceRecord, Signal } from '../../domain/insights.ts';
import { signals } from '../../domain/insights.ts';
import type { PresetId } from '../../domain/window.ts';
import { PRESETS, previousRange, rangeFor, recordsCurrentTo } from '../../domain/window.ts';
import { headcountAt, turnover } from '../../domain/workforce.ts';
import { mobilityRate } from '../../domain/mobility.ts';
import { criticalRoles, successionCoverage } from '../../domain/structure.ts';
import { analysablePeople } from '../../domain/personAnalysis.ts';
import { formatDate } from '../../domain/dates.ts';
import { toneAt } from '../ui/vocabulary.tsx';
import { InsightCard } from './wi/InsightCard.tsx';
import { PersonAnalysisPanel } from './wi/PersonAnalysis.tsx';

export type AnalysisScope = 'general' | 'person';

export function AnalysisView({
  model, preset, onPresetChange, scope, onScopeChange, personId, onSelectPerson,
  onBack, onOpenDept, onOpenPerson, onOpenPosition, onOpenArea,
}: {
  model: OrgModel;
  metrics: Metrics;
  preset: PresetId;
  onPresetChange: (id: PresetId) => void;
  scope: AnalysisScope;
  onScopeChange: (scope: AnalysisScope) => void;
  personId: string | null;
  onSelectPerson: (id: string) => void;
  onBack: () => void;
  onOpenDept: (division: string) => void;
  onOpenPerson: (id: string) => void;
  onOpenPosition: (id: string) => void;
  onOpenArea: (id: AreaId) => void;
}) {
  const range = useMemo(() => rangeFor(model, preset), [model, preset]);
  const prior = useMemo(() => previousRange(model, range), [model, range]);
  const found = useMemo(() => signals(model, range), [model, range]);
  const people = useMemo(() => analysablePeople(model), [model]);

  const now = headcountAt(model, range.to);
  const before = prior ? headcountAt(model, prior.to) : null;
  const delta = before !== null && before > 0 ? ((now - before) / before) * 100 : null;

  const churn = useMemo(() => turnover(model, range), [model, range]);
  const mobility = useMemo(() => mobilityRate(model, range), [model, range]);
  const critical = useMemo(() => criticalRoles(model, range.to), [model, range]);
  const coverage = useMemo(() => successionCoverage(model, range.to), [model, range]);

  const openRecord = (r: EvidenceRecord) =>
    r.kind === 'person' ? onOpenPerson(r.id) : onOpenPosition(r.id);

  const act = (s: Signal) => {
    const t = s.action.target;
    if (t.kind === 'dept') onOpenDept(t.id);
    else if (t.kind === 'person') onOpenPerson(t.id);
    else if (t.kind === 'position') onOpenPosition(t.id);
    else onOpenArea(t.id);
  };

  return (
    <div className="stack gap-6">
      <button className="backlink no-print" onClick={onBack}>&lsaquo; Back to the overview</button>

      {/* ---- Header ---------------------------------------------------- */}
      <div className="wi-head">
        <div>
          <div className="wi-eyebrow">Silsila</div>
          <h1 className="wi-title">Feature Analysis</h1>
          <p className="wi-sub">
            The loaded records, read for patterns worth an HR conversation &mdash; across
            the organisation, or for one person.
          </p>
        </div>

        <div className="wi-range no-print">
          <select
            value={preset}
            onChange={(e) => onPresetChange(e.target.value as PresetId)}
            aria-label="Reporting period"
          >
            {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <span className="wi-updated">
            Records current to {formatDate(recordsCurrentTo(model))}
          </span>
        </div>
      </div>

      {/* ---- Scope ----------------------------------------------------- */}
      <div className="seg no-print" role="tablist" aria-label="Analysis scope">
        <button
          role="tab"
          aria-selected={scope === 'general'}
          onClick={() => onScopeChange('general')}
        >
          General
        </button>
        <button
          role="tab"
          aria-selected={scope === 'person'}
          onClick={() => onScopeChange('person')}
        >
          By person
        </button>
      </div>

      {scope === 'person' ? (
        <PersonAnalysisPanel
          model={model}
          range={range}
          people={people}
          personId={personId ?? people[0]?.id ?? null}
          onSelectPerson={onSelectPerson}
          onOpenPerson={onOpenPerson}
          onOpenPosition={onOpenPosition}
        />
      ) : (
        <>
          {/* ---- Snapshot ---------------------------------------------- */}
          <div className="wi-kpis">
            <button
              className="wi-kpi"
              style={{ '--tone': toneAt(0).ink, '--tone-bg': toneAt(0).bg } as React.CSSProperties}
              onClick={() => onOpenArea('structure')}
            >
              <span className="wi-kpi-label">Total employees</span>
              <span className="wi-kpi-value tnum">{now}</span>
              <span className="wi-kpi-note">
                {delta === null ? `over ${range.label}`
                  : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs previous period`}
              </span>
            </button>

            <button
              className="wi-kpi"
              style={{ '--tone': toneAt(1).ink, '--tone-bg': toneAt(1).bg } as React.CSSProperties}
              onClick={() => onOpenArea('retention')}
            >
              <span className="wi-kpi-label">Turnover</span>
              <span className="wi-kpi-value tnum">{churn.departures.length}</span>
              <span className="wi-kpi-note">
                departure{churn.departures.length === 1 ? '' : 's'} from an average of{' '}
                {churn.mean.toFixed(0)} people
                {churn.rate !== null ? ` (${churn.rate.toFixed(1)}%)` : ''}
              </span>
            </button>

            <button
              className="wi-kpi"
              style={{ '--tone': toneAt(2).ink, '--tone-bg': toneAt(2).bg } as React.CSSProperties}
              onClick={() => onOpenArea('mobility')}
            >
              <span className="wi-kpi-label">Internal mobility</span>
              <span className="wi-kpi-value tnum">
                {mobility.rate === null ? '—' : `${mobility.rate.toFixed(1)}%`}
              </span>
              <span className="wi-kpi-note">
                {mobility.movers} with a recorded role or department move
              </span>
            </button>

            <button
              className="wi-kpi"
              style={{ '--tone': toneAt(3).ink, '--tone-bg': toneAt(3).bg } as React.CSSProperties}
              onClick={() => onOpenArea('succession')}
            >
              <span className="wi-kpi-label">Critical roles</span>
              <span className="wi-kpi-value tnum">{critical.length}</span>
              <span className="wi-kpi-note">
                {coverage.gaps.length} require succession review
              </span>
            </button>
          </div>

          {/* ---- What should HR know? ---------------------------------- */}
          <div>
            <div style={{ marginBottom: 'var(--s4)' }}>
              <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.02em' }}>
                What should HR know?
              </div>
              <div className="small muted" style={{ marginTop: 3 }}>
                Signals surfaced from workforce and organisational history.
              </div>
            </div>

            {found.length === 0 ? (
              <div className="wi-unknown">
                No signals were raised for this period. The records may be too short to
                show a pattern &mdash; try a longer period.
              </div>
            ) : (
              <div className="wi-signals">
                {found.slice(0, 4).map((s) => (
                  <InsightCard key={s.id} signal={s} onOpenRecord={openRecord} onAct={act} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
