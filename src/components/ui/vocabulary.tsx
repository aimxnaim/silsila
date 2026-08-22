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

/* ------------------------------------------------------- Department marks */

/**
 * Two letters and a colour per department, both derived from the name.
 *
 * Derived rather than configured, because the dataset is whatever CSV was
 * dropped in. A hardcoded map would be right for the demonstration file and
 * blank for everyone else's.
 */
export function deptAbbr(name: string): string {
  const words = name.replace(/[^A-Za-z ]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length === 0) return '??';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Identity hues available. Kept in step with `--cat-N` in tokens.css. */
export const CAT_COUNT = 10;

/**
 * Departments get their hue assigned, not hashed.
 *
 * Hashing was the obvious approach and it was wrong: on the demonstration
 * dataset three of the nine departments landed on the same colour, which is
 * worse than no colour at all — it actively asserts that two unrelated
 * departments are the same thing. A hash cannot promise distinctness, and
 * distinctness is the entire feature.
 *
 * So the divisions in the loaded model are sorted and dealt hues in order,
 * which is collision-free up to CAT_COUNT and stable for a given dataset.
 * Anything not registered — a person's name on an avatar, a label on a chart —
 * still falls back to the hash, where a collision costs nothing because the
 * label is sitting right beside it.
 */
const assigned = new Map<string, number>();

export function registerDivisions(names: string[]): void {
  const sorted = [...new Set(names)].sort();
  if (sorted.length === assigned.size && sorted.every((n) => assigned.has(n))) return;

  assigned.clear();
  sorted.forEach((name, i) => assigned.set(name, (i % CAT_COUNT) + 1));
}

function hashIndex(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 997;
  return (h % CAT_COUNT) + 1;
}

/**
 * Which hue a name owns — the same one in every view it appears in. That
 * stability is the whole value: the eye follows one colour for one department
 * across a card, a chart bar, an avatar and a table row without re-reading the
 * label each time.
 */
export function catIndex(name: string): number {
  return assigned.get(name) ?? hashIndex(name);
}

export interface Tone {
  /** Solid fill — bars, tiles, the 3px edge. */
  ink: string;
  /** Tint — a panel sitting behind text. */
  bg: string;
  /** Border for that panel. */
  line: string;
}

/** The full triple for a name, for anything that needs more than a fill. */
export function toneOf(name: string): Tone {
  const i = catIndex(name);
  return { ink: `var(--cat-${i})`, bg: `var(--cat-${i}-bg)`, line: `var(--cat-${i}-line)` };
}

/** The triple for a position in a list — charts, legends, anything ordered. */
export function toneAt(index: number): Tone {
  const i = (index % CAT_COUNT) + 1;
  return { ink: `var(--cat-${i})`, bg: `var(--cat-${i}-bg)`, line: `var(--cat-${i}-line)` };
}

export function deptColor(name: string): string {
  return toneOf(name).ink;
}

/**
 * A department, wherever one is named in running text or a table cell.
 *
 * One component rather than a `<td>{division}</td>` in six files, because the
 * point of the colour is that it is the SAME colour every time. Spelling the
 * markup out per view is how that stops being true.
 */
export function DeptChip({ name, dot = false }: { name: string; dot?: boolean }) {
  const tone = toneOf(name);

  if (dot) {
    return (
      <span className="dept-chip dept-chip--dot" title={name}>
        <i style={{ background: tone.ink }} aria-hidden="true" />
        {name}
      </span>
    );
  }

  return (
    <span
      className="dept-chip"
      style={{ background: tone.bg, color: tone.ink, borderColor: tone.line }}
    >
      {name}
    </span>
  );
}

/* --------------------------------------------------------- The three states
 *
 * Every job in the file resolves to exactly one of these, and the same three
 * carry the status pill in a table, the segment colour in the stacked chart
 * and the bar colour in lane mode. Three states is the ceiling: a fourth would
 * mean the chart legend no longer fits on one line, which is where legends
 * stop being read.
 */

export type State = 'settled' | 'check' | 'new';

export const STATE: Record<State, { label: string; tone: 'ok' | 'warn' | 'default'; bar: string; meaning: string }> = {
  settled: {
    label: 'Confirmed',
    tone: 'ok',
    bar: 'var(--ok-bar)',
    meaning: 'the seat changed, and the lineage is clear',
  },
  check: {
    label: 'Needs a check',
    tone: 'warn',
    bar: 'var(--wr-bar)',
    meaning: 'a successor exists but a person should confirm it',
  },
  new: {
    label: 'Brand new',
    tone: 'default',
    bar: 'var(--nu-bar)',
    meaning: 'no predecessor — genuine growth',
  },
};

export function stateOf(relation: LineageRelation, needsReview: boolean): State {
  if (needsReview) return 'check';
  return relation === 'created' ? 'new' : 'settled';
}
