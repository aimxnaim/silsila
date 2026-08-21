/**
 * How each lineage relation is named and coloured in the interface.
 *
 * Kept in one place because these six words are the product's vocabulary. If
 * they drift between views, the reader stops trusting them.
 */

import type { LineageRelation } from '../../domain/types.ts';
import { Badge } from './primitives.tsx';

export const RELATION_LABEL: Record<LineageRelation, string> = {
  rename: 'Renamed',
  redesignated: 'Redesignated',
  split: 'Split from',
  merge: 'Merged from',
  created: 'New position',
  succeeded: 'Succeeded',
};

export const RELATION_MEANING: Record<LineageRelation, string> = {
  rename: 'Same job, new wording. Headcount did not grow.',
  redesignated: 'Same job, new wording and a changed grade.',
  split: 'One position divided into several.',
  merge: 'Several positions consolidated into one.',
  created: 'Genuinely new. No predecessor in the records.',
  succeeded: 'A successor exists but the titles barely overlap. Check by hand.',
};

/**
 * Colour carries the category, consistently across every view:
 *   vermillion tint  the seat was relabelled — same work, new wording
 *   saffron          a structural event, or something needing a human
 *   ink              genuinely new
 */
export function RelationBadge({ relation }: { relation: LineageRelation }) {
  const tone =
    relation === 'rename' || relation === 'redesignated' ? 'accent'
    : relation === 'split' || relation === 'merge' || relation === 'succeeded' ? 'warn'
    : 'ink';
  return <Badge tone={tone}>{RELATION_LABEL[relation]}</Badge>;
}

export const ISSUE_LABEL = {
  conflict: 'Conflict',
  missing: 'Missing',
  inferred: 'Inferred',
  inconsistent: 'Inconsistent',
} as const;

export const ISSUE_MEANING = {
  conflict: 'Two sources describe the same period differently.',
  missing: 'A fact we need was never recorded.',
  inferred: 'A value shown was derived by us, not read from a record.',
  inconsistent: 'Two records contradict each other on their face.',
} as const;
