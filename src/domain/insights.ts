/**
 * Patterns worth a human's attention.
 *
 * Each detector looks for one shape in the records and returns either a signal
 * or nothing at all. Returning nothing matters as much as returning something:
 * a page that always shows four cards teaches its reader that the cards are
 * decoration. These fire only when the pattern is actually there.
 *
 * No detector predicts. Every one of them describes something that has already
 * happened, states the rule it used, and hands over the records it used so the
 * reader can check the working and disagree.
 */

import type { OrgModel } from './types.ts';
import type { Range } from './window.ts';
import { quarterLabelShort, toQuarterIndex } from './dates.ts';
import { headcountAt, medianTimeInRoleYears, turnover, turnoverByDivision, vacancies } from './workforce.ts';
import { CRITICAL_BASIS, SUCCESSION_BASIS, meanSpan, spans, successionCoverage } from './structure.ts';
import { divisionFlows, mobilityRate, moves } from './mobility.ts';
import { PROGRESSION_BASIS, STAGNATION_BASIS, progressionCandidates, stagnation } from './progression.ts';

export type Severity = 'attention' | 'review' | 'positive';

export type AreaId =
  | 'progression' | 'succession' | 'structure'
  | 'retention' | 'evolution' | 'mobility';

export type Target =
  | { kind: 'dept'; id: string }
  | { kind: 'person'; id: string }
  | { kind: 'position'; id: string }
  | { kind: 'area'; id: AreaId };

export interface EvidenceRecord {
  id: string;
  kind: 'person' | 'position';
  label: string;
}

export interface Evidence {
  label: string;
  value: string;
  /** Revealed when the reader expands the card. */
  records?: EvidenceRecord[];
}

/**
 * The shape behind a finding.
 *
 * A sentence can tell a reader what was found. It is much worse at telling
 * them how big it is next to everything else, and that comparison is usually
 * the thing that decides whether a figure matters — two departures mean one
 * thing when every other department lost one, and something else entirely
 * when every other department lost none.
 *
 * So each detector hands over the series it was reading when it fired. Not a
 * decorative chart bolted on afterwards: the same numbers, drawn. The bar the
 * finding is actually about carries `emphasis`, which is the only reason the
 * chart needs colour at all.
 */
export interface ChartPoint {
  label: string;
  value: number;
  /** The point this finding is about. Drawn in the severity colour. */
  emphasis?: boolean;
}

export interface ChartSeries {
  label: string;
  points: ChartPoint[];
}

export interface SignalChart {
  /** Bars compare things; a line shows a period changing. */
  kind: 'bar' | 'line';
  /** What one unit on the axis counts, e.g. "departures". */
  unit: string;
  /** One line under the plot saying exactly what is drawn. */
  caption: string;
  /** Bars read series[0]. A line may carry a second for comparison. */
  series: ChartSeries[];
  /** A dashed rule across the plot — an average, or a threshold. */
  reference?: { label: string; value: number };
}

export interface Signal {
  id: string;
  severity: Severity;
  /** Short, e.g. "Retention concern". */
  title: string;
  /** One sentence of plain English. */
  statement: string;
  evidence: Evidence[];
  /** The derivation rule, printed under the evidence. */
  basis: string;
  action: { label: string; target: Target };
  /** The series the detector was reading. Absent when nothing meaningful plots. */
  chart?: SignalChart;
  /** Ranking only. Never displayed. */
  magnitude: number;
  /** True when the figure rests on a denominator too small to lead with. */
  thin: boolean;
}

const RANK: Record<Severity, number> = { attention: 0, review: 1, positive: 2 };

/** A span this many times the mean is worth a look. */
const SPAN_OUTLIER = 1.5;

/** Bars past this point stop being a comparison and start being a list. */
const MAX_BARS = 7;

/** Distinct titles carried by seats that were live at this quarter. */
function liveTitlesAt(model: OrgModel, quarter: number): number {
  const titles = new Set<string>();
  for (const pos of model.positions.values()) {
    const created = toQuarterIndex(pos.createdAt);
    if (created === null || created > quarter) continue;
    const closed = pos.closedAt ? toQuarterIndex(pos.closedAt) : null;
    if (closed !== null && closed < quarter) continue;
    titles.add(pos.title);
  }
  return titles.size;
}

/** Tallies a list into bars, largest first. */
function tally(
  rows: Array<{ key: string }>,
  emphasis?: string,
): ChartPoint[] {
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.key, (counts.get(r.key) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_BARS)
    .map(([label, value]) => ({ label, value, emphasis: label === emphasis }));
}

function retention(model: OrgModel, range: Range): Signal | null {
  const byDivision = turnoverByDivision(model, range).filter((d) => d.departures.length > 0);
  if (byDivision.length === 0) return null;

  const worst = byDivision[0];
  const overall = turnover(model, range);

  return {
    id: 'retention',
    severity: worst.departures.length >= 2 ? 'attention' : 'review',
    title: 'Retention concern',
    statement:
      `${worst.division} recorded ${worst.departures.length} of the organisation's ` +
      `${overall.departures.length} departures in this period, from ${worst.people} people.`,
    evidence: [
      {
        label: 'Departures recorded',
        value: `${worst.departures.length} of ${worst.people} people`,
        records: worst.departures.map((d) => ({
          id: d.personId,
          kind: 'person' as const,
          label: `${d.name} — ${d.lastTitle}, left ${d.date}`,
        })),
      },
      {
        label: 'Across the organisation',
        value: `${overall.departures.length} departures from an average of ${overall.mean.toFixed(0)} people`,
      },
      {
        label: 'Highest of any department',
        value: byDivision.length > 1
          ? `next highest is ${byDivision[1].division} with ${byDivision[1].departures.length}`
          : 'no other department recorded a departure',
      },
    ],
    basis: 'Derived: a person whose last assignment ends and who does not appear again.',
    chart: {
      kind: 'bar',
      unit: 'departures',
      caption: `Departures recorded by department, ${range.label}.`,
      series: [{
        label: 'Departures',
        points: byDivision.slice(0, MAX_BARS).map((d) => ({
          label: d.division,
          value: d.departures.length,
          emphasis: d.division === worst.division,
        })),
      }],
    },
    action: { label: 'Review retention', target: { kind: 'dept', id: worst.division } },
    magnitude: worst.departures.length,
    thin: worst.thin,
  };
}

function managementCapacity(model: OrgModel, range: Range): Signal | null {
  const list = spans(model, range.to);
  if (list.length === 0) return null;

  const mean = meanSpan(model, range.to);
  const widest = list[0];
  if (mean <= 0 || widest.reports < mean * SPAN_OUTLIER) return null;

  return {
    id: 'span',
    severity: 'review',
    title: 'Management capacity may be stretched',
    statement:
      `${widest.holderName ?? 'One seat'} oversees ${widest.reports} direct reports, ` +
      `against an organisational average of ${mean.toFixed(1)}.`,
    evidence: [
      { label: 'Widest span', value: `${widest.reports} direct reports — ${widest.title}` },
      { label: 'Organisational average', value: mean.toFixed(1) },
      { label: 'Relative to average', value: `${(widest.reports / mean).toFixed(1)}×` },
    ],
    basis: 'Derived: live positions whose current holder reports to this seat.',
    chart: {
      kind: 'bar',
      unit: 'direct reports',
      caption: 'Direct reports carried by each manager, widest first.',
      series: [{
        label: 'Direct reports',
        points: list.slice(0, MAX_BARS).map((sp) => ({
          label: sp.holderName ?? sp.title,
          value: sp.reports,
          emphasis: sp.positionId === widest.positionId,
        })),
      }],
      reference: { label: 'organisational average', value: mean },
    },
    action: { label: 'Review structure', target: { kind: 'position', id: widest.positionId } },
    magnitude: widest.reports / mean,
    thin: false,
  };
}

function progression(model: OrgModel): Signal | null {
  const candidates = progressionCandidates(model);
  if (candidates.length === 0) return null;

  const median = medianTimeInRoleYears(model);

  return {
    id: 'progression',
    severity: 'positive',
    title: 'Career progression',
    statement:
      `${candidates.length} ${candidates.length === 1 ? 'person' : 'people'} may warrant a ` +
      'progression review based on their recorded career history.',
    evidence: [
      {
        label: 'Potentially ready for progression review',
        value: `${candidates.length} ${candidates.length === 1 ? 'person' : 'people'}`,
        records: candidates.map((c) => ({
          id: c.personId,
          kind: 'person' as const,
          label: `${c.name} — ${c.title}, ${c.yearsInRole.toFixed(1)} years in role`,
        })),
      },
      { label: 'Every check met', value: 'time in seat, previous progression, and headroom above them' },
    ],
    basis: PROGRESSION_BASIS,
    chart: {
      kind: 'bar',
      unit: 'years',
      caption: 'Time in current seat, for each person meeting all three checks.',
      series: [{
        label: 'Years in seat',
        points: candidates.slice(0, MAX_BARS).map((c) => ({
          label: c.name,
          value: Number(c.yearsInRole.toFixed(1)),
        })),
      }],
      reference: median === null ? undefined : { label: 'organisational median', value: median },
    },
    action: { label: 'Review people', target: { kind: 'area', id: 'progression' } },
    magnitude: candidates.length,
    thin: false,
  };
}

function roleProliferation(model: OrgModel): Signal | null {
  const titles = new Set<string>();
  for (const pos of model.positions.values()) titles.add(pos.title);

  const people = model.people.size;
  if (titles.size <= people) return null;

  const quarters = Array.from({ length: model.window.quarterCount }, (_, q) => q);

  const relabelled = [...model.lineage.values()].filter(
    (v) => v.relation === 'rename' || v.relation === 'redesignated',
  ).length;
  const split = [...model.lineage.values()].filter((v) => v.relation === 'split').length;
  const merged = [...model.lineage.values()].filter((v) => v.relation === 'merge').length;

  return {
    id: 'proliferation',
    severity: 'review',
    title: 'Role proliferation detected',
    statement:
      `The organisation carries ${titles.size} distinct job titles for ${people} people — ` +
      'more titles than staff.',
    evidence: [
      { label: 'Distinct job titles', value: String(titles.size) },
      { label: 'People on record', value: String(people) },
      { label: 'Renamed or redesignated', value: `${relabelled} — the same job, new wording` },
      { label: 'Split or merged', value: `${split} split, ${merged} merged` },
    ],
    basis: 'Direct: distinct position titles, classified by the lineage verdict on each seat.',
    chart: {
      kind: 'line',
      unit: 'count',
      caption:
        'Distinct job titles against headcount, by quarter. The gap between the two ' +
        'lines is the proliferation.',
      series: [
        {
          label: 'Distinct job titles',
          points: quarters.map((q) => ({ label: quarterLabelShort(q), value: liveTitlesAt(model, q) })),
        },
        {
          label: 'People in seats',
          points: quarters.map((q) => ({ label: quarterLabelShort(q), value: headcountAt(model, q) })),
        },
      ],
    },
    action: { label: 'Explore role evolution', target: { kind: 'area', id: 'evolution' } },
    magnitude: titles.size / Math.max(people, 1),
    thin: false,
  };
}

function succession(model: OrgModel, range: Range): Signal | null {
  const coverage = successionCoverage(model, range.to);
  if (coverage.total === 0 || coverage.gaps.length === 0) return null;

  return {
    id: 'succession',
    severity: coverage.gaps.length >= coverage.total / 2 ? 'attention' : 'review',
    title: 'Succession coverage gap',
    statement:
      `${coverage.gaps.length} of ${coverage.total} critical roles have no direct report ` +
      'close enough in grade to be an evident successor.',
    evidence: [
      {
        label: 'Roles without evident cover',
        value: `${coverage.gaps.length} of ${coverage.total}`,
        records: coverage.gaps.map((g) => ({
          id: g.positionId,
          kind: 'position' as const,
          label: `${g.title} — ${g.holderName ?? 'vacant'} (${g.reason})`,
        })),
      },
      {
        label: 'Coverage',
        value: coverage.rate === null ? 'not calculable' : `${coverage.rate.toFixed(0)}%`,
      },
    ],
    basis: `${CRITICAL_BASIS} ${SUCCESSION_BASIS}`,
    chart: {
      kind: 'bar',
      unit: 'seats',
      caption: 'Critical seats with no evident successor, by department.',
      series: [{ label: 'Uncovered seats', points: tally(coverage.gaps.map((g) => ({ key: g.division }))) }],
    },
    action: { label: 'Review succession', target: { kind: 'area', id: 'succession' } },
    magnitude: coverage.gaps.length,
    thin: false,
  };
}

function stagnationSignal(model: OrgModel): Signal | null {
  const list = stagnation(model);
  if (list.length < 3) return null;

  return {
    id: 'stagnation',
    severity: 'review',
    title: 'Retention signal detected',
    statement:
      `${list.length} people have three or more years of service with no recorded change of seat.`,
    evidence: [
      {
        label: 'Long service, no movement',
        value: `${list.length} people`,
        records: list.slice(0, 12).map((s) => ({
          id: s.personId,
          kind: 'person' as const,
          label: `${s.name} — ${s.title}, ${s.years.toFixed(1)} years`,
        })),
      },
    ],
    basis: STAGNATION_BASIS,
    chart: {
      kind: 'bar',
      unit: 'people',
      caption: 'People with three or more years in one seat, by department.',
      series: [{ label: 'People', points: tally(list.map((p) => ({ key: p.division }))) }],
    },
    action: { label: 'Review retention', target: { kind: 'area', id: 'retention' } },
    magnitude: list.length / Math.max(model.people.size, 1),
    thin: false,
  };
}

function vacancySignal(model: OrgModel, range: Range): Signal | null {
  const open = vacancies(model, range.to).filter((v) => v.quartersOpen >= 2);
  if (open.length === 0) return null;

  return {
    id: 'vacancy',
    severity: 'review',
    title: 'Seats standing empty',
    statement:
      `${open.length} ${open.length === 1 ? 'seat has' : 'seats have'} been open for two ` +
      'quarters or more without a recorded holder.',
    evidence: [
      {
        label: 'Open seats',
        value: String(open.length),
        records: open.map((v) => ({
          id: v.positionId,
          kind: 'position' as const,
          label: `${v.title} — ${v.division}, open ${v.quartersOpen} quarters`,
        })),
      },
    ],
    basis: 'Derived: a position that exists, is not closed, and has no current holder.',
    chart: {
      kind: 'line',
      unit: 'seats',
      caption: 'Seats standing empty for two quarters or more, by quarter.',
      series: [{
        label: 'Open seats',
        points: Array.from({ length: range.to - range.from + 1 }, (_, i) => {
          const q = range.from + i;
          return {
            label: quarterLabelShort(q),
            value: vacancies(model, q).filter((v) => v.quartersOpen >= 2).length,
          };
        }),
      }],
    },
    action: { label: 'Review organisation', target: { kind: 'area', id: 'structure' } },
    magnitude: open.length,
    thin: false,
  };
}

function mobilitySignal(model: OrgModel, range: Range): Signal | null {
  const flows = divisionFlows(model, range);
  if (flows.length === 0) return null;

  const rate = mobilityRate(model, range);
  const all = moves(model, range);

  return {
    id: 'mobility',
    severity: 'positive',
    title: 'Internal mobility pattern identified',
    statement:
      `${flows.reduce((n, f) => n + f.count, 0)} people moved between departments, ` +
      `most commonly ${flows[0].from} to ${flows[0].to}.`,
    evidence: [
      { label: 'Most common path', value: `${flows[0].from} → ${flows[0].to} (${flows[0].count})` },
      { label: 'Distinct paths', value: String(flows.length) },
      {
        label: 'People with any internal move',
        value: `${rate.movers} of an average ${rate.population.toFixed(0)}`,
      },
    ],
    basis: 'Direct: consecutive assignments for one person in different divisions.',
    chart: {
      kind: 'bar',
      unit: 'moves',
      caption: `Internal moves by type, ${range.label}.`,
      series: [{
        label: 'Moves',
        points: [
          { label: 'Department transfers', value: all.filter((mv) => mv.kind === 'transfer').length, emphasis: true },
          { label: 'Steps up in grade', value: all.filter((mv) => mv.kind === 'progression').length },
          { label: 'Lateral moves', value: all.filter((mv) => mv.kind === 'lateral').length },
        ],
      }],
    },
    action: { label: 'Explore mobility', target: { kind: 'area', id: 'mobility' } },
    magnitude: flows.length,
    thin: rate.thin,
  };
}

/**
 * Run every detector and rank what came back. Severity first, then size —
 * a large positive should never outrank something needing attention.
 */
export function signals(model: OrgModel, range: Range): Signal[] {
  const found = [
    retention(model, range),
    managementCapacity(model, range),
    succession(model, range),
    vacancySignal(model, range),
    roleProliferation(model),
    stagnationSignal(model),
    progression(model),
    mobilitySignal(model, range),
  ].filter((s): s is Signal => s !== null);

  return found.sort(
    (a, b) => RANK[a.severity] - RANK[b.severity] || b.magnitude - a.magnitude,
  );
}
