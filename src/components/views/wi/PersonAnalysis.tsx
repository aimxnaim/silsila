/**
 * The analysis, narrowed to one person.
 *
 * Two things sit above the findings, deliberately. The first is who this is
 * and how long they have been here, because a signal about someone you cannot
 * place is noise. The second is the three progression checks — shown whether
 * they pass or fail, since an unmet check is the most useful thing on the page
 * for the reader who was about to assume otherwise.
 *
 * Findings come last and use the same card as the general analysis. A person
 * with nothing raised gets told so plainly rather than shown empty scaffolding.
 */

import { useMemo } from 'react';
import type { OrgModel } from '../../../domain/types.ts';
import type { EvidenceRecord, Signal } from '../../../domain/insights.ts';
import type { Range } from '../../../domain/window.ts';
import type { PersonOption } from '../../../domain/personAnalysis.ts';
import { personAnalysis } from '../../../domain/personAnalysis.ts';
import { formatDate } from '../../../domain/dates.ts';
import { Avatar } from '../../ui/Avatar.tsx';
import { DeptChip, toneAt, toneOf } from '../../ui/vocabulary.tsx';
import { InsightStream } from './InsightStream.tsx';

const MOVE_LABEL = {
  transfer: 'Transfer',
  progression: 'Step up',
  lateral: 'Lateral',
} as const;

function Stat({ label, value, note, tone }: {
  label: string; value: string; note?: string; tone: number;
}) {
  return (
    <div
      className="pa-stat"
      style={{ '--tone': toneAt(tone).ink, '--tone-bg': toneAt(tone).bg } as React.CSSProperties}
    >
      <span className="pa-stat-label">{label}</span>
      <span className="pa-stat-value tnum">{value}</span>
      {note ? <span className="pa-stat-note">{note}</span> : null}
    </div>
  );
}

export function PersonAnalysisPanel({
  model, range, people, personId, onSelectPerson, onOpenPerson, onOpenPosition,
}: {
  model: OrgModel;
  range: Range;
  people: PersonOption[];
  personId: string | null;
  onSelectPerson: (id: string) => void;
  onOpenPerson: (id: string) => void;
  onOpenPosition: (id: string) => void;
}) {
  const analysis = useMemo(
    () => (personId ? personAnalysis(model, personId, range) : null),
    [model, personId, range],
  );

  const openRecord = (r: EvidenceRecord) =>
    r.kind === 'person' ? onOpenPerson(r.id) : onOpenPosition(r.id);

  const act = (s: Signal) => {
    const t = s.action.target;
    if (t.kind === 'person') onOpenPerson(t.id);
    else if (t.kind === 'position') onOpenPosition(t.id);
  };

  return (
    <div className="stack gap-5">
      {/* ---- Who to analyse ---------------------------------------------- */}
      <div className="pa-picker no-print">
        <label htmlFor="pa-person">Employee</label>
        <select
          id="pa-person"
          value={personId ?? ''}
          onChange={(e) => onSelectPerson(e.target.value)}
        >
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {p.title}{p.inSeat ? '' : ' (departed)'}
            </option>
          ))}
        </select>
        <span className="small muted">
          {people.length} people in the loaded records
        </span>
      </div>

      {!analysis ? (
        <div className="wi-unknown">
          Select an employee to analyse their record against the same rules used
          across the organisation.
        </div>
      ) : (
        <>
          {/* ---- Identity and service ------------------------------------ */}
          <div
            className="pa-head"
            style={{
              '--tone': toneOf(analysis.division).ink,
              '--tone-bg': toneOf(analysis.division).bg,
            } as React.CSSProperties}
          >
            <Avatar name={analysis.name} large />
            <div className="pa-id">
              <div className="pa-name">{analysis.name}</div>
              <div className="pa-role">
                {analysis.title} <DeptChip name={analysis.division} />
              </div>
              <div className="pa-status">
                {analysis.inSeat
                  ? `In seat since ${formatDate(analysis.since)}`
                  : `Departed ${formatDate(analysis.departedOn)}`}
              </div>
            </div>
            <button className="wi-cta" onClick={() => onOpenPerson(analysis.personId)}>
              Open the full employee record &rarr;
            </button>
          </div>

          <div className="pa-stats">
            <Stat
              tone={0}
              label="Years of service"
              value={analysis.yearsService === null ? '—' : analysis.yearsService.toFixed(1)}
              note={analysis.inSeat ? 'to the end of the records' : 'at departure'}
            />
            <Stat
              tone={1}
              label="Years in current seat"
              value={analysis.yearsInRole === null ? '—' : analysis.yearsInRole.toFixed(1)}
              note={
                analysis.medianYearsInRole === null
                  ? 'no median available'
                  : `organisational median ${analysis.medianYearsInRole.toFixed(1)}`
              }
            />
            <Stat
              tone={2}
              label="Recorded moves"
              value={`${analysis.moves.length}`}
              note={analysis.moves.length === 0 ? 'one seat throughout' : 'across their whole history'}
            />
            <Stat
              tone={3}
              label="Direct reports"
              value={analysis.seat ? `${analysis.seat.reports}` : '—'}
              note={
                analysis.seat
                  ? `organisational mean ${analysis.seat.meanReports.toFixed(1)}`
                  : 'not in a seat'
              }
            />
          </div>

          {/* ---- The three progression checks ---------------------------- */}
          <div className="card">
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.02em' }}>
              Progression checks
            </div>
            <div className="small muted" style={{ marginTop: 3 }}>
              Three checks against the record. All three must hold before a progression
              signal is raised.
            </div>

            {!analysis.progression ? (
              <div className="wi-unknown" style={{ marginTop: 'var(--s4)' }}>
                Progression checks apply to people currently in a seat. This record
                closed on {formatDate(analysis.departedOn)}.
              </div>
            ) : (
              <>
                <ul className="pa-checks">
                  {analysis.progression.checks.map((c) => (
                    <li key={c.label} className={c.met ? 'is-met' : 'is-unmet'}>
                      <span className="pa-check-mark" aria-hidden="true">
                        {c.met ? '✓' : '✗'}
                      </span>
                      <span>
                        <b>{c.label}</b>
                        <span className="pa-check-detail">{c.detail}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <p className="pa-verdict">
                  {analysis.progression.signal
                    ? 'All three checks hold. This record is raised for progression review below.'
                    : `Not raised: ${analysis.progression.checks.filter((c) => !c.met).length} of 3 checks are unmet.`}
                </p>
                <p className="wi-basis">
                  Derived: time in seat at or above the organisational median, at least one
                  previous step up in grade, and a higher grade existing in their department.
                </p>
              </>
            )}
          </div>

          {/* ---- Findings ------------------------------------------------ */}
          <InsightStream
            title={`What should HR know about ${analysis.name.split(' ')[0]}?`}
            note="The same detectors used across the organisation, narrowed to this record."
            steps={[
              `Reading ${analysis.name}’s record`,
              `Checking ${analysis.moves.length} recorded move${analysis.moves.length === 1 ? '' : 's'} against the organisational rules`,
              `Ranking ${analysis.signals.length} finding${analysis.signals.length === 1 ? '' : 's'}`,
            ]}
            signals={analysis.signals}
            runKey={`person:${analysis.personId}:${range.from}:${range.to}`}
            empty={
              <>
                No signals were raised for this record. Nothing in their history matches
                a detector &mdash; which is itself worth knowing.
              </>
            }
            onOpenRecord={openRecord}
            onAct={act}
          />

          {/* ---- Movement history ---------------------------------------- */}
          {analysis.moves.length > 0 ? (
            <div className="card">
              <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.02em' }}>
                Movement on record
              </div>
              <ul className="pa-moves">
                {analysis.moves.map((m) => (
                  <li key={`${m.fromPositionId}-${m.toPositionId}-${m.date}`}>
                    <span className={`pa-move-kind pa-move-kind--${m.kind}`}>
                      {MOVE_LABEL[m.kind]}
                    </span>
                    <button onClick={() => onOpenPosition(m.toPositionId)}>
                      {m.fromTitle} &rarr; {m.toTitle}
                    </button>
                    <span className="pa-move-date">{formatDate(m.date)}</span>
                  </li>
                ))}
              </ul>
              <p className="wi-basis">
                Derived: consecutive assignments in different positions. A transfer changes
                department, a step up raises grade, anything else is lateral.
              </p>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
