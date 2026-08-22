/**
 * One person, as a profile page.
 *
 * Laid out the way an HR system lays out an employee record — portrait, name,
 * current title, then a grid of fields — because that is the format the reader
 * already knows, and the argument this panel makes only lands if the reader
 * recognises what they are looking at.
 *
 * The section that justifies the whole product is "What moved around them".
 * A conventional HR record shows this person under three different job titles
 * and invites the reader to conclude they are restless. This panel puts the
 * structural events beside the trajectory, so it is visible that the titles
 * changed because the organisation was reorganised — not because the person
 * went anywhere.
 */

import type { OrgModel } from '../../domain/types.ts';
import { formatDate, formatMonthYear, toQuarterIndex } from '../../domain/dates.ts';
import { structuralChangesFor } from '../../domain/metrics.ts';
import { Badge, Button, Card, Eyebrow } from '../ui/primitives.tsx';
import { Avatar } from '../ui/Avatar.tsx';
import { Drawer } from '../ui/Drawer.tsx';
import { RELATION_LABEL } from '../ui/vocabulary.tsx';
import type { LineageRelation } from '../../domain/types.ts';

function tenure(from: string | null | undefined, to: string | null): string {
  if (!from) return 'unknown';
  const start = new Date(from);
  const end = to ? new Date(to) : new Date('2026-06-30');
  if (Number.isNaN(start.getTime())) return 'unknown';
  const months = Math.max(
    0,
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()),
  );
  const years = Math.floor(months / 12);
  const rest = months % 12;
  if (years === 0) return `${rest} month${rest === 1 ? '' : 's'}`;
  if (rest === 0) return `${years} year${years === 1 ? '' : 's'}`;
  return `${years}y ${rest}m`;
}

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
  model, personId, onClose, onOpenPosition, onShowOnTimeline,
}: {
  model: OrgModel;
  personId: string;
  onClose: () => void;
  onOpenPosition: (id: string) => void;
  onShowOnTimeline: (quarter: number) => void;
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
  const stillHere = latest && !latest.endDate;

  // Worth saying out loud, but only when the records actually support it.
  const sameJobManyTitles =
    distinctTitles.size > 1 &&
    structural.some((s) => s.relation === 'rename' || s.relation === 'redesignated');

  return (
    <Drawer
      title="Employee record"
      subtitle={<span className="mono">{person.id}</span>}
      onClose={onClose}
    >
      {/* ---- Profile header ---------------------------------------------
       *
       * Portrait left behind a rule, identity and actions top-right, fields
       * beneath — the layout of the HR portal this sits beside. The red disc
       * on the portrait is where that system puts its edit affordance; here it
       * is inert and the caption underneath says why, because Silsilah reads
       * records and never writes them.
       */}
      <Card>
        <div className="profile-head">
          <div className="profile-photo">
            <span className="profile-photo-wrap">
              <Avatar name={person.name} large />
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
                  onClick={() => onShowOnTimeline(toQuarterIndex(first?.startDate) ?? 0)}
                >
                  Show on timeline
                </Button>
              </div>
            </div>

            <div className="row gap-2 wrap" style={{ marginTop: 'var(--s3)' }}>
              {stillHere
                ? <Badge tone="ok">Currently employed</Badge>
                : <Badge>Left {formatMonthYear(latest?.endDate ?? null)}</Badge>}
              {structural.length > 0 ? (
                <Badge tone="accent">
                  {structural.length} structural change{structural.length === 1 ? '' : 's'}
                </Badge>
              ) : null}
            </div>

            <div className="field-grid">
              <Field label="Employee code" value={<span className="mono">{person.id}</span>} />
              <Field label="Department" value={currentPosition?.division} />
              <Field label="Team" value={currentPosition?.orgUnit} />
              <Field label="Grade" value={currentPosition?.level !== null && currentPosition?.level !== undefined ? currentPosition.level : null} />
              <Field label="Employment status" value={latest?.employmentType} />
              <Field label="Location" value={currentPosition?.location} />
              <Field label="Time on record" value={tenure(first?.startDate, latest?.endDate ?? null)} />
              <Field label="Joined" value={formatMonthYear(first?.startDate)} />
              <Field label="Reports to" value={manager?.title} />
              <Field label="Jobs held" value={assignments.length} />
              <Field label="Distinct job titles" value={distinctTitles.size} />
              <Field label="Record source" value={<span className="small">{latest?.source}</span>} />
            </div>
          </div>
        </div>
      </Card>

      {/* ---- The argument ------------------------------------------------ */}
      {sameJobManyTitles ? (
        <Card tight>
          <Eyebrow>What the raw record would suggest</Eyebrow>
          <p style={{ marginTop: 'var(--s3)' }}>
            An HR export shows {person.name.split(' ')[0]} under{' '}
            <strong>{distinctTitles.size} different job titles</strong>. On paper that
            reads as someone who has moved around.
          </p>
          <p style={{ marginTop: 'var(--s3)' }} className="accent">
            The lineage says otherwise: at least one of those changes was the same seat
            being relabelled. The organisation moved; the person did not.
          </p>
        </Card>
      ) : null}

      {/* ---- Career history ---------------------------------------------- */}
      <div>
        <Eyebrow>Career history</Eyebrow>
        <div className="stack gap-2" style={{ marginTop: 'var(--s3)' }}>
          {assignments.map((a) => {
            const pos = model.positions.get(a.positionId);
            const mgr = a.reportsToPositionId ? model.positions.get(a.reportsToPositionId) : null;
            return (
              <button
                key={a.id}
                className="card card-tight"
                style={{ textAlign: 'left', cursor: 'pointer' }}
                onClick={() => onOpenPosition(a.positionId)}
              >
                <div className="row spread gap-3 wrap">
                  <strong>{pos?.title}</strong>
                  <span className="micro faint tnum">
                    {formatDate(a.startDate)} → {a.endDate ? formatDate(a.endDate) : 'present'}
                  </span>
                </div>
                <div className="micro muted" style={{ marginTop: 4 }}>
                  {pos?.orgUnit}
                  {pos?.level !== null && pos?.level !== undefined ? ` · grade ${pos.level}` : ''}
                  {' · reported to '}
                  {mgr ? mgr.title : <em>not recorded</em>}
                  {' · '}
                  {tenure(a.startDate, a.endDate)}
                </div>
                {a.changeReason ? (
                  <div className="micro" style={{ marginTop: 2 }}>{a.changeReason}</div>
                ) : null}
                <div className="micro faint" style={{ marginTop: 2 }}>
                  Source: {a.source} · confidence {a.confidence}
                  {a.startDateInferred ? ' · start date derived, not recorded' : ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ---- The connection ---------------------------------------------- */}
      <div>
        <Eyebrow>What moved around them</Eyebrow>
        <p className="small muted" style={{ marginTop: 'var(--s2)' }}>
          Structural changes to the seats this person occupied. This is where their
          history and the organisation&rsquo;s history turn out to be the same history.
        </p>
        <div className="stack gap-2" style={{ marginTop: 'var(--s3)' }}>
          {structural.map((event) => (
            <button
              key={event.positionId}
              className="card card-tight"
              style={{ textAlign: 'left', cursor: 'pointer' }}
              onClick={() => onOpenPosition(event.positionId)}
            >
              <div className="row gap-3 wrap" style={{ alignItems: 'baseline' }}>
                <Badge tone="ink">{RELATION_LABEL[event.relation as LineageRelation]}</Badge>
                <strong className="small">{event.positionTitle}</strong>
                <span className="micro faint tnum">{formatDate(event.date)}</span>
              </div>
              <p className="small muted" style={{ marginTop: 'var(--s2)' }}>{event.reasoning}</p>
            </button>
          ))}
          {structural.length === 0 ? (
            <p className="small faint">
              None of the seats this person held were renamed, split or merged. Their
              record can be read at face value.
            </p>
          ) : null}
        </div>
      </div>
    </Drawer>
  );
}
