/**
 * Movement inside the organisation.
 *
 * A move is the join between two consecutive assignments for one person. What
 * kind of move it was comes from comparing the two seats: a different division
 * is a transfer, a higher grade is progression, anything else is lateral. The
 * distinction matters because an organisation that promotes but never
 * transfers looks identical to one that does both, if you only count moves.
 */

import type { OrgModel } from './types.ts';
import { toQuarterIndex } from './dates.ts';
import type { Range } from './window.ts';
import { inRange } from './window.ts';
import { THIN_DENOMINATOR, meanHeadcount } from './workforce.ts';

export type MoveKind = 'transfer' | 'progression' | 'lateral';

export interface Move {
  personId: string;
  name: string;
  date: string;
  quarter: number;
  fromPositionId: string;
  toPositionId: string;
  fromTitle: string;
  toTitle: string;
  fromDivision: string;
  toDivision: string;
  fromLevel: number | null;
  toLevel: number | null;
  kind: MoveKind;
}

export function moves(model: OrgModel, range: Range): Move[] {
  const out: Move[] = [];

  for (const person of model.people.values()) {
    const spans = person.assignmentIds
      .map((id) => model.assignments.get(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));

    for (let i = 1; i < spans.length; i++) {
      const prev = spans[i - 1];
      const next = spans[i];
      if (prev.positionId === next.positionId) continue;

      const quarter = toQuarterIndex(next.startDate);
      if (!inRange(range, quarter)) continue;

      const from = model.positions.get(prev.positionId);
      const to = model.positions.get(next.positionId);
      if (!from || !to) continue;

      const kind: MoveKind =
        from.division !== to.division ? 'transfer'
        : (to.level ?? 0) > (from.level ?? 0) ? 'progression'
        : 'lateral';

      out.push({
        personId: person.id,
        name: person.name,
        date: next.startDate,
        quarter: quarter!,
        fromPositionId: from.id,
        toPositionId: to.id,
        fromTitle: from.title,
        toTitle: to.title,
        fromDivision: from.division,
        toDivision: to.division,
        fromLevel: from.level,
        toLevel: to.level,
        kind,
      });
    }
  }

  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export interface Flow {
  from: string;
  to: string;
  count: number;
  people: Array<{ id: string; name: string }>;
}

export function divisionFlows(model: OrgModel, range: Range): Flow[] {
  const map = new Map<string, Flow>();

  for (const mv of moves(model, range)) {
    if (mv.kind !== 'transfer') continue;
    const key = `${mv.fromDivision}|${mv.toDivision}`;
    if (!map.has(key)) {
      map.set(key, { from: mv.fromDivision, to: mv.toDivision, count: 0, people: [] });
    }
    const flow = map.get(key)!;
    flow.count++;
    flow.people.push({ id: mv.personId, name: mv.name });
  }

  return [...map.values()].sort((a, b) => b.count - a.count || a.from.localeCompare(b.from));
}

export interface MobilityRate {
  movers: number;
  population: number;
  rate: number | null;
  thin: boolean;
}

export function mobilityRate(model: OrgModel, range: Range): MobilityRate {
  const movers = new Set(moves(model, range).map((mv) => mv.personId)).size;
  const population = meanHeadcount(model, range);
  return {
    movers,
    population,
    rate: population > 0 ? (movers / population) * 100 : null,
    thin: population < THIN_DENOMINATOR,
  };
}

/** Divisions that send more people out than they take in, and the reverse. */
export function netFlow(model: OrgModel, range: Range) {
  const out = new Map<string, { division: string; produced: number; received: number }>();
  const touch = (division: string) => {
    if (!out.has(division)) out.set(division, { division, produced: 0, received: 0 });
    return out.get(division)!;
  };

  for (const flow of divisionFlows(model, range)) {
    touch(flow.from).produced += flow.count;
    touch(flow.to).received += flow.count;
  }

  return [...out.values()].sort(
    (a, b) => b.produced - a.produced || b.received - a.received,
  );
}
