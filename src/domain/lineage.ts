/**
 * Role lineage classification.
 *
 * THE PRODUCT IS THIS FILE.
 *
 * Every HR system on the market can tell you that a job title changed. None of
 * them will tell you whether it was still the same job. That distinction is the
 * difference between "we grew by four positions" and "we renamed four positions",
 * and organisations make budget, redundancy and pay-equity decisions on the
 * assumption they know which one happened.
 *
 * There is no model here and no training data. Four signals are measured from
 * the records, blended into a confidence score, and — critically — every signal
 * is rendered on screen next to the verdict. A reader who disagrees with the
 * machine can see exactly which input to argue with.
 */

import type { LineageRelation, LineageSignals, LineageVerdict, OrgModel, Position } from './types.ts';
import { daysBetween } from './dates.ts';

/** Words that carry no information about what the job actually is. */
const STOPWORDS = new Set([
  'of', 'and', 'the', 'for', 'to', 'a', 'an', 'in', 'at', 'on',
  'group', 'senior', 'junior', 'assistant', 'associate', 'ii', 'iii', 'i', 'iv',
]);

export function titleTokens(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1 && !STOPWORDS.has(t)),
  );
}

/**
 * Overlap coefficient, NOT Jaccard.
 *
 * This is a real engineering decision and it is worth being able to defend.
 * Job titles are two or three meaningful words long. Jaccard divides by the
 * size of the UNION, so changing one word out of three drops the score to 0.33.
 *
 *   "Branch Operations Executive" -> "Branch Operations Specialist"
 *   Jaccard:  1 shared / 3 union   = 0.33  -> classified as a NEW ROLE. Wrong.
 *   Overlap:  1 shared / 2 smaller = 0.50  -> classified as a RENAME. Correct.
 *
 * Overlap divides by the size of the SMALLER set, which is the right behaviour
 * when comparing short phrases where one is often a subset of the other.
 */
export function titleSimilarity(a: string, b: string): number {
  const ta = titleTokens(a);
  const tb = titleTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) if (tb.has(t)) shared++;
  return shared / Math.min(ta.size, tb.size);
}

/**
 * How cleanly the handover dates meet.
 * A successor opening the day its predecessor closed scores 1. The score
 * decays linearly to 0 over 180 days, after which the two events are too far
 * apart to be treated as one continuous transition.
 */
export function dateAdjacency(predecessorClosed: string | null, successorOpened: string | null): number {
  const gap = daysBetween(predecessorClosed, successorOpened);
  if (gap === null) return 0.3; // We do not know. Do not reward, do not punish hard.
  return Math.max(0, 1 - gap / 180);
}

/** The manager a position most often reported into, across all its assignments. */
export function dominantManager(model: OrgModel, positionId: string): string | null {
  const pos = model.positions.get(positionId);
  if (!pos) return null;
  const counts = new Map<string, number>();
  for (const id of pos.assignmentIds) {
    const mgr = model.assignments.get(id)?.reportsToPositionId;
    if (mgr) counts.set(mgr, (counts.get(mgr) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [mgr, n] of counts) if (n > bestCount) { best = mgr; bestCount = n; }
  return best;
}

/** The weights. Title similarity dominates because it is the strongest evidence. */
const WEIGHTS = {
  titleSimilarity: 0.45,
  dateAdjacency: 0.30,
  reportingContinuity: 0.15,
  structuralCertainty: 0.10,
} as const;

function blend(s: LineageSignals): number {
  return (
    s.titleSimilarity * WEIGHTS.titleSimilarity +
    s.dateAdjacency * WEIGHTS.dateAdjacency +
    s.reportingContinuity * WEIGHTS.reportingContinuity +
    s.structuralCertainty * WEIGHTS.structuralCertainty
  );
}

function describe(
  relation: LineageRelation,
  signals: LineageSignals,
  predecessors: Position[],
): string {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const names = predecessors.map((p) => p.title).join(' and ');

  switch (relation) {
    case 'rename':
      return (
        `Titles overlap at ${pct(signals.titleSimilarity)} and the grade did not change, ` +
        `so this is the same job under new wording. Headcount did not grow here.`
      );
    case 'redesignated':
      return (
        `Titles overlap at ${pct(signals.titleSimilarity)}, but the grade changed. ` +
        `The work is substantially the same; the seniority attached to it is not.`
      );
    case 'split':
      return (
        `${names} divided into this position and at least one other. ` +
        `The parent position closed; the work continued in more than one seat.`
      );
    case 'merge':
      return (
        `${predecessors.length} positions (${names}) consolidated into this one. ` +
        `Headcount fell by ${predecessors.length - 1} even though the work remained.`
      );
    case 'created':
      return (
        `No predecessor is declared in the records. On the evidence available ` +
        `this is a genuinely new seat, not a relabelled one.`
      );
    case 'succeeded':
      return (
        `A predecessor exists (${names}) but the titles overlap at only ` +
        `${pct(signals.titleSimilarity)}. Too different to call a rename, too ` +
        `connected to call new. Worth a human check.`
      );
  }
}

export function classifyLineage(model: OrgModel): Map<string, LineageVerdict> {
  const verdicts = new Map<string, LineageVerdict>();

  // Count how many successors each position has, so we can spot splits.
  const successorCount = new Map<string, number>();
  for (const pos of model.positions.values()) {
    for (const predId of pos.predecessorIds) {
      successorCount.set(predId, (successorCount.get(predId) ?? 0) + 1);
    }
  }

  for (const pos of model.positions.values()) {
    const predecessors = pos.predecessorIds
      .map((id) => model.positions.get(id))
      .filter((p): p is Position => Boolean(p));

    // --- No predecessor: genuinely new -----------------------------------
    if (predecessors.length === 0) {
      const signals: LineageSignals = {
        titleSimilarity: 0,
        dateAdjacency: 0,
        reportingContinuity: 0,
        structuralCertainty: 1,
      };
      verdicts.set(pos.id, {
        positionId: pos.id,
        relation: 'created',
        predecessorIds: [],
        confidence: 0.9,
        signals,
        reasoning: describe('created', signals, []),
        needsReview: false,
      });
      continue;
    }

    // --- Several predecessors: a merge -----------------------------------
    if (predecessors.length > 1) {
      const best = Math.max(...predecessors.map((p) => titleSimilarity(p.title, pos.title)));
      const adjacency = Math.max(
        ...predecessors.map((p) => dateAdjacency(p.closedAt, pos.createdAt)),
      );
      const signals: LineageSignals = {
        titleSimilarity: best,
        dateAdjacency: adjacency,
        reportingContinuity: 1,
        structuralCertainty: 1,
      };
      verdicts.set(pos.id, {
        positionId: pos.id,
        relation: 'merge',
        predecessorIds: predecessors.map((p) => p.id),
        confidence: Math.max(0.7, blend(signals)),
        signals,
        reasoning: describe('merge', signals, predecessors),
        needsReview: false,
      });
      continue;
    }

    // --- Exactly one predecessor -----------------------------------------
    const pred = predecessors[0];
    const similarity = titleSimilarity(pred.title, pos.title);
    const adjacency = dateAdjacency(pred.closedAt, pos.createdAt);
    const sameManager = dominantManager(model, pred.id) === dominantManager(model, pos.id);
    const levelChanged =
      pred.level !== null && pos.level !== null && pred.level !== pos.level;

    const signals: LineageSignals = {
      titleSimilarity: similarity,
      dateAdjacency: adjacency,
      reportingContinuity: sameManager ? 1 : 0,
      structuralCertainty: pred.closedAt && pos.createdAt ? 1 : 0.5,
    };

    // The parent spawned more than one child: the work was divided.
    const isSplit = (successorCount.get(pred.id) ?? 0) > 1;

    let relation: LineageRelation;
    if (isSplit) relation = 'split';
    else if (similarity >= 0.5 && levelChanged) relation = 'redesignated';
    else if (similarity >= 0.5) relation = 'rename';
    else relation = 'succeeded';

    const confidence = blend(signals);

    verdicts.set(pos.id, {
      positionId: pos.id,
      relation,
      predecessorIds: [pred.id],
      confidence,
      signals,
      reasoning: describe(relation, signals, [pred]),
      // Below 0.5 we are not confident enough to let the number stand alone.
      needsReview: relation === 'succeeded' || confidence < 0.5,
    });
  }

  return verdicts;
}
