/**
 * The shape of the reporting tree, and what it implies.
 *
 * Two of the figures here are proxies, and the interface says so out loud.
 * The records carry no "critical role" flag and no named successor, so both
 * are inferred from structure: a seat matters if work reports through it, and
 * it is covered if somebody close enough below it could step up. Those rules
 * are printed next to the numbers they produce, because a proxy nobody can
 * see the workings of is just an assertion.
 */

import type { OrgModel } from './types.ts';
import { toQuarterIndex } from './dates.ts';
import { tenureYears } from './workforce.ts';

export const CRITICAL_BASIS =
  'Derived: live seats carrying direct reports, or graded 6 and above.';

export const SUCCESSION_BASIS =
  'Derived: covered when a direct report sits within two grades and has two years’ service.';

/** Grades within which a direct report is treated as a plausible successor. */
const SUCCESSOR_GRADE_REACH = 2;
/** Years of service a successor needs before the seat counts as covered. */
const SUCCESSOR_MIN_YEARS = 2;
/** Grade at or above which a seat is critical regardless of reports. */
const SENIOR_GRADE = 6;

interface Holder {
  personId: string;
  name: string;
  startDate: string;
}

/** Who was sitting in each live seat at this quarter, and who they reported to. */
function occupancy(model: OrgModel, quarter: number) {
  const holderOf = new Map<string, Holder>();
  const reportsTo = new Map<string, string>();

  for (const pos of model.positions.values()) {
    const created = toQuarterIndex(pos.createdAt);
    if (created === null || created > quarter) continue;
    const closed = pos.closedAt ? toQuarterIndex(pos.closedAt) : null;
    if (closed !== null && closed < quarter) continue;

    for (const id of pos.assignmentIds) {
      const a = model.assignments.get(id);
      if (!a) continue;
      const from = toQuarterIndex(a.startDate);
      if (from === null || from > quarter) continue;
      const to = a.endDate ? toQuarterIndex(a.endDate) : model.window.quarterCount - 1;
      if (to !== null && to < quarter) continue;

      const person = model.people.get(a.personId);
      if (person) holderOf.set(pos.id, { personId: person.id, name: person.name, startDate: a.startDate });
      if (a.reportsToPositionId) reportsTo.set(pos.id, a.reportsToPositionId);
      break;
    }
  }

  return { holderOf, reportsTo };
}

export interface Span {
  positionId: string;
  title: string;
  division: string;
  holderName: string | null;
  holderPersonId: string | null;
  reports: number;
}

export function spans(model: OrgModel, quarter: number): Span[] {
  const { holderOf, reportsTo } = occupancy(model, quarter);

  const counts = new Map<string, number>();
  for (const parent of reportsTo.values()) counts.set(parent, (counts.get(parent) ?? 0) + 1);

  const out: Span[] = [];
  for (const [positionId, reports] of counts) {
    const pos = model.positions.get(positionId);
    if (!pos) continue;
    const holder = holderOf.get(positionId) ?? null;
    out.push({
      positionId,
      title: pos.title,
      division: pos.division,
      holderName: holder?.name ?? null,
      holderPersonId: holder?.personId ?? null,
      reports,
    });
  }

  return out.sort((a, b) => b.reports - a.reports || a.title.localeCompare(b.title));
}

export function meanSpan(model: OrgModel, quarter: number): number {
  const list = spans(model, quarter);
  if (list.length === 0) return 0;
  return list.reduce((sum, s) => sum + s.reports, 0) / list.length;
}

export interface Successor {
  personId: string;
  name: string;
  positionId: string;
  title: string;
  level: number | null;
  tenureYears: number;
}

export interface CriticalRole {
  positionId: string;
  title: string;
  division: string;
  level: number | null;
  holderName: string | null;
  holderPersonId: string | null;
  reports: number;
  covered: boolean;
  successors: Successor[];
  /** Why this seat qualified, in plain words. */
  reason: string;
}

export function criticalRoles(model: OrgModel, quarter: number): CriticalRole[] {
  const { holderOf, reportsTo } = occupancy(model, quarter);

  const counts = new Map<string, number>();
  const childrenOf = new Map<string, string[]>();
  for (const [child, parent] of reportsTo) {
    counts.set(parent, (counts.get(parent) ?? 0) + 1);
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent)!.push(child);
  }

  const out: CriticalRole[] = [];

  for (const [positionId, holder] of holderOf) {
    const pos = model.positions.get(positionId);
    if (!pos) continue;

    const reports = counts.get(positionId) ?? 0;
    const senior = (pos.level ?? 0) >= SENIOR_GRADE;
    if (reports === 0 && !senior) continue;

    const reason =
      reports > 0 && senior ? `Grade ${pos.level} with ${reports} direct reports`
      : reports > 0 ? `${reports} direct report${reports === 1 ? '' : 's'}`
      : `Grade ${pos.level}`;

    const successors: Successor[] = [];
    for (const childId of childrenOf.get(positionId) ?? []) {
      const childPos = model.positions.get(childId);
      const childHolder = holderOf.get(childId);
      if (!childPos || !childHolder) continue;

      const gap = (pos.level ?? 0) - (childPos.level ?? 0);
      if (gap < 0 || gap > SUCCESSOR_GRADE_REACH) continue;

      // Measured against the end of the window, not the wall clock: every
      // other figure on the page is computed inside the window, and a tenure
      // that kept growing against today's date would disagree with them.
      const years = tenureYears(model, childHolder.personId) ?? 0;
      if (years < SUCCESSOR_MIN_YEARS) continue;

      successors.push({
        personId: childHolder.personId,
        name: childHolder.name,
        positionId: childId,
        title: childPos.title,
        level: childPos.level,
        tenureYears: years,
      });
    }

    out.push({
      positionId,
      title: pos.title,
      division: pos.division,
      level: pos.level,
      holderName: holder.name,
      holderPersonId: holder.personId,
      reports,
      covered: successors.length > 0,
      successors,
      reason,
    });
  }

  return out.sort((a, b) => (b.level ?? 0) - (a.level ?? 0) || b.reports - a.reports);
}

export interface Coverage {
  total: number;
  covered: number;
  gaps: CriticalRole[];
  rate: number | null;
}

export function successionCoverage(model: OrgModel, quarter: number): Coverage {
  const roles = criticalRoles(model, quarter);
  const gaps = roles.filter((r) => !r.covered);
  return {
    total: roles.length,
    covered: roles.length - gaps.length,
    gaps,
    rate: roles.length > 0 ? ((roles.length - gaps.length) / roles.length) * 100 : null,
  };
}

/** Longest chain of reporting lines at this quarter. */
export function reportingDepth(model: OrgModel, quarter: number): number {
  const { reportsTo } = occupancy(model, quarter);

  const depthOf = (id: string, seen: Set<string>): number => {
    if (seen.has(id)) return 0;
    seen.add(id);
    const parent = reportsTo.get(id);
    return parent ? 1 + depthOf(parent, seen) : 1;
  };

  let deepest = 0;
  for (const id of reportsTo.keys()) deepest = Math.max(deepest, depthOf(id, new Set()));
  return deepest;
}
