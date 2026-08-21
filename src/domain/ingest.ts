/**
 * Turn parsed CSV rows into an OrgModel.
 *
 * The rule this file obeys: NEVER invent a fact to make the picture tidy.
 * When a record is missing, conflicting, derived or self-contradictory, we
 * record an issue and leave the gap visible. Most tools silently interpolate,
 * which is precisely why the people who own the data do not trust them.
 */

import type {
  Assignment, DataIssue, OrgModel, Person, Position, SourceConfidence,
} from './types.ts';
import { WINDOW_QUARTERS, WINDOW_START_QUARTER, WINDOW_START_YEAR, parseDate } from './dates.ts';
import type { ParsedCSV } from './csv.ts';

function clean(v: string | undefined): string | null {
  const t = (v ?? '').trim();
  return t.length === 0 ? null : t;
}

function asConfidence(v: string | undefined): SourceConfidence {
  const t = (v ?? '').trim().toLowerCase();
  return t === 'high' || t === 'medium' || t === 'low' ? t : 'medium';
}

function splitIds(v: string | undefined): string[] {
  return (v ?? '')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function ingest(parsed: ParsedCSV, datasetLabel: string): OrgModel {
  const people = new Map<string, Person>();
  const positions = new Map<string, Position>();
  const assignments = new Map<string, Assignment>();
  const issues: DataIssue[] = [];

  let rowsSkipped = 0;

  // ---- Pass 1: build the three core objects -------------------------------
  parsed.rows.forEach((row, i) => {
    const personId = clean(row.person_id);
    const positionId = clean(row.position_id);
    const startDate = clean(row.start_date);

    // A row without these cannot be placed on a timeline at all.
    if (!personId || !positionId || !startDate || !parseDate(startDate)) {
      rowsSkipped++;
      return;
    }

    if (!people.has(personId)) {
      people.set(personId, {
        id: personId,
        name: clean(row.person_name) ?? personId,
        assignmentIds: [],
      });
    }

    if (!positions.has(positionId)) {
      const levelRaw = clean(row.level);
      positions.set(positionId, {
        id: positionId,
        title: clean(row.position_title) ?? positionId,
        orgUnit: clean(row.org_unit) ?? 'Unassigned',
        division: clean(row.division) ?? clean(row.org_unit) ?? 'Unassigned',
        level: levelRaw !== null && !Number.isNaN(Number(levelRaw)) ? Number(levelRaw) : null,
        location: clean(row.location),
        createdAt: clean(row.position_created),
        closedAt: clean(row.position_closed),
        predecessorIds: splitIds(row.predecessor_positions),
        assignmentIds: [],
      });
    }

    const assignmentId = `A${String(i).padStart(4, '0')}`;
    assignments.set(assignmentId, {
      id: assignmentId,
      personId,
      positionId,
      startDate,
      endDate: clean(row.end_date),
      reportsToPositionId: clean(row.reports_to_position),
      employmentType: clean(row.employment_type),
      changeReason: clean(row.change_reason),
      source: clean(row.source) ?? 'Unattributed record',
      confidence: asConfidence(row.confidence),
      startDateInferred: false,
    });
  });

  // ---- Pass 2: wire the join both ways ------------------------------------
  for (const a of assignments.values()) {
    people.get(a.personId)?.assignmentIds.push(a.id);
    positions.get(a.positionId)?.assignmentIds.push(a.id);
  }

  const byStart = (x: string, y: string) =>
    (assignments.get(x)!.startDate).localeCompare(assignments.get(y)!.startDate);

  for (const p of people.values()) p.assignmentIds.sort(byStart);
  for (const p of positions.values()) p.assignmentIds.sort(byStart);

  // ---- Pass 3: derive what we safely can, and flag what we cannot ---------

  // A position with no recorded creation date: derive it from its first
  // assignment, and say so. A derived date is shown differently in the UI.
  for (const pos of positions.values()) {
    if (!pos.createdAt && pos.assignmentIds.length > 0) {
      const first = assignments.get(pos.assignmentIds[0])!;
      pos.createdAt = first.startDate;
      first.startDateInferred = true;
      issues.push({
        id: `inferred-${pos.id}`,
        kind: 'inferred',
        title: `Start of ${pos.title} is derived, not recorded`,
        detail:
          `No creation date exists for this position. The date shown ` +
          `(${first.startDate}) is the earliest assignment we can see, so the ` +
          `position may be older than the interface suggests.`,
        subjectId: pos.id,
        subjectKind: 'position',
      });
    }
  }

  // A position with no manager AND nobody reporting into it is orphaned: it
  // cannot be placed in the hierarchy at all. Note the second condition — a
  // position with no manager but with subordinates is simply the top of the
  // tree, which is not a defect. Flagging the chief executive as a data
  // problem would be exactly the kind of false positive that teaches people
  // to ignore the warnings.
  const hasSubordinates = new Set<string>();
  for (const a of assignments.values()) {
    if (a.reportsToPositionId) hasSubordinates.add(a.reportsToPositionId);
  }

  for (const pos of positions.values()) {
    const everHadManager = pos.assignmentIds.some(
      (id) => assignments.get(id)!.reportsToPositionId,
    );
    if (!everHadManager && !hasSubordinates.has(pos.id) && pos.assignmentIds.length > 0) {
      issues.push({
        id: `missing-${pos.id}`,
        kind: 'missing',
        title: `No reporting line was ever recorded for ${pos.title}`,
        detail:
          `Every record for this position leaves the manager field empty. ` +
          `We will not guess. This position sits outside the reporting ` +
          `hierarchy in every snapshot.`,
        subjectId: pos.id,
        subjectKind: 'position',
      });
    }
  }

  // An assignment running past the life of the position it belongs to.
  for (const a of assignments.values()) {
    const pos = positions.get(a.positionId);
    if (!pos?.closedAt || !a.endDate) continue;
    if (a.endDate > pos.closedAt) {
      issues.push({
        id: `inconsistent-${a.id}`,
        kind: 'inconsistent',
        title: `${people.get(a.personId)?.name ?? a.personId} is recorded in a closed position`,
        detail:
          `${pos.title} closed on ${pos.closedAt}, but this assignment runs to ` +
          `${a.endDate}. One of the two records is wrong and we cannot tell which.`,
        subjectId: a.personId,
        subjectKind: 'person',
      });
    }
  }

  // Two sources describing the same period with different reporting lines.
  const overlapKey = new Map<string, Assignment[]>();
  for (const a of assignments.values()) {
    const key = `${a.personId}|${a.positionId}`;
    const list = overlapKey.get(key) ?? [];
    list.push(a);
    overlapKey.set(key, list);
  }
  for (const [key, list] of overlapKey) {
    if (list.length < 2) continue;
    const managers = new Set(list.map((a) => a.reportsToPositionId ?? 'none'));
    if (managers.size < 2) continue;

    const [personId, positionId] = key.split('|');
    issues.push({
      id: `conflict-${positionId}-${personId}`,
      kind: 'conflict',
      title: `Two sources disagree on who ${people.get(personId)?.name ?? personId} reported to`,
      detail:
        `Both records cover the same period in ${positions.get(positionId)?.title ?? positionId} ` +
        `but name different managers. Choose which source to trust; the original ` +
        `records are not modified.`,
      subjectId: personId,
      subjectKind: 'person',
      options: list.map((a) => ({
        label: `${a.source}`,
        source: a.source,
        reportsToPositionId: a.reportsToPositionId,
        confidence: a.confidence,
      })),
    });
  }

  return {
    people,
    positions,
    assignments,
    lineage: new Map(),
    issues,
    window: {
      startYear: WINDOW_START_YEAR,
      startQuarter: WINDOW_START_QUARTER,
      quarterCount: WINDOW_QUARTERS,
    },
    datasetLabel,
    stats: {
      rowsRead: parsed.rows.length,
      rowsUsed: parsed.rows.length - rowsSkipped,
      rowsSkipped,
    },
  };
}
