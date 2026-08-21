/**
 * Plain English.
 *
 * The classifier produces verdicts like `succeeded` with a confidence of 0.55.
 * That is precise and it is useless to a first-time reader, who does not know
 * the vocabulary and should not have to learn it before the chart means
 * anything.
 *
 * This module is the translation layer: it turns each verdict into a sentence
 * that names the actual positions, the actual dates, and what the change meant
 * for headcount. It is kept in the domain rather than in a component because
 * the wording is part of the product's argument, not part of its styling — and
 * because `npm run verify` can then print the same sentences the interface
 * shows.
 */

import type { OrgModel, Position } from './types.ts';
import { formatMonthYear } from './dates.ts';

/** A short label for a pill. Four words at most. */
export const PLAIN_LABEL = {
  rename: 'Renamed',
  redesignated: 'Renamed + regraded',
  split: 'Split',
  merge: 'Merged',
  created: 'Brand new',
  succeeded: 'Needs a check',
} as const;

/** What the reader should take away, in one line. */
export const PLAIN_MEANING = {
  rename: 'Same job, new title. Nobody was hired.',
  redesignated: 'Same job, new title and a new grade. Nobody was hired.',
  split: 'One job became two. Real growth, from an existing seat.',
  merge: 'Several jobs became one. Headcount fell.',
  created: 'A brand new job that did not exist before. Real growth.',
  succeeded: 'Replaced an older job, but the work looks different. A person should check.',
} as const;

/**
 * The story of one position, as a sentence a non-specialist can act on.
 * Names names and dates, because "renamed" without saying *from what* still
 * leaves the reader doing the work.
 */
export function narratePosition(model: OrgModel, pos: Position): string {
  const verdict = model.lineage.get(pos.id);
  if (!verdict) return '';

  const preds = verdict.predecessorIds
    .map((id) => model.positions.get(id))
    .filter((p): p is Position => Boolean(p));

  const started = formatMonthYear(pos.createdAt);
  const ended = pos.closedAt ? formatMonthYear(pos.closedAt) : null;
  const lifespan = ended ? `Existed ${started} to ${ended}.` : `Opened ${started} and still open.`;

  switch (verdict.relation) {
    case 'rename':
      return `This is the same job as “${preds[0]?.title}”, given a new title in ${started}. ` +
             `Nobody was hired — the headcount did not change. ${lifespan}`;

    case 'redesignated':
      return `Same work as “${preds[0]?.title}”, retitled in ${started} and moved to a ` +
             `different grade. Nobody was hired. ${lifespan}`;

    case 'split':
      return `“${preds[0]?.title}” was divided in ${started}, and this is one of the ` +
             `jobs that came out of it. The work continued in more than one seat. ${lifespan}`;

    case 'merge':
      return `${preds.map((p) => `“${p.title}”`).join(' and ')} were combined into this ` +
             `single job in ${started}. Headcount fell by ${preds.length - 1}, ` +
             `even though the work stayed. ${lifespan}`;

    case 'created':
      return `A brand new job. Nothing in the records comes before it, so this is ` +
             `genuine growth rather than a relabelling. ${lifespan}`;

    case 'succeeded':
      return `This job took over from “${preds[0]?.title}”, but the two titles have ` +
             `almost nothing in common — so we will not claim it is the same job. ` +
             `A person should look at this one. ${lifespan}`;
  }
}

/**
 * The single most illustrative person in the data: whoever had the most
 * structural change happen underneath them. Used to open the Timeline with a
 * concrete human story rather than an abstract chart.
 */
export function featuredPerson(model: OrgModel) {
  let best: { personId: string; name: string; titles: number; renames: number } | null = null;

  for (const person of model.people.values()) {
    const titles = new Set(
      person.assignmentIds
        .map((id) => model.positions.get(model.assignments.get(id)!.positionId)?.title)
        .filter(Boolean),
    );

    const renames = person.assignmentIds.filter((id) => {
      const relation = model.lineage.get(model.assignments.get(id)!.positionId)?.relation;
      return relation === 'rename' || relation === 'redesignated';
    }).length;

    if (renames === 0 || titles.size < 2) continue;
    if (!best || renames > best.renames || (renames === best.renames && titles.size > best.titles)) {
      best = { personId: person.id, name: person.name, titles: titles.size, renames };
    }
  }

  return best;
}
