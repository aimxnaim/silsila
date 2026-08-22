/**
 * One person, read the same way the organisation is read.
 *
 * The general analysis answers "what is happening here?". Sooner or later a
 * reader points at one name and asks the same question about them, and the
 * honest answer has to come from the same rules — otherwise the page is
 * running two standards, a lenient one for the org and an improvised one for
 * the individual.
 *
 * So nothing here is new logic. Every finding is an existing detector's rule
 * narrowed to one person, carrying the same `Signal` contract the org-wide
 * cards use, so a person-level card can be interrogated exactly like the
 * cards above it. What is new is the refusal to summarise: there is no score,
 * no ranking against colleagues, no readiness percentage. A person is not a
 * league table entry, and the three progression checks are reported
 * individually, met and unmet alike, precisely so a human can disagree with
 * one of them and keep the other two.
 */

import type { OrgModel } from './types.ts';
import type { Range } from './window.ts';
import { rangeFor } from './window.ts';
import type { ChartPoint, Signal, SignalChart } from './insights.ts';
import type { Move } from './mobility.ts';
import type { CriticalRole } from './structure.ts';
import type { Progression } from './progression.ts';
import { PROGRESSION_BASIS, STAGNATION_BASIS, progressionFor } from './progression.ts';
import { SUCCESSOR_YEARS, criticalRoles, directReports, meanSpan, spans } from './structure.ts';
import { moves } from './mobility.ts';
import { medianTimeInRoleYears, tenureYears, timeInRoleYears } from './workforce.ts';
import { formatDate } from './dates.ts';

/** A span this many times the mean is worth a look. Matches insights.ts. */
const SPAN_OUTLIER = 1.5;

/** Years of service after which no movement is worth noticing. */
const STAGNATION_YEARS = 3;

/** Bars past this point stop being a comparison and start being a list. */
const MAX_BARS = 8;

/**
 * One person's figure, drawn against the colleagues it should be read next to.
 *
 * A lone bar saying "4.2 years" tells a reader nothing they could not read in
 * the sentence above it. The same bar sitting among their department tells
 * them whether 4.2 is long, and that is the entire question.
 */
function amongPeers(
  model: OrgModel,
  personId: string,
  division: string,
  measure: (id: string) => number | null,
): ChartPoint[] {
  const rows: ChartPoint[] = [];

  for (const person of model.people.values()) {
    const held = person.assignmentIds
      .map((id) => model.assignments.get(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
    const last = held[held.length - 1];
    if (!last || last.endDate) continue;

    const pos = model.positions.get(last.positionId);
    if (pos?.division !== division) continue;

    const value = measure(person.id);
    if (value === null) continue;
    rows.push({ label: person.name, value: Number(value.toFixed(1)), emphasis: person.id === personId });
  }

  rows.sort((a, b) => b.value - a.value);

  // The person being analysed is never dropped by the cut, however long the
  // department is: a chart about someone that omits them is not about them.
  const top = rows.slice(0, MAX_BARS);
  const mine = rows.find((r) => r.emphasis);
  if (mine && !top.includes(mine)) top[top.length - 1] = mine;
  return top;
}

const MOVE_LABEL: Record<Move['kind'], string> = {
  transfer: 'Department transfer',
  progression: 'Step up in grade',
  lateral: 'Lateral move',
};

export interface PersonSeat {
  positionId: string;
  title: string;
  division: string;
  level: number | null;
  /** Direct reports at the end of the range. */
  reports: number;
  /** Mean span across the organisation, for comparison. */
  meanReports: number;
  critical: CriticalRole | null;
}

export interface PersonAnalysis {
  personId: string;
  name: string;
  /** Their seat now, or the last one they held. */
  title: string;
  division: string;
  inSeat: boolean;
  since: string | null;
  departedOn: string | null;
  yearsService: number | null;
  yearsInRole: number | null;
  /** The organisational median, so time in seat has something to sit against. */
  medianYearsInRole: number | null;
  /** The three progression checks, met and unmet. Null once a person has left. */
  progression: Progression | null;
  seat: PersonSeat | null;
  /** Every recorded move, most recent first. Not limited to the range. */
  moves: Move[];
  /** Findings raised about this person, ranked as the org-wide cards are. */
  signals: Signal[];
}

const RANK: Record<Signal['severity'], number> = { attention: 0, review: 1, positive: 2 };

/**
 * The progression rule, narrowed to one person.
 *
 * Fires only when all three checks hold — the same bar `progressionCandidates`
 * uses. When one check fails the reader still sees all three in the checks
 * panel; they simply do not see a card claiming something the record does not
 * support.
 */
function progressionSignal(p: Progression | null, chart: SignalChart | undefined): Signal | null {
  if (!p || !p.signal) return null;

  return {
    id: 'person-progression',
    severity: 'positive',
    title: 'Potentially ready for progression review',
    statement:
      `${p.name} meets all three progression checks: ${p.yearsInRole.toFixed(1)} years in ` +
      `their current seat, a previous step up on record, and a higher grade existing in ${p.division}.`,
    evidence: p.checks.map((c) => ({ label: c.label, value: c.detail })),
    basis: PROGRESSION_BASIS,
    chart,
    action: { label: 'Open the employee record', target: { kind: 'person', id: p.personId } },
    magnitude: p.yearsInRole,
    thin: false,
  };
}

/** Long service, one seat, no movement. */
function stagnationSignal(
  model: OrgModel,
  personId: string,
  seatCount: number,
  inSeat: boolean,
  years: number | null,
  chart: SignalChart | undefined,
): Signal | null {
  if (!inSeat || seatCount !== 1 || years === null || years < STAGNATION_YEARS) return null;

  const person = model.people.get(personId);
  if (!person) return null;

  return {
    id: 'person-stagnation',
    severity: 'review',
    title: 'No recorded movement',
    statement:
      `${person.name} has ${years.toFixed(1)} years of service in a single seat, with no ` +
      `change of position on record.`,
    evidence: [
      { label: 'Years of service', value: `${years.toFixed(1)}` },
      { label: 'Positions held', value: 'one, for the whole of their service' },
      { label: 'Moves recorded', value: 'none' },
    ],
    basis: STAGNATION_BASIS,
    chart,
    action: { label: 'Review career mobility', target: { kind: 'person', id: personId } },
    magnitude: years,
    thin: false,
  };
}

/** Their seat carries a span well above the organisational mean. */
function spanSignal(
  model: OrgModel, seat: PersonSeat | null, name: string, quarter: number,
): Signal | null {
  if (!seat || seat.meanReports <= 0) return null;
  if (seat.reports < seat.meanReports * SPAN_OUTLIER) return null;

  const bench = spans(model, quarter).slice(0, MAX_BARS).map((sp) => ({
    label: sp.holderName ?? sp.title,
    value: sp.reports,
    emphasis: sp.positionId === seat.positionId,
  }));

  return {
    id: 'person-span',
    severity: 'review',
    title: 'Management capacity may be stretched',
    statement:
      `${name} carries ${seat.reports} direct reports, against an organisational mean of ` +
      `${seat.meanReports.toFixed(1)}.`,
    evidence: [
      { label: 'Direct reports', value: `${seat.reports}` },
      { label: 'Organisational mean', value: seat.meanReports.toFixed(1) },
      { label: 'Seat', value: `${seat.title} — ${seat.division}` },
    ],
    basis: `Derived: live positions reporting to this seat, against the mean across all seats carrying reports. Flagged above ${SPAN_OUTLIER}× the mean.`,
    chart: {
      kind: 'bar',
      unit: 'direct reports',
      caption: 'Direct reports carried by each manager, widest first.',
      series: [{ label: 'Direct reports', points: bench }],
      reference: { label: 'organisational average', value: seat.meanReports },
    },
    action: { label: 'Open the position', target: { kind: 'position', id: seat.positionId } },
    magnitude: seat.reports,
    thin: false,
  };
}

/** A critical seat with nobody beneath it who meets the successor rule. */
function successionSignal(
  model: OrgModel, seat: PersonSeat | null, name: string, quarter: number,
): Signal | null {
  if (!seat?.critical || seat.critical.covered) return null;

  const c = seat.critical;
  // Why nobody qualified, rather than only that nobody did. Each report is
  // drawn against the service line the rule turns on, so a person three
  // months short reads as three months short.
  const bench = directReports(model, seat.positionId, quarter);
  return {
    id: 'person-succession',
    severity: 'attention',
    title: 'Succession coverage gap',
    statement:
      `${name} holds a critical seat with no recorded successor: ${c.title} in ${c.division}.`,
    evidence: [
      { label: 'Why this seat is critical', value: c.reason },
      { label: 'Successors meeting the rule', value: 'none on record' },
      {
        label: 'Direct reports',
        value: c.reports === 0 ? 'none' : `${c.reports}, none within two grades at two years’ tenure`,
      },
    ],
    basis:
      'Derived: a seat carrying direct reports or at grade 6 or above, held by one person, ' +
      'with no direct report within two grades whose holder has two years’ tenure.',
    chart: bench.length === 0 ? undefined : {
      kind: 'bar',
      unit: 'years of service',
      caption: `Service of each direct report, against the ${SUCCESSOR_YEARS} years the successor rule requires.`,
      series: [{
        label: 'Years of service',
        points: bench.slice(0, MAX_BARS).map((r) => ({
          label: r.name,
          value: Number(r.tenureYears.toFixed(1)),
          emphasis: r.qualifies,
        })),
      }],
      reference: { label: 'successor threshold', value: SUCCESSOR_YEARS },
    },
    action: { label: 'Open the position', target: { kind: 'position', id: seat.positionId } },
    magnitude: c.reports + (c.level ?? 0),
    thin: false,
  };
}

/** Their movement history, when there is one. Context, not a concern. */
function mobilitySignal(theirMoves: Move[], name: string): Signal | null {
  if (theirMoves.length === 0) return null;

  const latest = theirMoves[0];
  return {
    id: 'person-mobility',
    severity: 'positive',
    title: 'Internal mobility recorded',
    statement:
      `${name} has ${theirMoves.length} recorded move${theirMoves.length === 1 ? '' : 's'} ` +
      `within the organisation, most recently to ${latest.toTitle} in ${formatDate(latest.date)}.`,
    evidence: theirMoves.slice(0, 4).map((m) => ({
      label: MOVE_LABEL[m.kind],
      value: `${m.fromTitle} → ${m.toTitle}, ${formatDate(m.date)}`,
      records: [{ id: m.toPositionId, kind: 'position' as const, label: `${m.toTitle} — ${m.toDivision}` }],
    })),
    basis:
      'Derived: consecutive assignments for one person in different positions. A transfer ' +
      'changes division, a progression raises grade, anything else is lateral.',
    chart: {
      kind: 'bar',
      unit: 'moves',
      caption: 'Their recorded moves by type, across their whole history.',
      series: [{
        label: 'Moves',
        points: (['transfer', 'progression', 'lateral'] as const).map((kind) => ({
          label: MOVE_LABEL[kind],
          value: theirMoves.filter((m) => m.kind === kind).length,
        })),
      }],
    },
    action: { label: 'Open the employee record', target: { kind: 'person', id: theirMoves[0].personId } },
    magnitude: theirMoves.length,
    thin: false,
  };
}

/**
 * Everything the records support about one person.
 *
 * Returns null for an unknown id rather than an empty shell, so a caller with
 * a stale selection renders nothing instead of a page of dashes.
 */
export function personAnalysis(
  model: OrgModel,
  personId: string,
  range: Range,
): PersonAnalysis | null {
  const person = model.people.get(personId);
  if (!person) return null;

  const held = person.assignmentIds
    .map((id) => model.assignments.get(id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));

  const last = held[held.length - 1] ?? null;
  const pos = last ? model.positions.get(last.positionId) ?? null : null;
  const inSeat = Boolean(last && !last.endDate);

  const yearsService = tenureYears(model, personId);
  const yearsInRole = inSeat ? timeInRoleYears(model, personId) : null;

  // Their seat, as the structure module sees it. Both lookups run at the end
  // of the range so this page agrees with the figures on the general one.
  let seat: PersonSeat | null = null;
  if (pos && inSeat) {
    const all = spans(model, range.to);
    const mine = all.find((s) => s.positionId === pos.id) ?? null;
    const critical = criticalRoles(model, range.to).find((c) => c.positionId === pos.id) ?? null;

    seat = {
      positionId: pos.id,
      title: pos.title,
      division: pos.division,
      level: pos.level,
      reports: mine?.reports ?? 0,
      meanReports: meanSpan(model, range.to),
      critical,
    };
  }

  const progression = progressionFor(model, personId);

  // Movement is read across the whole history, not the reporting window: a
  // move from four years ago is still the reason this person's record looks
  // the way it does, and hiding it behind a range control would mislead.
  const theirMoves = moves(model, rangeFor(model, 'all')).filter((m) => m.personId === personId);

  // Both peer charts measure the same department, so they are built once here
  // rather than inside two detectors that would each recompute the roster.
  const division = pos?.division ?? '';

  const progressionChart: SignalChart | undefined = !progression ? undefined : {
    kind: 'bar',
    unit: 'years',
    caption: `Time in current seat across ${division}, longest first.`,
    series: [{
      label: 'Years in seat',
      points: amongPeers(model, personId, division, (id) => timeInRoleYears(model, id)),
    }],
    reference: medianTimeInRoleYears(model) === null ? undefined
      : { label: 'organisational median', value: medianTimeInRoleYears(model)! },
  };

  const serviceChart: SignalChart | undefined = !pos ? undefined : {
    kind: 'bar',
    unit: 'years',
    caption: `Years of service across ${division}, longest first.`,
    series: [{
      label: 'Years of service',
      points: amongPeers(model, personId, division, (id) => tenureYears(model, id)),
    }],
  };

  const found = [
    successionSignal(model, seat, person.name, range.to),
    spanSignal(model, seat, person.name, range.to),
    stagnationSignal(model, personId, held.length, inSeat, yearsService, serviceChart),
    progressionSignal(progression, progressionChart),
    mobilitySignal(theirMoves, person.name),
  ].filter((s): s is Signal => s !== null);

  return {
    personId: person.id,
    name: person.name,
    title: pos?.title ?? 'Not recorded',
    division: pos?.division ?? 'Not recorded',
    inSeat,
    since: last?.startDate ?? null,
    departedOn: inSeat ? null : last?.endDate ?? null,
    yearsService,
    yearsInRole,
    medianYearsInRole: medianTimeInRoleYears(model),
    progression,
    seat,
    moves: theirMoves,
    signals: found.sort(
      (a, b) => RANK[a.severity] - RANK[b.severity] || b.magnitude - a.magnitude,
    ),
  };
}

export interface PersonOption {
  id: string;
  name: string;
  title: string;
  division: string;
  inSeat: boolean;
}

/**
 * The picker's list: everyone in the records, currently seated first.
 *
 * Departed people stay selectable. A leaver's record is often the one HR most
 * wants to read back.
 */
export function analysablePeople(model: OrgModel): PersonOption[] {
  const out: PersonOption[] = [];

  for (const person of model.people.values()) {
    const held = person.assignmentIds
      .map((id) => model.assignments.get(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
    const last = held[held.length - 1] ?? null;
    const pos = last ? model.positions.get(last.positionId) : null;

    out.push({
      id: person.id,
      name: person.name,
      title: pos?.title ?? 'Not recorded',
      division: pos?.division ?? 'Not recorded',
      inSeat: Boolean(last && !last.endDate),
    });
  }

  return out.sort(
    (a, b) => Number(b.inSeat) - Number(a.inSeat) || a.name.localeCompare(b.name),
  );
}
