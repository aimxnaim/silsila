/**
 * Who is here, who left, and what is standing empty.
 *
 * The one judgement in this file is what counts as a departure. An assignment
 * that ends is not a leaver — most of them are people moving seat. A departure
 * is a person whose LAST assignment ends and who never appears again. Getting
 * that wrong would turn every promotion in the dataset into attrition, which
 * is how turnover figures usually end up wrong.
 */

import type { OrgModel } from './types.ts';
import { toQuarterIndex } from './dates.ts';
import type { Range } from './window.ts';
import { inRange } from './window.ts';

/** Below this many people, a rate is too volatile to lead with. */
export const THIN_DENOMINATOR = 10;

export interface Departure {
  personId: string;
  name: string;
  division: string;
  date: string;
  quarter: number;
  lastPositionId: string;
  lastTitle: string;
}

export function departures(model: OrgModel, range: Range): Departure[] {
  const out: Departure[] = [];

  for (const person of model.people.values()) {
    const spans = person.assignmentIds
      .map((id) => model.assignments.get(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
    if (spans.length === 0) continue;

    const last = spans[spans.length - 1];
    if (!last.endDate) continue; // still in a seat

    const quarter = toQuarterIndex(last.endDate);
    if (!inRange(range, quarter)) continue;

    const pos = model.positions.get(last.positionId);
    out.push({
      personId: person.id,
      name: person.name,
      division: pos?.division ?? 'Not recorded',
      date: last.endDate,
      quarter: quarter!,
      lastPositionId: last.positionId,
      lastTitle: pos?.title ?? last.positionId,
    });
  }

  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export function headcountAt(model: OrgModel, quarter: number): number {
  const live = new Set<string>();
  for (const a of model.assignments.values()) {
    const from = toQuarterIndex(a.startDate);
    if (from === null || from > quarter) continue;
    const to = a.endDate ? toQuarterIndex(a.endDate) : model.window.quarterCount - 1;
    if (to !== null && to < quarter) continue;
    live.add(a.personId);
  }
  return live.size;
}

export function meanHeadcount(model: OrgModel, range: Range): number {
  let total = 0;
  for (let q = range.from; q <= range.to; q++) total += headcountAt(model, q);
  return total / Math.max(range.quarters, 1);
}

export interface Turnover {
  departures: Departure[];
  mean: number;
  /** Null when there is no population to divide by. */
  rate: number | null;
  thin: boolean;
}

export function turnover(model: OrgModel, range: Range): Turnover {
  const list = departures(model, range);
  const mean = meanHeadcount(model, range);
  return {
    departures: list,
    mean,
    rate: mean > 0 ? (list.length / mean) * 100 : null,
    thin: mean < THIN_DENOMINATOR,
  };
}

export interface DivisionTurnover {
  division: string;
  departures: Departure[];
  /** Everyone who held a seat here at any point in the range. */
  people: number;
  rate: number | null;
  thin: boolean;
}

export function turnoverByDivision(model: OrgModel, range: Range): DivisionTurnover[] {
  const everyone = new Map<string, Set<string>>();

  for (const pos of model.positions.values()) {
    for (const id of pos.assignmentIds) {
      const a = model.assignments.get(id);
      if (!a) continue;
      const from = toQuarterIndex(a.startDate);
      const to = a.endDate ? toQuarterIndex(a.endDate) : model.window.quarterCount - 1;
      if (from === null) continue;
      // Overlaps the range at all?
      if (from > range.to || (to !== null && to < range.from)) continue;
      if (!everyone.has(pos.division)) everyone.set(pos.division, new Set());
      everyone.get(pos.division)!.add(a.personId);
    }
  }

  const leavers = new Map<string, Departure[]>();
  for (const d of departures(model, range)) {
    if (!leavers.has(d.division)) leavers.set(d.division, []);
    leavers.get(d.division)!.push(d);
  }

  const out: DivisionTurnover[] = [];
  for (const [division, people] of everyone) {
    const list = leavers.get(division) ?? [];
    out.push({
      division,
      departures: list,
      people: people.size,
      rate: people.size > 0 ? (list.length / people.size) * 100 : null,
      thin: people.size < THIN_DENOMINATOR,
    });
  }

  return out.sort((a, b) => b.departures.length - a.departures.length || a.division.localeCompare(b.division));
}

export interface Vacancy {
  positionId: string;
  title: string;
  division: string;
  /** First quarter the seat stood empty. */
  sinceQuarter: number;
  quartersOpen: number;
}

/** A seat that exists, is not closed, and nobody is sitting in. */
export function vacancies(model: OrgModel, quarter: number): Vacancy[] {
  const out: Vacancy[] = [];

  for (const pos of model.positions.values()) {
    const created = toQuarterIndex(pos.createdAt);
    if (created === null || created > quarter) continue;
    const closed = pos.closedAt ? toQuarterIndex(pos.closedAt) : null;
    if (closed !== null && closed < quarter) continue;

    const occupied = pos.assignmentIds.some((id) => {
      const a = model.assignments.get(id);
      if (!a) return false;
      const from = toQuarterIndex(a.startDate);
      if (from === null || from > quarter) return false;
      const to = a.endDate ? toQuarterIndex(a.endDate) : model.window.quarterCount - 1;
      return to === null || to >= quarter;
    });
    if (occupied) continue;

    // Walk back to the quarter it emptied.
    let since = created;
    for (const id of pos.assignmentIds) {
      const a = model.assignments.get(id);
      if (!a?.endDate) continue;
      const ended = toQuarterIndex(a.endDate);
      if (ended !== null && ended < quarter && ended + 1 > since) since = ended + 1;
    }

    out.push({
      positionId: pos.id,
      title: pos.title,
      division: pos.division,
      sinceQuarter: since,
      quartersOpen: Math.max(0, quarter - since + 1),
    });
  }

  return out.sort((a, b) => b.quartersOpen - a.quartersOpen);
}

const DAYS_PER_YEAR = 365.25;

function yearsBetween(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / (DAYS_PER_YEAR * 86_400_000);
}

/** How long this person has been with the organisation, in years. */
export function tenureYears(model: OrgModel, personId: string): number | null {
  const person = model.people.get(personId);
  if (!person) return null;
  const spans = person.assignmentIds
    .map((id) => model.assignments.get(id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  if (spans.length === 0) return null;

  const start = spans[0].startDate;
  const last = spans[spans.length - 1];
  const end = last.endDate ?? endOfWindow(model);
  return Math.max(0, yearsBetween(start, end));
}

/** How long in the seat they hold now. */
export function timeInRoleYears(model: OrgModel, personId: string): number | null {
  const person = model.people.get(personId);
  if (!person) return null;
  const spans = person.assignmentIds
    .map((id) => model.assignments.get(id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  const last = spans[spans.length - 1];
  if (!last) return null;
  return Math.max(0, yearsBetween(last.startDate, last.endDate ?? endOfWindow(model)));
}

function endOfWindow(model: OrgModel): string {
  const year = model.window.startYear + Math.floor((model.window.quarterCount - 1) / 4);
  const month = ((model.window.quarterCount - 1) % 4) * 3 + 3;
  return `${year}-${String(month).padStart(2, '0')}-28`;
}

/** The org's median time in current role — the yardstick progression uses. */
export function medianTimeInRoleYears(model: OrgModel): number | null {
  const values: number[] = [];
  for (const person of model.people.values()) {
    const spans = person.assignmentIds
      .map((id) => model.assignments.get(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
    const last = spans[spans.length - 1];
    if (!last || last.endDate) continue; // current holders only
    const v = timeInRoleYears(model, person.id);
    if (v !== null) values.push(v);
  }
  if (values.length === 0) return null;
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
}
