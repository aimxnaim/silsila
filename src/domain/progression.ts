/**
 * Who the records suggest is worth a conversation.
 *
 * This file is where the product is easiest to get wrong, so it is the most
 * conservative one here. It never says a person should be promoted and never
 * scores them. It reports three checks against the record — time in seat,
 * a prior step up, and room above them — and only raises a signal when all
 * three hold. The checks travel with the signal so a reader can disagree with
 * any one of them, which is the entire point: this is evidence for a human
 * review, not a decision.
 */

import type { OrgModel } from './types.ts';
import { medianTimeInRoleYears, tenureYears, timeInRoleYears } from './workforce.ts';

export const PROGRESSION_BASIS =
  'Derived: time in seat at or above the organisational median, at least one previous step up in grade, and a higher grade existing in their division.';

export const STAGNATION_BASIS =
  'Derived: three or more years of service with no recorded change of seat.';

/** Years of service after which no movement is worth noticing. */
const STAGNATION_YEARS = 3;

export interface Check {
  label: string;
  met: boolean;
  detail: string;
}

export interface Progression {
  personId: string;
  name: string;
  title: string;
  division: string;
  level: number | null;
  yearsInRole: number;
  yearsService: number;
  checks: Check[];
  /** True only when every check is met. */
  signal: boolean;
}

function ceilingOf(model: OrgModel, division: string): number {
  let top = 0;
  for (const pos of model.positions.values()) {
    if (pos.division === division && (pos.level ?? 0) > top) top = pos.level ?? 0;
  }
  return top;
}

export function progressionFor(model: OrgModel, personId: string): Progression | null {
  const person = model.people.get(personId);
  if (!person) return null;

  const spans = person.assignmentIds
    .map((id) => model.assignments.get(id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  const last = spans[spans.length - 1];
  if (!last || last.endDate) return null; // only people currently in a seat

  const pos = model.positions.get(last.positionId);
  if (!pos) return null;

  const median = medianTimeInRoleYears(model) ?? 0;
  const inRole = timeInRoleYears(model, personId) ?? 0;
  const service = tenureYears(model, personId) ?? 0;

  // Has their grade ever gone up?
  let steppedUp = false;
  for (let i = 1; i < spans.length; i++) {
    const from = model.positions.get(spans[i - 1].positionId);
    const to = model.positions.get(spans[i].positionId);
    if (from && to && (to.level ?? 0) > (from.level ?? 0)) steppedUp = true;
  }

  const ceiling = ceilingOf(model, pos.division);
  const headroom = (pos.level ?? 0) < ceiling;

  const checks: Check[] = [
    {
      label: 'Relevant time in seat',
      met: inRole >= median,
      detail: `${inRole.toFixed(1)} years in role, against an organisational median of ${median.toFixed(1)}`,
    },
    {
      label: 'Previous progression on record',
      met: steppedUp,
      detail: steppedUp
        ? 'Grade has increased at least once during their history'
        : 'No previous increase in grade is recorded',
    },
    {
      label: 'Higher grade exists in their department',
      met: headroom,
      detail: headroom
        ? `Currently grade ${pos.level ?? '—'}; ${pos.division} runs to grade ${ceiling}`
        : `Already at the highest grade recorded in ${pos.division}`,
    },
  ];

  return {
    personId: person.id,
    name: person.name,
    title: pos.title,
    division: pos.division,
    level: pos.level,
    yearsInRole: inRole,
    yearsService: service,
    checks,
    signal: checks.every((c) => c.met),
  };
}

/** Everyone whose record meets all three checks. */
export function progressionCandidates(model: OrgModel): Progression[] {
  const out: Progression[] = [];
  for (const person of model.people.values()) {
    const p = progressionFor(model, person.id);
    if (p?.signal) out.push(p);
  }
  return out.sort((a, b) => b.yearsInRole - a.yearsInRole);
}

export interface Stagnation {
  personId: string;
  name: string;
  division: string;
  title: string;
  years: number;
}

/** Long service, one seat, no movement. A pattern worth reviewing. */
export function stagnation(model: OrgModel): Stagnation[] {
  const out: Stagnation[] = [];

  for (const person of model.people.values()) {
    const spans = person.assignmentIds
      .map((id) => model.assignments.get(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
    if (spans.length !== 1) continue;

    const only = spans[0];
    if (only.endDate) continue;

    const years = tenureYears(model, person.id) ?? 0;
    if (years < STAGNATION_YEARS) continue;

    const pos = model.positions.get(only.positionId);
    out.push({
      personId: person.id,
      name: person.name,
      division: pos?.division ?? 'Not recorded',
      title: pos?.title ?? only.positionId,
      years,
    });
  }

  return out.sort((a, b) => b.years - a.years);
}
