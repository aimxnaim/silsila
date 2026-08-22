/**
 * Figures for the overview dashboard.
 *
 * A dashboard that only shows totals is a scoreboard. These are arranged so
 * each figure leads somewhere: the department breakdown drills into people,
 * and the change feed is a list of things a reader can open and interrogate.
 */

import type { OrgModel } from './types.ts';
import type { LineageRelation } from './types.ts';
import { toQuarterIndex } from './dates.ts';

export interface DepartmentSummary {
  division: string;
  /** People holding a position in this division at the latest quarter. */
  headcount: number;
  /** Everyone who has ever held a position here, across the whole window. */
  everCount: number;
  positions: number;
  changes: number;
  units: string[];
}

export function departments(model: OrgModel): DepartmentSummary[] {
  const map = new Map<string, DepartmentSummary>();
  const lastQuarter = model.window.quarterCount - 1;

  const touch = (division: string) => {
    if (!map.has(division)) {
      map.set(division, {
        division, headcount: 0, everCount: 0, positions: 0, changes: 0, units: [],
      });
    }
    return map.get(division)!;
  };

  const currentPeople = new Map<string, Set<string>>();
  const everPeople = new Map<string, Set<string>>();

  for (const pos of model.positions.values()) {
    const entry = touch(pos.division);
    entry.positions++;
    if (!entry.units.includes(pos.orgUnit)) entry.units.push(pos.orgUnit);

    const relation = model.lineage.get(pos.id)?.relation;
    if (relation && relation !== 'created') entry.changes++;

    for (const id of pos.assignmentIds) {
      const a = model.assignments.get(id)!;

      if (!everPeople.has(pos.division)) everPeople.set(pos.division, new Set());
      everPeople.get(pos.division)!.add(a.personId);

      const from = toQuarterIndex(a.startDate);
      const to = a.endDate ? toQuarterIndex(a.endDate) : lastQuarter;
      if (from !== null && from <= lastQuarter && lastQuarter <= (to ?? lastQuarter)) {
        if (!currentPeople.has(pos.division)) currentPeople.set(pos.division, new Set());
        currentPeople.get(pos.division)!.add(a.personId);
      }
    }
  }

  for (const [division, entry] of map) {
    entry.headcount = currentPeople.get(division)?.size ?? 0;
    entry.everCount = everPeople.get(division)?.size ?? 0;
    entry.units.sort();
  }

  return [...map.values()].sort((a, b) => b.headcount - a.headcount || a.division.localeCompare(b.division));
}

export interface ChangeEvent {
  positionId: string;
  date: string;
  title: string;
  division: string;
  orgUnit: string;
  relation: LineageRelation;
  /** People who were sitting in the seat when it changed. */
  affected: Array<{ id: string; name: string }>;
  needsReview: boolean;
  confidence: number;
}

/** Every structural change, newest first. The feed at the heart of the page. */
export function changeFeed(model: OrgModel): ChangeEvent[] {
  const out: ChangeEvent[] = [];

  for (const pos of model.positions.values()) {
    const verdict = model.lineage.get(pos.id);
    if (!verdict) continue;

    const affected = pos.assignmentIds
      .map((id) => model.assignments.get(id)!)
      .map((a) => model.people.get(a.personId))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => ({ id: p.id, name: p.name }));

    out.push({
      positionId: pos.id,
      date: pos.createdAt ?? '',
      title: pos.title,
      division: pos.division,
      orgUnit: pos.orgUnit,
      relation: verdict.relation,
      affected: [...new Map(affected.map((p) => [p.id, p])).values()],
      needsReview: verdict.needsReview,
      confidence: verdict.confidence,
    });
  }

  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/** People currently sitting in a given division, with their job title. */
export function peopleIn(model: OrgModel, division: string) {
  const lastQuarter = model.window.quarterCount - 1;
  const seen = new Map<string, { personId: string; name: string; title: string; orgUnit: string; current: boolean }>();

  for (const pos of model.positions.values()) {
    if (pos.division !== division) continue;
    for (const id of pos.assignmentIds) {
      const a = model.assignments.get(id)!;
      const person = model.people.get(a.personId);
      if (!person) continue;

      const from = toQuarterIndex(a.startDate);
      const to = a.endDate ? toQuarterIndex(a.endDate) : lastQuarter;
      const current = from !== null && from <= lastQuarter && lastQuarter <= (to ?? lastQuarter);

      const existing = seen.get(person.id);
      // Prefer the current seat when someone has held several here.
      if (!existing || (current && !existing.current)) {
        seen.set(person.id, {
          personId: person.id, name: person.name,
          title: pos.title, orgUnit: pos.orgUnit, current,
        });
      }
    }
  }

  return [...seen.values()].sort(
    (a, b) => Number(b.current) - Number(a.current) || a.name.localeCompare(b.name),
  );
}
