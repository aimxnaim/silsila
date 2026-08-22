/**
 * The reporting period.
 *
 * Every figure on the intelligence page is computed inside a window, and the
 * window is stated on screen rather than assumed. The label says "of records"
 * because the dataset's present is not today's date: records here end in 2025
 * while the wall clock says otherwise, and a control that quietly implied
 * "the last twelve months" would be the exact class of misreading this product
 * exists to correct.
 */

import type { OrgModel } from './types.ts';
import { quarterLabel } from './dates.ts';

export type PresetId = '12m' | '2y' | '3y' | 'all';

export interface Range {
  /** Inclusive quarter index the period opens at. */
  from: number;
  /** Inclusive quarter index the period closes at. */
  to: number;
  quarters: number;
  /** Rendered on screen, e.g. "Q3 2025 – Q2 2026". */
  label: string;
}

export const PRESETS: Array<{ id: PresetId; label: string }> = [
  { id: '12m', label: 'Last 12 months of records' },
  { id: '2y', label: 'Last 2 years of records' },
  { id: '3y', label: 'Last 3 years of records' },
  { id: 'all', label: 'All time' },
];

const QUARTERS: Record<PresetId, number | null> = { '12m': 4, '2y': 8, '3y': 12, all: null };

function build(from: number, to: number): Range {
  return {
    from,
    to,
    quarters: to - from + 1,
    label: from === to ? quarterLabel(from) : `${quarterLabel(from)} – ${quarterLabel(to)}`,
  };
}

export function rangeFor(model: OrgModel, id: PresetId): Range {
  const last = model.window.quarterCount - 1;
  const want = QUARTERS[id];
  const from = want === null ? 0 : Math.max(0, last - want + 1);
  return build(from, last);
}

/**
 * The equal-length period immediately before this one. Null when the records
 * do not reach back far enough — in which case no comparison is drawn at all,
 * rather than one against a half-empty period.
 */
export function previousRange(_model: OrgModel, r: Range): Range | null {
  const to = r.from - 1;
  const from = to - r.quarters + 1;
  if (from < 0) return null;
  return build(from, to);
}

/** The latest date any record mentions. Shown as "records current to". */
export function recordsCurrentTo(model: OrgModel): string | null {
  let latest: string | null = null;
  const consider = (d: string | null | undefined) => {
    if (d && (!latest || d > latest)) latest = d;
  };
  for (const a of model.assignments.values()) {
    consider(a.startDate);
    consider(a.endDate);
  }
  for (const p of model.positions.values()) {
    consider(p.createdAt);
    consider(p.closedAt);
  }
  return latest;
}

/** True when a quarter index falls inside the range. */
export function inRange(range: Range, quarter: number | null): boolean {
  return quarter !== null && quarter >= range.from && quarter <= range.to;
}
