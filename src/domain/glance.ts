/**
 * The glance — what each history surface says before it says anything else.
 *
 * Every screen in this product used to open with its evidence: a chart, a
 * confidence score, four signal bars, a legend defining three words. All of it
 * true, none of it an answer. A reader arriving cold had to learn a vocabulary
 * before the picture meant anything, and the thing they came to find out —
 * did this place actually grow, or did we just rename things — was never
 * stated anywhere on screen. It was in the README.
 *
 * So each surface now opens with three parts, in this order:
 *
 *   hero        the one figure to leave with.
 *   segments    what that figure is made of, as parts of a stated whole.
 *   footnote    the part that has no width, because it moved nothing.
 *
 * The wording lives here rather than in a component for the reason narrate.ts
 * gives: it is part of the product's argument, not part of its styling, and
 * `npm run verify` can then assert the same sentences the interface shows.
 *
 * THE HONESTY RULE. A composition bar asserts part-to-whole. So `segments`
 * must sum to a real total that the surface can name, and the hero must not
 * be that total unless it genuinely is — headcount is measured in people and
 * seats are measured in seats, and adding them was the exact mistake the old
 * chart made by stacking two scales in one frame. Where the hero and the bar
 * count different things, `hero.detail` and `whole` say so in words.
 */

import type { LineageRelation, Metrics, OrgModel } from './types.ts';
import { lineageChain, structuralChangesFor } from './metrics.ts';
import { formatMonthYear, tenure } from './dates.ts';

/**
 * Which step of the ink ramp a category owns.
 *
 * Bound to the CATEGORY, never to its size. If it were assigned by value the
 * bar would repaint whenever the data changed, and a reader who learned that
 * dark means "genuinely new" would be misled by the next dataset — the same
 * failure as colouring bars darker-where-bigger.
 */
export type GlanceStep = 0 | 1 | 2 | 3;

export interface GlanceSegment {
  /** Rendered directly beneath its own segment. There is no legend. */
  label: string;
  value: number;
  step: GlanceStep;
}

export interface Glance {
  hero: {
    /** The figure itself, already formatted — sign included where it carries meaning. */
    value: string;
    /** What the figure counts. */
    label: string;
    /** How it was arrived at, or the span it covers. */
    detail: string | null;
  };
  /**
   * Parts of `whole`, most consequential first. Empty, or a single entry, means
   * there is nothing to break down and no bar should be drawn — a one-segment
   * composition bar is a one-bar bar chart.
   */
  segments: GlanceSegment[];
  /** What the segments are parts OF, named in words. Null when there are none. */
  whole: string | null;
  /** The category with no width. Stated, never drawn. */
  footnote: string | null;
}

/** Total across the segments — the number `whole` describes. */
export function glanceTotal(glance: Glance): number {
  return glance.segments.reduce((sum, s) => sum + s.value, 0);
}

/** Drop empty buckets, so a bar never carries a zero-width segment nobody can see. */
function present(segments: GlanceSegment[]): GlanceSegment[] {
  return segments.filter((s) => s.value > 0);
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/* ------------------------------------------------------------------ The org */

/**
 * The four buckets an arriving seat falls into.
 *
 * `succeeded` keeps its own bucket rather than being folded into "relabelled".
 * The classifier is explicitly declining to claim those are the same job, and
 * a glance that quietly counted them as relabelling would be asserting exactly
 * the thing the classifier refused to.
 */
function bucketOf(relation: LineageRelation): GlanceStep {
  switch (relation) {
    case 'created': return 0;
    case 'split':
    case 'merge': return 1;
    case 'rename':
    case 'redesignated': return 2;
    case 'succeeded': return 3;
  }
}

const ARRIVAL_LABEL: Record<GlanceStep, string> = {
  0: 'genuinely new',
  1: 'from a split or merge',
  2: 'relabelled',
  3: 'needs a check',
};

/**
 * How the organisation changed, in one figure and one bar.
 *
 * The hero is headcount, because that is the question people arrive with. The
 * bar is seats, because that is what the lineage classifier actually resolves —
 * and the two are deliberately not summed against each other. The bar's whole
 * is the ARRIVAL COHORT: seats that appeared during the window. Seats that
 * were already in place when the records begin are excluded and named in the
 * footnote, for the same reason ChangeSection draws that quarter hatched —
 * counting them as growth would inflate the answer by an order of magnitude,
 * which is the error this product exists to correct.
 */
export function orgGlance(model: OrgModel, m: Metrics): Glance {
  const windowOpensAt = `${model.window.startYear}-04-01`;

  const arrivals = [...model.positions.values()].filter(
    (p) => p.createdAt !== null && p.createdAt >= windowOpensAt,
  );

  const counts: Record<GlanceStep, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const pos of arrivals) {
    const relation = model.lineage.get(pos.id)?.relation ?? 'created';
    counts[bucketOf(relation)]++;
  }

  const delta = m.headcountEnd - m.headcountStart;
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±';
  const lastYear = model.window.startYear + Math.floor((model.window.quarterCount - 1) / 4);

  const preExisting = model.positions.size - arrivals.length;

  return {
    hero: {
      value: `${sign}${Math.abs(delta)}`,
      label: delta === 1 || delta === -1 ? 'person' : 'people',
      detail: `${m.headcountStart} → ${m.headcountEnd} across ${model.window.startYear}–${lastYear}`,
    },
    segments: present(([0, 1, 2, 3] as GlanceStep[]).map((step) => ({
      label: ARRIVAL_LABEL[step],
      value: counts[step],
      step,
    }))),
    whole: `${plural(arrivals.length, 'seat')} opened during this period`,
    footnote: preExisting > 0
      ? `${plural(preExisting, 'seat')} already in place when the records begin — not growth.`
      : null,
  };
}

/* ------------------------------------------------------------------ One job */

const CHAIN_LABEL: Record<GlanceStep, string> = {
  0: 'started here',
  1: 'split or merged',
  2: 'renamed',
  3: 'needs a check',
};

/**
 * What happened to one seat.
 *
 * The hero counts versions of the same job, because that is the number that
 * makes a reader sit up: four titles, one job, nobody hired. The footnote
 * carries the headcount effect, which is the part an audit committee is
 * actually asking about.
 *
 * This logic used to live inside StoryStrip as a private `chainSummary`, where
 * only that one component could reach it and the verify harness could not
 * check it at all.
 */
export function positionGlance(model: OrgModel, positionId: string): Glance {
  const pos = model.positions.get(positionId);
  if (!pos) {
    return { hero: { value: '—', label: 'not found', detail: null }, segments: [], whole: null, footnote: null };
  }

  const chain = lineageChain(model, positionId);
  const memberIds = [...chain.ancestors, chain.self, ...chain.successors];
  const versions = memberIds.length;

  const counts: Record<GlanceStep, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const id of memberIds) {
    const relation = model.lineage.get(id)?.relation ?? 'created';
    counts[bucketOf(relation)]++;
  }

  const splits = memberIds.filter((id) => model.lineage.get(id)?.relation === 'split').length;
  const merges = memberIds.filter((id) => model.lineage.get(id)?.relation === 'merge').length;

  const lifespan = pos.closedAt
    ? `${formatMonthYear(pos.createdAt)} — ${formatMonthYear(pos.closedAt)}`
    : `${formatMonthYear(pos.createdAt)} — still open`;

  // The headcount effect of the whole chain, which is the audit question.
  const footnote =
    splits > 0 ? `The team grew by ${plural(splits, 'seat')} out of this chain.`
    : merges > 0 ? `Headcount fell by ${plural(merges, 'seat')}, even though the work stayed.`
    : versions > 1 ? 'Nobody was hired anywhere along this chain.'
    : null;

  return {
    hero: {
      value: String(versions),
      label: versions === 1 ? 'version of this job' : 'versions of the same job',
      detail: lifespan,
    },
    segments: present(([0, 1, 2, 3] as GlanceStep[]).map((step) => ({
      label: CHAIN_LABEL[step],
      value: counts[step],
      step,
    }))),
    whole: versions > 1 ? `${plural(versions, 'seat')} in this lineage` : null,
    footnote,
  };
}

/* --------------------------------------------------------------- One person */

/**
 * One career, and who was doing the moving.
 *
 * PersonDetail has always claimed that a person's titles changed because the
 * organisation was reorganised around them, not because they kept moving. That
 * claim was in a source comment and nowhere on screen. This is it, counted:
 * changes the organisation made to the seat someone was sitting in, against
 * changes they made by moving to a different seat.
 *
 * The two are nominal, not ranked — neither outranks the other — so their ink
 * steps are fixed per category and never reassigned by which happens to be
 * larger.
 */
export function personGlance(model: OrgModel, personId: string): Glance {
  const person = model.people.get(personId);
  if (!person) {
    return { hero: { value: '—', label: 'not found', detail: null }, segments: [], whole: null, footnote: null };
  }

  const assignments = person.assignmentIds.map((id) => model.assignments.get(id)!).filter(Boolean);
  const first = assignments[0];
  const latest = assignments[assignments.length - 1];

  const titles = new Set(
    assignments.map((a) => model.positions.get(a.positionId)?.title).filter(Boolean),
  );

  /** The seat changed underneath them — a rename, a split, a merge. */
  const orgMoved = structuralChangesFor(model, personId).length;
  /** They changed seat. */
  const theyMoved = Math.max(assignments.length - 1, 0);

  const span = first
    ? tenure(first.startDate, latest?.endDate ?? null)
    : null;

  return {
    hero: {
      value: String(titles.size),
      label: titles.size === 1 ? 'title' : 'titles',
      detail: span ? `over ${span}` : null,
    },
    segments: present([
      { label: 'the organisation changed the seat', value: orgMoved, step: 0 },
      { label: 'they moved seat', value: theyMoved, step: 2 },
    ]),
    whole: orgMoved + theyMoved > 0
      ? `${plural(orgMoved + theyMoved, 'change')} behind those titles`
      : null,
    footnote:
      orgMoved > 0 && theyMoved === 0
        ? 'Their title changed without them ever moving.'
        : orgMoved === 0 && theyMoved === 0
          ? 'One seat throughout.'
          : null,
  };
}
