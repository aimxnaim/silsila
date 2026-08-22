/**
 * The org chart, rebuilt for a moment in time.
 *
 * "Who reports to whom" is the one organisational picture everybody already
 * knows how to read, so it is the right way into a list of 78 positions. The
 * difference from an ordinary org chart is that this one can be rebuilt for
 * ANY past quarter — which is the whole point of the product.
 */

import type { OrgModel, Position } from './types.ts';
import { toQuarterIndex } from './dates.ts';

export interface TreeNode {
  position: Position;
  holderName: string | null;
  reportsToPositionId: string | null;
  children: TreeNode[];
  /** Total positions beneath this one, at any depth. */
  descendantCount: number;
}

export interface Hierarchy {
  roots: TreeNode[];
  /** Positions live at this moment that no reporting line connects. */
  orphans: TreeNode[];
  /** Every live node by id, roots and orphans alike. */
  index: Map<string, TreeNode>;
  liveCount: number;
}

/**
 * The chain of command above a position, root first, the position itself last.
 *
 * This is what the chart's trail is drawn from: the reader is always shown one
 * job and its direct reports, so the route they took to arrive has to be
 * recoverable from the id alone rather than remembered as they click.
 *
 * A spreadsheet can describe a reporting loop — A reports to B, B reports to
 * A — and no amount of validation upstream makes that impossible. Walking such
 * a chain naively never returns, so the walk records where it has been and
 * stops the moment it arrives somewhere twice. A malformed export costs the
 * reader a short trail, not a frozen tab.
 */
export function pathTo(index: Map<string, TreeNode>, id: string): TreeNode[] {
  const path: TreeNode[] = [];
  const seen = new Set<string>();

  let current = index.get(id) ?? null;
  while (current && !seen.has(current.position.id)) {
    seen.add(current.position.id);
    path.push(current);
    current = current.reportsToPositionId ? index.get(current.reportsToPositionId) ?? null : null;
  }

  return path.reverse();
}

function isLive(pos: Position, quarter: number): boolean {
  const created = toQuarterIndex(pos.createdAt);
  const closed = pos.closedAt ? toQuarterIndex(pos.closedAt) : null;
  if (created === null || created > quarter) return false;
  if (closed !== null && closed < quarter) return false;
  return true;
}

export function buildHierarchy(model: OrgModel, quarter: number): Hierarchy {
  const live = [...model.positions.values()].filter((p) => isLive(p, quarter));
  const liveIds = new Set(live.map((p) => p.id));

  const nodes = new Map<string, TreeNode>();

  for (const position of live) {
    // Who held it, and who it reported to, at this particular moment.
    const holder = position.assignmentIds
      .map((id) => model.assignments.get(id)!)
      .find((a) => {
        const from = toQuarterIndex(a.startDate);
        const to = a.endDate ? toQuarterIndex(a.endDate) : model.window.quarterCount - 1;
        return from !== null && from <= quarter && quarter <= (to ?? Infinity);
      });

    const reportsTo = holder?.reportsToPositionId ?? null;

    nodes.set(position.id, {
      position,
      holderName: holder ? (model.people.get(holder.personId)?.name ?? null) : null,
      reportsToPositionId: reportsTo && liveIds.has(reportsTo) ? reportsTo : null,
      children: [],
      descendantCount: 0,
    });
  }

  const roots: TreeNode[] = [];
  const orphans: TreeNode[] = [];

  for (const node of nodes.values()) {
    const parent = node.reportsToPositionId ? nodes.get(node.reportsToPositionId) : null;
    if (parent && parent !== node) parent.children.push(node);
    else if (node.reportsToPositionId === null) roots.push(node);
    else orphans.push(node);
  }

  // A root with nobody beneath it is not the top of the tree — it is a seat
  // whose reporting line was simply never recorded. Say so rather than
  // implying it sits alongside the chief executive.
  const realRoots = roots.filter((r) => r.children.length > 0);
  const unattached = roots.filter((r) => r.children.length === 0);

  const sortTree = (node: TreeNode): number => {
    node.children.sort(
      (a, b) =>
        (b.position.level ?? 0) - (a.position.level ?? 0) ||
        a.position.title.localeCompare(b.position.title),
    );
    node.descendantCount = node.children.reduce((sum, c) => sum + sortTree(c) + 1, 0);
    return node.descendantCount;
  };

  // Everything that heads a subtree gets sorted and counted, the positions
  // outside the tree included: the chart lets a reader open one of those and
  // it has to report its own reports honestly when they do.
  realRoots.forEach(sortTree);
  orphans.forEach(sortTree);
  unattached.forEach(sortTree);

  realRoots.sort((a, b) => b.descendantCount - a.descendantCount);

  return {
    roots: realRoots,
    orphans: [...orphans, ...unattached].sort((a, b) =>
      a.position.title.localeCompare(b.position.title),
    ),
    index: nodes,
    liveCount: live.length,
  };
}
