/**
 * One person, as a page.
 *
 * Laid out the way an HR portal lays out an employee record — portrait behind
 * a rule, name and role top-right, then a grid of fields. That format is the
 * argument's delivery mechanism: this panel claims the titles changed because
 * the organisation was reorganised, not because the person kept moving, and
 * that only lands if the reader recognises what they are looking at first.
 */

import type { LineageRelation, OrgModel } from '../../domain/types.ts';
import { formatMonthYear, tenure, toQuarterIndex } from '../../domain/dates.ts';
import { structuralChangesFor } from '../../domain/metrics.ts';
import { Badge, Button } from '../ui/primitives.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { RELATION_LABEL, STATE, stateOf } from '../ui/vocabulary.tsx';

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div>
      <span className="field-label">{label}</span>
      <span className={`field-value ${empty ? 'is-empty' : ''}`}>
        {empty ? 'not recorded' : value}
      </span>
    </div>
  );
}

export function PersonDetail({
  model, personId, backLabel, onBack, onOpenPosition, onShowInTime,
}: {
  model: OrgModel;
  personId: string;
  backLabel: string;
  onBack: () => void;
  onOpenPosition: (id: string) => void;
  onShowInTime: (quarter: number) => void;
}) {
  const person = model.people.get(personId);
  if (!person) return null;

  const assignments = person.assignmentIds.map((id) => model.assignments.get(id)!);
  const first = assignments[0];
  const latest = assignments[assignments.length - 1];
  const currentPosition = latest ? model.positions.get(latest.positionId) : null;
  const manager = latest?.reportsToPositionId
    ? model.positions.get(latest.reportsToPositionId)
    : null;

  const structural = structuralChangesFor(model, personId);
  const distinctTitles = new Set(
    assignments.map((a) => model.positions.get(a.positionId)?.title).filter(Boolean),
  );
  const stillHere = Boolean(latest && !latest.endDate);

  return (
    <div className="stack gap-5">
      <button className="backlink no-print" onClick={onBack}>&lsaquo; {backLabel}</button>

      {/* ---- Profile header --------------------------------------------- */}
      <div className="card">
        <div className="profile-head">
          <div className="profile-photo">
            <span className="profile-photo-wrap">
              <Avatar name={person.name} large />
              {/* Where the source system puts its edit affordance. Inert here,
                  and captioned as such: Silsilah reads records, never writes. */}
              <span className="profile-photo-dot" aria-hidden="true" />
            </span>
            <span className="profile-photo-note">no photo on record</span>
          </div>

          <div className="profile-id">
            <div className="row spread gap-4 wrap" style={{ alignItems: 'flex-start' }}>
              <div>
                <div className="profile-name">{person.name}</div>
                <div className="profile-role">{currentPosition?.title ?? '—'}</div>
              </div>
              <div className="no-print">
                <Button
                  variant="primary"
                  onClick={() => onShowInTime(toQuarterIndex(first?.startDate) ?? 0)}
                >
                  Show when they joined
                </Button>
              </div>
            </div>

            <div className="field-grid">
              <Field label="Employee code" value={<span className="mono">{person.id}</span>} />
              <Field label="Department" value={currentPosition?.division} />
              <Field label="Team" value={currentPosition?.orgUnit} />
              <Field
                label="Grade"
                value={currentPosition?.level ?? null}
              />
              <Field label="Employment status" value={latest?.employmentType} />
              <Field label="Location" value={currentPosition?.location} />
              <Field label="Years of service" value={tenure(first?.startDate, latest?.endDate ?? null)} />
              <Field label="Joined" value={formatMonthYear(first?.startDate)} />
              <Field label="Reports to" value={manager?.title} />
              <Field
                label="Currently employed"
                value={stillHere ? 'Yes' : `Left ${formatMonthYear(latest?.endDate ?? null)}`}
              />
              <Field label="Jobs held" value={assignments.length} />
              <Field label="Distinct job titles" value={distinctTitles.size} />
            </div>
          </div>
        </div>
      </div>

      {/* ---- Career history --------------------------------------------- */}
      <div className="card card-flush">
        <div className="card-head">
          <h3>Jobs held</h3>
          <span className="micro faint">{assignments.length} on record</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style={{ width: 130 }}>Position ID</th>
              <th>Job</th>
              <th style={{ width: 200 }}>Period</th>
              <th style={{ width: 190 }}>Reported to</th>
              <th style={{ width: 130 }}>Source</th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((a) => {
              const pos = model.positions.get(a.positionId);
              const mgr = a.reportsToPositionId ? model.positions.get(a.reportsToPositionId) : null;
              return (
                <tr key={a.id} className="clickable" onClick={() => onOpenPosition(a.positionId)}>
                  <td className="mono">{a.positionId}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{pos?.title}</div>
                    <div className="micro faint">{pos?.orgUnit}</div>
                  </td>
                  <td className="tnum">
                    {formatMonthYear(a.startDate)} — {a.endDate ? formatMonthYear(a.endDate) : 'present'}
                    {a.startDateInferred ? <div className="micro faint">start derived, not recorded</div> : null}
                  </td>
                  <td>{mgr ? mgr.title : <span className="faint" style={{ fontStyle: 'italic' }}>not recorded</span>}</td>
                  <td className="micro faint">{a.source}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ---- The connection ---------------------------------------------- */}
      <div className="card card-flush">
        <div className="card-head">
          <h3>What moved around them</h3>
          <span className="micro faint">
            {structural.length === 0 ? 'nothing — read at face value' : `${structural.length} structural changes`}
          </span>
        </div>
        {structural.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th style={{ width: 130 }}>When</th>
                <th>The seat</th>
                <th style={{ width: 180 }}>What happened</th>
                <th style={{ width: 140 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {structural.map((event) => {
                const verdict = model.lineage.get(event.positionId);
                const state = STATE[stateOf(event.relation as LineageRelation, verdict?.needsReview ?? false)];
                return (
                  <tr
                    key={event.positionId}
                    className="clickable"
                    onClick={() => onOpenPosition(event.positionId)}
                  >
                    <td className="feed-when">{formatMonthYear(event.date)}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{event.positionTitle}</div>
                      <div className="micro faint">{event.reasoning}</div>
                    </td>
                    <td>{RELATION_LABEL[event.relation as LineageRelation]}</td>
                    <td><Badge tone={state.tone}>{state.label}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="small faint" style={{ padding: '18px 22px' }}>
            None of the seats this person held were renamed, split or merged.
          </p>
        )}
      </div>
    </div>
  );
}
