/**
 * The headline numbers.
 *
 * One rule: nothing here is typed by a human. Every figure on the landing page
 * and at the top of the timeline is computed from whatever data is currently
 * loaded. Drop in a different file and the headline changes.
 */

import type { Metrics, OrgModel } from './types.ts';
import { toQuarterIndex } from './dates.ts';

export function metrics(model: OrgModel): Metrics {
  const verdicts = [...model.lineage.values()];

  const count = (relation: string) => verdicts.filter((v) => v.relation === relation).length;

  /**
   * "Genuinely new" means a seat that ARRIVED during the window with no
   * predecessor — real growth. A position that already existed on day one is
   * not new; it is simply where the records begin. Counting those as growth
   * would inflate the headline by an order of magnitude, which is precisely
   * the error this product exists to correct.
   */
  const windowOpensAt = `${model.window.startYear}-04-01`;
  const genuinelyNewCount = verdicts.filter((v) => {
    if (v.relation !== 'created') return false;
    const created = model.positions.get(v.positionId)?.createdAt;
    return Boolean(created && created >= windowOpensAt);
  }).length;

  /** Positions that already existed when the records begin. */
  const preExistingCount = count('created') - genuinelyNewCount;

  // Headcount = distinct people holding a position at the end of each quarter.
  const headcountByQuarter = new Array(model.window.quarterCount).fill(0);
  for (let q = 0; q < model.window.quarterCount; q++) {
    const live = new Set<string>();
    for (const a of model.assignments.values()) {
      const from = toQuarterIndex(a.startDate);
      const to = a.endDate ? toQuarterIndex(a.endDate) : model.window.quarterCount - 1;
      if (from === null) continue;
      if (from <= q && q <= (to ?? model.window.quarterCount - 1)) live.add(a.personId);
    }
    headcountByQuarter[q] = live.size;
  }

  return {
    peopleCount: model.people.size,
    positionCount: model.positions.size,
    renameCount: count('rename') + count('redesignated'),
    genuinelyNewCount,
    preExistingCount,
    splitCount: count('split'),
    mergeCount: count('merge'),
    succeededCount: count('succeeded'),
    issueCount: model.issues.length,
    headcountByQuarter,
    headcountStart: headcountByQuarter[0] ?? 0,
    headcountEnd: headcountByQuarter[headcountByQuarter.length - 1] ?? 0,
  };
}

/**
 * The most recent quarter in which a seat actually opened or closed.
 *
 * The end of the window is the obvious default and the wrong one: these
 * records run to the end of a reporting period that has not happened yet, so
 * the last few quarters are empty and the front page would open on a ledger
 * saying "nothing". This lands the reader on the last quarter that has
 * something in it, which is the one they came to ask about anyway.
 */
export function latestActiveQuarter(model: OrgModel): number {
  let best = -1;
  for (const pos of model.positions.values()) {
    const opened = toQuarterIndex(pos.createdAt);
    const closed = pos.closedAt ? toQuarterIndex(pos.closedAt) : null;
    if (opened !== null && opened > best) best = opened;
    if (closed !== null && closed > best) best = closed;
  }
  return best < 0 ? model.window.quarterCount - 1 : best;
}

/** Who held which position at the end of a given quarter. */
export function snapshotAt(model: OrgModel, quarter: number) {
  const rows: Array<{
    positionId: string;
    title: string;
    orgUnit: string;
    division: string;
    holderName: string | null;
    reportsToTitle: string | null;
    reportsKnown: boolean;
  }> = [];

  for (const pos of model.positions.values()) {
    const created = toQuarterIndex(pos.createdAt);
    const closed = pos.closedAt ? toQuarterIndex(pos.closedAt) : null;
    if (created === null || created > quarter) continue;
    if (closed !== null && closed < quarter) continue;

    const holder = pos.assignmentIds
      .map((id) => model.assignments.get(id)!)
      .find((a) => {
        const from = toQuarterIndex(a.startDate);
        const to = a.endDate ? toQuarterIndex(a.endDate) : model.window.quarterCount - 1;
        return from !== null && from <= quarter && quarter <= (to ?? Infinity);
      });

    const mgrId = holder?.reportsToPositionId ?? null;

    rows.push({
      positionId: pos.id,
      title: pos.title,
      orgUnit: pos.orgUnit,
      division: pos.division,
      holderName: holder ? (model.people.get(holder.personId)?.name ?? null) : null,
      reportsToTitle: mgrId ? (model.positions.get(mgrId)?.title ?? mgrId) : null,
      reportsKnown: Boolean(mgrId),
    });
  }

  return rows.sort((a, b) =>
    a.division.localeCompare(b.division) || a.title.localeCompare(b.title),
  );
}

/**
 * The connection, computed.
 *
 * For one person, the structural events that happened to the positions they
 * held — the answer to "what moved around me while I was here".
 */
export function structuralChangesFor(model: OrgModel, personId: string) {
  const person = model.people.get(personId);
  if (!person) return [];

  const events: Array<{
    date: string;
    positionId: string;
    positionTitle: string;
    relation: string;
    reasoning: string;
  }> = [];

  for (const aId of person.assignmentIds) {
    const a = model.assignments.get(aId)!;
    const pos = model.positions.get(a.positionId);
    const verdict = model.lineage.get(a.positionId);
    if (!pos || !verdict || verdict.relation === 'created') continue;
    events.push({
      date: pos.createdAt ?? a.startDate,
      positionId: pos.id,
      positionTitle: pos.title,
      relation: verdict.relation,
      reasoning: verdict.reasoning,
    });
  }

  return events.sort((x, y) => x.date.localeCompare(y.date));
}

/** The chain of positions leading up to and away from one position. */
export function lineageChain(model: OrgModel, positionId: string) {
  const back: string[] = [];
  let cursor: string | null = positionId;
  const guard = new Set<string>();

  while (cursor && !guard.has(cursor)) {
    guard.add(cursor);
    const preds: string[] = model.positions.get(cursor)?.predecessorIds ?? [];
    if (preds.length === 0) break;
    back.unshift(...preds);
    cursor = preds[0];
  }

  const forward = [...model.positions.values()]
    .filter((p) => p.predecessorIds.includes(positionId))
    .map((p) => p.id);

  return { ancestors: back, self: positionId, successors: forward };
}
