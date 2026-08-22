/**
 * One lineage chain, told left to right.
 *
 * This is the primary explanation of what happened to a job, and it exists
 * because a Gantt chart is a poor first encounter: it demands that the reader
 * already know what they are looking for. A row of cards with a labelled arrow
 * between them does not.
 *
 *     [Branch Operations Executive] ──renamed──▶ [Branch Operations Specialist]
 *      Jan 2021 – Jun 2022                       Jul 2022 – Dec 2023
 *      Nurul Huda binti Rashid                   Nurul Huda binti Rashid
 *
 * Everything a first-time reader needs is on the card or on the arrow: what
 * the job was called, when it existed, who was in it, and what the change
 * between the two meant.
 */

import type { Chain } from '../../domain/chains.ts';
import { lastHolder } from '../../domain/chains.ts';
import type { OrgModel, Position } from '../../domain/types.ts';
import { formatMonthYear } from '../../domain/dates.ts';
import { headcountEffect } from '../../domain/glance.ts';
import { PLAIN_LABEL, PLAIN_MEANING } from '../../domain/narrate.ts';

function cardTone(model: OrgModel, pos: Position, isFirstColumn: boolean): string {
  if (isFirstColumn) return 'strip-card--first';
  const relation = model.lineage.get(pos.id)?.relation;
  if (relation === 'rename' || relation === 'redesignated') return 'strip-card--renamed';
  if (relation === 'split' || relation === 'merge') return 'strip-card--branch';
  return 'strip-card--new';
}

/** The headline for the whole chain, in one sentence. */
function chainSummary(model: OrgModel, chain: Chain): { title: string; detail: string } {
  const first = chain.columns[0]?.positions[0];
  const last = chain.columns[chain.columns.length - 1]?.positions;
  const relations = chain.members
    .map((p) => model.lineage.get(p.id)?.relation)
    .filter((r): r is NonNullable<typeof r> => Boolean(r) && r !== 'created');

  const renames = relations.filter((r) => r === 'rename' || r === 'redesignated').length;
  const splits = relations.filter((r) => r === 'split').length;
  const merges = relations.filter((r) => r === 'merge').length;

  const parts: string[] = [];
  if (renames) parts.push(`${renames} rename${renames > 1 ? 's' : ''}`);
  if (splits) parts.push('a split');
  if (merges) parts.push('a merge');

  // One source of truth for this sentence — see headcountEffect in glance.ts.
  const headcount = headcountEffect(model, chain.members.map((p) => p.id)) ?? '';

  return {
    title: `${first?.title ?? 'This job'} → ${last?.map((p) => p.title).join(' + ') ?? ''}`,
    detail: `${parts.length ? parts.join(' and ') : 'One change'}, over ${chain.members.length} versions of the same job. ${headcount}`,
  };
}

export function StoryStrip({
  model, chain, onOpenPosition,
}: {
  model: OrgModel;
  chain: Chain;
  onOpenPosition: (id: string) => void;
}) {
  const summary = chainSummary(model, chain);

  return (
    <article className="strip">
      <header className="strip-head">
        <h3>{summary.title}</h3>
        <p>{summary.detail}</p>
      </header>

      <div className="strip-flow">
        {chain.columns.map((column, columnIndex) => {
          // The arrow before this column carries the label of the change.
          const arrivingRelation = column.positions
            .map((p) => model.lineage.get(p.id)?.relation)
            .find((r) => r && r !== 'created');

          return (
            <div key={column.depth} style={{ display: 'contents' }}>
              {columnIndex > 0 ? (
                <div className="strip-arrow" aria-hidden="true">
                  <span className="strip-arrow-label">
                    {arrivingRelation ? PLAIN_LABEL[arrivingRelation].toLowerCase() : 'became'}
                  </span>
                  <span className="strip-arrow-line" />
                  <span className="strip-arrow-note">
                    {arrivingRelation === 'rename' || arrivingRelation === 'redesignated'
                      ? 'same job'
                      : arrivingRelation === 'split' ? 'one job → two'
                      : arrivingRelation === 'merge' ? 'two jobs → one'
                      : 'check by hand'}
                  </span>
                </div>
              ) : null}

              <div className="strip-col">
                {column.positions.map((pos) => {
                  const holder = lastHolder(model, pos);
                  return (
                    <button
                      key={pos.id}
                      className={`strip-card ${cardTone(model, pos, columnIndex === 0)}`}
                      onClick={() => onOpenPosition(pos.id)}
                      title="Open the full history and how we classified it"
                    >
                      <span className="strip-title">{pos.title}</span>
                      <span className="strip-dates">
                        {formatMonthYear(pos.createdAt)} — {pos.closedAt ? formatMonthYear(pos.closedAt) : 'now'}
                      </span>
                      <span className="strip-who">
                        {holder?.person ? holder.person.name : 'nobody recorded'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <footer className="strip-foot">
        {(() => {
          const finals = chain.columns[chain.columns.length - 1]?.positions ?? [];
          const relation = finals.map((p) => model.lineage.get(p.id)?.relation).find(Boolean);
          return relation ? <><strong>What this means:</strong> {PLAIN_MEANING[relation]}</> : null;
        })()}
      </footer>
    </article>
  );
}
