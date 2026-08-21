/**
 * One person, in full.
 *
 * The section that justifies the whole product is "What moved around them".
 * A conventional HR record shows this person holding three different job
 * titles and invites the reader to conclude they are restless. This panel puts
 * the structural events next to the trajectory, so the reader can see that the
 * titles changed because the organisation was reorganised — not because the
 * person went anywhere.
 */

import type { OrgModel } from '../../domain/types.ts';
import { formatDate, toQuarterIndex } from '../../domain/dates.ts';
import { structuralChangesFor } from '../../domain/metrics.ts';
import { Badge, Button, Card, Eyebrow } from '../ui/primitives.tsx';
import { Drawer } from '../ui/Drawer.tsx';
import { RELATION_LABEL } from '../ui/vocabulary.tsx';
import type { LineageRelation } from '../../domain/types.ts';

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
  const structural = structuralChangesFor(model, personId);
  const distinctTitles = new Set(
    assignments.map((a) => model.positions.get(a.positionId)?.title).filter(Boolean),
  );

  // The claim worth making out loud, when the records support it.
  const sameJobManyTitles =
    distinctTitles.size > 1 &&
    structural.filter((s) => s.relation === 'rename' || s.relation === 'redesignated').length > 0;

  return (
    <Drawer
      title={person.name}
      subtitle={<span className="mono">{person.id}</span>}
      onClose={onClose}
    >
      <div className="row gap-2 wrap">
        <Badge>{assignments.length} {assignments.length === 1 ? 'seat' : 'seats'} held</Badge>
        <Badge>{distinctTitles.size} distinct {distinctTitles.size === 1 ? 'title' : 'titles'}</Badge>
        {structural.length > 0 ? (
          <Badge tone="accent">{structural.length} structural {structural.length === 1 ? 'change' : 'changes'}</Badge>
        ) : null}
      </div>

      {sameJobManyTitles ? (
        <Card tight>
          <Eyebrow>What the raw record would suggest</Eyebrow>
          <p style={{ marginTop: 'var(--s3)' }}>
            An HR export shows {person.name.split(' ')[0]} under{' '}
            <strong>{distinctTitles.size} different job titles</strong>. On paper that
            reads as someone who has moved around.
          </p>
          <p style={{ marginTop: 'var(--s3)' }} className="accent">
            The lineage says otherwise: at least one of those changes was the same
            seat being relabelled. The organisation moved; the person did not.
          </p>
        </Card>
      ) : null}

      {/* ---- Trajectory --------------------------------------------------- */}
      <div>
        <Eyebrow>Trajectory</Eyebrow>
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
                  {pos?.level !== null && pos?.level !== undefined ? ` · Grade ${pos.level}` : ''}
                  {' · Reported to '}
                  {mgr ? mgr.title : <em>not recorded</em>}
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
          Structural changes to the seats this person occupied. This is where the
          person's history and the organisation's history are the same history.
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

      <div className="no-print">
        <Button onClick={() => onShowOnTimeline(toQuarterIndex(assignments[0]?.startDate) ?? 0)}>
          Show this on the timeline
        </Button>
      </div>
    </Drawer>
  );
}
