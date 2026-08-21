/**
 * The data model.
 *
 * The whole product rests on one decision: a POSITION is a first-class object
 * with a life of its own, not a text field attached to a person.
 *
 * Conventional HR systems store `employee.job_title = "Operations Executive"`.
 * When the title changes, that string is overwritten and the previous value is
 * gone. History is destroyed as a normal consequence of an UPDATE statement.
 *
 * Here, the same information is split into three objects and one relationship:
 *
 *   Person      — a human being. Exists independently of any job.
 *   Position    — a seat in the organisation. Exists independently of any human.
 *   Assignment  — a dated link between the two. THIS is the join that lets us
 *                 answer both "who held this role" and "what did this person do".
 *   Lineage     — a dated, typed, evidenced link between two Positions.
 *                 This is the part no other tool models.
 *
 * Every fact carries `source` and `confidence` so that any claim the interface
 * makes can be traced back to the record it came from.
 */

/** A quarter index: 0 = the first quarter of the configured window. */
export type QuarterIndex = number;

/** ISO date string, `YYYY-MM-DD`. */
export type ISODate = string;

/** How confident the source record is, as declared in the data. */
export type SourceConfidence = 'high' | 'medium' | 'low';

export interface Person {
  id: string;
  name: string;
  /** Assignment ids, ordered by start date. */
  assignmentIds: string[];
}

export interface Position {
  id: string;
  title: string;
  orgUnit: string;
  division: string;
  /** Job grade. Higher is more senior. Used as a lineage signal. */
  level: number | null;
  location: string | null;
  createdAt: ISODate | null;
  closedAt: ISODate | null;
  /** Position ids this one is declared to descend from. */
  predecessorIds: string[];
  /** Assignment ids, ordered by start date. */
  assignmentIds: string[];
}

export interface Assignment {
  id: string;
  personId: string;
  positionId: string;
  startDate: ISODate;
  endDate: ISODate | null;
  reportsToPositionId: string | null;
  employmentType: string | null;
  changeReason: string | null;
  source: string;
  confidence: SourceConfidence;
  /** True when the date shown was derived by us, not read from a record. */
  startDateInferred: boolean;
}

/**
 * How one position relates to the position that came before it.
 *
 * This vocabulary is the product. Every other tool records THAT a title
 * changed; these six values record WHAT the change meant.
 */
export type LineageRelation =
  | 'rename'        // Same job, new wording. Headcount did not grow.
  | 'redesignated'  // Same job, new wording AND a changed grade.
  | 'split'         // One position divided into several.
  | 'merge'         // Several positions consolidated into one.
  | 'created'       // Genuinely new. No predecessor exists.
  | 'succeeded';    // A predecessor exists but the titles barely overlap.

/** The four measured inputs behind every classification. */
export interface LineageSignals {
  /** Overlap coefficient over normalised title tokens. 0..1 */
  titleSimilarity: number;
  /** How cleanly the handover dates meet. 0..1, decaying over 180 days. */
  dateAdjacency: number;
  /** Whether the reporting line survived the handover. 0 or 1. */
  reportingContinuity: number;
  /** How certain the declared structure is. 0..1 */
  structuralCertainty: number;
}

export interface LineageVerdict {
  positionId: string;
  relation: LineageRelation;
  predecessorIds: string[];
  /** Weighted blend of the four signals. 0..1 */
  confidence: number;
  signals: LineageSignals;
  /** Plain-English reason, rendered next to the verdict in the interface. */
  reasoning: string;
  /** True when a human should check this by hand. */
  needsReview: boolean;
}

/** The four ways a record can fail to tell us what we need. */
export type IssueKind = 'conflict' | 'missing' | 'inferred' | 'inconsistent';

export interface DataIssue {
  id: string;
  kind: IssueKind;
  /** What the reader sees first. */
  title: string;
  detail: string;
  /** Position or person this attaches to, for navigation. */
  subjectId: string;
  subjectKind: 'position' | 'person';
  /** For conflicts: the competing records, so a human can choose. */
  options?: Array<{
    label: string;
    source: string;
    reportsToPositionId: string | null;
    confidence: SourceConfidence;
  }>;
  /** Set once a human resolves it in-session. Originals are never modified. */
  resolution?: {
    chosenLabel: string;
    reportsToPositionId: string | null;
    resolvedAt: string;
  };
}

export interface OrgModel {
  people: Map<string, Person>;
  positions: Map<string, Position>;
  assignments: Map<string, Assignment>;
  lineage: Map<string, LineageVerdict>;
  issues: DataIssue[];
  /** Inclusive quarter window covering every record found. */
  window: { startYear: number; startQuarter: number; quarterCount: number };
  /** Where this model came from, shown in the interface. */
  datasetLabel: string;
  /** Row counts, for the ingest receipt. */
  stats: { rowsRead: number; rowsUsed: number; rowsSkipped: number };
}

export interface Metrics {
  peopleCount: number;
  positionCount: number;
  /** Positions whose arrival was cosmetic: rename + redesignated. */
  renameCount: number;
  /** Seats that ARRIVED during the window with no predecessor. Real growth. */
  genuinelyNewCount: number;
  /** Seats that already existed when the records begin. Not growth. */
  preExistingCount: number;
  splitCount: number;
  mergeCount: number;
  succeededCount: number;
  issueCount: number;
  /** Headcount at the end of each quarter in the window. */
  headcountByQuarter: number[];
  headcountStart: number;
  headcountEnd: number;
}
