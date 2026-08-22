/**
 * One position, in full: its lineage chain, the classifier's verdict, the four
 * measurements behind that verdict, and every human who ever sat in it.
 *
 * The signals are rendered rather than summarised on purpose. A confidence
 * score on its own is an assertion; a confidence score with its inputs beside
 * it is an argument, and an argument can be disagreed with. That difference is
 * the whole reason this is presentable to an audit committee.
 */

import type { OrgModel } from '../../domain/types.ts';
import { formatDate, toQuarterIndex } from '../../domain/dates.ts';
import { lineageChain } from '../../domain/metrics.ts';
import { positionGlance } from '../../domain/glance.ts';
import { Badge, Button, Card, Eyebrow, SignalBar } from '../ui/primitives.tsx';
import { Drawer } from '../ui/Drawer.tsx';
import { GlanceBlock } from '../ui/Glance.tsx';
import { RELATION_MEANING, RelationBadge } from '../ui/vocabulary.tsx';

export function RoleDetail({
  model, positionId, onClose, onOpenPosition, onOpenPerson, onShowInTime,
}: {
  model: OrgModel;
  positionId: string;
  onClose: () => void;
  onOpenPosition: (id: string) => void;
  onOpenPerson: (id: string) => void;
  onShowInTime: (quarter: number) => void;
}) {
  const pos = model.positions.get(positionId);
  if (!pos) return null;

  const verdict = model.lineage.get(positionId);
  const chain = lineageChain(model, positionId);
  const holders = pos.assignmentIds.map((id) => model.assignments.get(id)!);

  return (
    <Drawer
      title={pos.title}
      subtitle={
        <span>
          {pos.orgUnit} · {pos.division} · <span className="mono">{pos.id}</span>
          {pos.level !== null ? ` · Grade ${pos.level}` : ''}
        </span>
      }
      onClose={onClose}
    >
      {/*
        * What happened to this seat, before the classifier's reasoning about
        * how it knows. The drawer used to open on a confidence score and four
        * signal bars — an argument, which is right for an audit committee and
        * wrong for the first ten seconds.
        */}
      <GlanceBlock glance={positionGlance(model, positionId)} />

      <div className="row gap-2 wrap">
        {verdict ? <RelationBadge relation={verdict.relation} /> : null}
        <Badge>{formatDate(pos.createdAt)} → {pos.closedAt ? formatDate(pos.closedAt) : 'present'}</Badge>
        {pos.location ? <Badge>{pos.location}</Badge> : null}
      </div>

      {/* ---- The verdict, and the reasoning behind it -------------------- */}
      {verdict ? (
        <Card tight>
          <Eyebrow>The verdict</Eyebrow>
          <p style={{ marginTop: 'var(--s3)' }}>{verdict.reasoning}</p>
          <p className="small muted" style={{ marginTop: 'var(--s3)' }}>
            {RELATION_MEANING[verdict.relation]}
          </p>

          {/*
            * The measurements stay — a confidence score with its inputs beside
            * it is an argument, and an argument can be disagreed with, which is
            * the whole reason this is presentable to an audit committee. They
            * are just no longer the first thing in the drawer. Anyone who wants
            * to disagree opens this; anyone who wanted the answer already has it.
            *
            * A seat needing review opens it by default: that is the one case
            * where the machine is explicitly asking for a human, and hiding
            * the request behind a click would be the wrong default.
            */}
          {verdict.relation !== 'created' ? (
            <details className="disclose" open={verdict.needsReview}>
              <summary>
                How we worked this out
                <span className="tnum">{Math.round(verdict.confidence * 100)}% confident</span>
              </summary>

              <Eyebrow>What was measured</Eyebrow>
              <div className="stack gap-2" style={{ marginTop: 'var(--s3)' }}>
                <SignalBar label="Title similarity" value={verdict.signals.titleSimilarity} />
                <SignalBar label="Date adjacency" value={verdict.signals.dateAdjacency} />
                <SignalBar label="Reporting continuity" value={verdict.signals.reportingContinuity} />
                <SignalBar label="Structural certainty" value={verdict.signals.structuralCertainty} />
              </div>
              <p className="small muted" style={{ marginTop: 'var(--s3)' }}>
                Weighted 0.45 / 0.30 / 0.15 / 0.10
              </p>
              {verdict.needsReview ? (
                <p className="small" style={{ color: 'var(--wr-fg)', marginTop: 'var(--s3)' }}>
                  Below the threshold at which we are willing to let the machine's
                  answer stand alone. A person should look at this one.
                </p>
              ) : null}
            </details>
          ) : null}
        </Card>
      ) : null}

      {/* ---- The chain --------------------------------------------------- */}
      <div>
        <Eyebrow>Lineage</Eyebrow>
        <div className="chain" style={{ marginTop: 'var(--s3)' }}>
          {chain.ancestors.map((id) => {
            const p = model.positions.get(id);
            if (!p) return null;
            const v = model.lineage.get(positionId);
            return (
              <div key={id}>
                <button
                  className="chain-node"
                  style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => onOpenPosition(id)}
                >
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.title}</div>
                  <div className="micro faint">
                    {formatDate(p.createdAt)} → {p.closedAt ? formatDate(p.closedAt) : 'present'}
                  </div>
                </button>
                <div className="chain-link">
                  became this position{v ? ` — ${v.relation}` : ''}
                </div>
              </div>
            );
          })}

          <div className="chain-node is-current">
            <div style={{ fontWeight: 560 }}>{pos.title}</div>
            <div className="micro faint">you are here</div>
          </div>

          {chain.successors.map((id) => {
            const p = model.positions.get(id);
            const v = model.lineage.get(id);
            if (!p) return null;
            return (
              <div key={id}>
                <div className="chain-link">
                  {v ? `${v.relation} into` : 'became'}
                </div>
                <button
                  className="chain-node"
                  style={{ display: 'block', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => onOpenPosition(id)}
                >
                  <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.title}</div>
                  <div className="micro faint">
                    {formatDate(p.createdAt)} → {p.closedAt ? formatDate(p.closedAt) : 'present'}
                  </div>
                </button>
              </div>
            );
          })}

          {chain.ancestors.length === 0 && chain.successors.length === 0 ? (
            <p className="small faint" style={{ marginTop: 'var(--s2)' }}>
              No predecessor or successor is declared for this position in the records.
            </p>
          ) : null}
        </div>
      </div>

      {/* ---- Who sat in it ----------------------------------------------- */}
      <div>
        <Eyebrow>Held by</Eyebrow>
        <div className="stack gap-2" style={{ marginTop: 'var(--s3)' }}>
          {holders.map((a) => {
            const person = model.people.get(a.personId);
            const mgr = a.reportsToPositionId ? model.positions.get(a.reportsToPositionId) : null;
            return (
              <button
                key={a.id}
                className="card card-tight"
                style={{ textAlign: 'left', cursor: 'pointer' }}
                onClick={() => onOpenPerson(a.personId)}
              >
                <div className="row spread gap-3">
                  <strong>{person?.name}</strong>
                  <span className="micro faint tnum">
                    {formatDate(a.startDate)} → {a.endDate ? formatDate(a.endDate) : 'present'}
                  </span>
                </div>
                <div className="micro muted" style={{ marginTop: 4 }}>
                  Reported to {mgr ? mgr.title : <em>not recorded</em>}
                  {a.changeReason ? ` · ${a.changeReason}` : ''}
                </div>
                <div className="micro faint" style={{ marginTop: 2 }}>
                  Source: {a.source} · confidence {a.confidence}
                </div>
              </button>
            );
          })}
          {holders.length === 0 ? (
            <p className="small faint">No assignment records exist for this position.</p>
          ) : null}
        </div>
      </div>

      <div className="no-print">
        <Button onClick={() => onShowInTime(toQuarterIndex(pos.createdAt) ?? 0)}>
          Show when this seat opened
        </Button>
      </div>
    </Drawer>
  );
}
