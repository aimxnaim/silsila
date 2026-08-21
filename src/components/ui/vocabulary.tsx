/**
 * How each lineage relation is named and coloured in the interface.
 *
 * Kept in one place because these six words are the product's vocabulary. If
 * they drift between views, the reader stops trusting them.
 *
 * The wording itself lives in domain/narrate.ts, so that the terminal output of
 * `npm run verify` and the interface say exactly the same thing.
 */

import type { IssueKind, LineageRelation } from '../../domain/types.ts';
import { PLAIN_LABEL, PLAIN_MEANING } from '../../domain/narrate.ts';
import { Badge } from './primitives.tsx';

export const RELATION_LABEL = PLAIN_LABEL;
export const RELATION_MEANING = PLAIN_MEANING;

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

export const ISSUE_LABEL: Record<IssueKind, string> = {
  conflict: 'Two records disagree',
  missing: 'Something was never written down',
  inferred: 'We worked it out ourselves',
  inconsistent: 'Two records contradict each other',
};

export const ISSUE_MEANING: Record<IssueKind, string> = {
  conflict: 'Two different documents describe the same period and say different things.',
  missing: 'A fact we needed simply is not in any record. We leave it blank.',
  inferred: 'A date shown was calculated by us, not read from a document. We say so.',
  inconsistent: 'Two records cannot both be true — for example, someone in a job that had already closed.',
};
