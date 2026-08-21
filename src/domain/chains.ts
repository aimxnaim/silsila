/**
 * Lineage chains — the shape behind the story strips.
 *
 * A Gantt chart is a poor first explanation. Someone who has never seen this
 * product needs to be told what happened in the order it happened, left to
 * right, in cards with arrows between them:
 *
 *     [Branch Operations Executive] → renamed → [Branch Operations Specialist]
 *
 * That reads at a glance. A time axis does not, until you already know what
 * you are looking for.
 *
 * This module groups positions into connected chains and lays each one out in
 * columns, so a component can render it without doing any graph work.
 */

import type { OrgModel, Position } from './types.ts';

export interface ChainColumn {
  depth: number;
  positions: Position[];
}

export interface Chain {
  id: string;
  columns: ChainColumn[];
  /** Every position in the chain, for counting and filtering. */
  members: Position[];
  /** True when the chain contains a split or a merge rather than a plain rename. */
  branching: boolean;
}

/**
 * Group positions into weakly connected components of the predecessor graph,
 * keeping only components with more than one member. A position with no
 * relatives has no story to tell here — it belongs in the plain list.
 */
export function chains(model: OrgModel): Chain[] {
  const adjacency = new Map<string, Set<string>>();
  const touch = (id: string) => {
    if (!adjacency.has(id)) adjacency.set(id, new Set());
    return adjacency.get(id)!;
  };

  for (const pos of model.positions.values()) {
    touch(pos.id);
    for (const predId of pos.predecessorIds) {
      if (!model.positions.has(predId)) continue;
      touch(pos.id).add(predId);
      touch(predId).add(pos.id);
    }
  }

  const seen = new Set<string>();
  const out: Chain[] = [];

  for (const startId of adjacency.keys()) {
    if (seen.has(startId)) continue;

    // Flood fill the component.
    const component: string[] = [];
    const queue = [startId];
    seen.add(startId);
    while (queue.length > 0) {
      const id = queue.shift()!;
      component.push(id);
      for (const neighbour of adjacency.get(id) ?? []) {
        if (seen.has(neighbour)) continue;
        seen.add(neighbour);
        queue.push(neighbour);
      }
    }

    if (component.length < 2) continue;

    // Depth = longest path from a position in this component that has no
    // predecessor inside it. Longest rather than shortest, so a merge's two
    // parents both land left of the merged seat.
    const inComponent = new Set(component);
    const depth = new Map<string, number>();

    const resolve = (id: string, guard: Set<string>): number => {
      if (depth.has(id)) return depth.get(id)!;
      if (guard.has(id)) return 0;                       // cycle guard
      guard.add(id);

      const parents = (model.positions.get(id)?.predecessorIds ?? [])
        .filter((p) => inComponent.has(p));

      const d = parents.length === 0
        ? 0
        : Math.max(...parents.map((p) => resolve(p, guard))) + 1;

      depth.set(id, d);
      return d;
    };

    for (const id of component) resolve(id, new Set());

    const byDepth = new Map<number, Position[]>();
    for (const id of component) {
      const d = depth.get(id) ?? 0;
      const pos = model.positions.get(id);
      if (!pos) continue;
      if (!byDepth.has(d)) byDepth.set(d, []);
      byDepth.get(d)!.push(pos);
    }

    const columns = [...byDepth.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([d, positions]) => ({
        depth: d,
        positions: positions.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '')),
      }));

    const members = component
      .map((id) => model.positions.get(id))
      .filter((p): p is Position => Boolean(p));

    out.push({
      id: columns[0]?.positions[0]?.id ?? startId,
      columns,
      members,
      branching: columns.some((c) => c.positions.length > 1),
    });
  }

  // Longest, most interesting chains first.
  return out.sort((a, b) => b.members.length - a.members.length);
}

/** Who was sitting in a position, most recently. */
export function lastHolder(model: OrgModel, pos: Position) {
  const id = pos.assignmentIds[pos.assignmentIds.length - 1];
  if (!id) return null;
  const assignment = model.assignments.get(id);
  if (!assignment) return null;
  return {
    person: model.people.get(assignment.personId) ?? null,
    assignment,
  };
}
