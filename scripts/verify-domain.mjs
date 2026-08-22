/**
 * Runs the whole domain pipeline against the demo dataset and prints what it
 * found. This is how the numbers in the README were produced — not by reading
 * the interface, but by running the logic headless.
 *
 * Run:  npm run verify
 */
import { parseCSV } from '../src/domain/csv.ts';
import { ingest } from '../src/domain/ingest.ts';
import { classifyLineage } from '../src/domain/lineage.ts';
import { metrics } from '../src/domain/metrics.ts';
import { PRESETS, previousRange, rangeFor, recordsCurrentTo } from '../src/domain/window.ts';
import { departures, headcountAt, medianTimeInRoleYears, turnover, vacancies } from '../src/domain/workforce.ts';
import { criticalRoles, meanSpan, reportingDepth, spans, successionCoverage } from '../src/domain/structure.ts';
import { buildHierarchy, pathTo } from '../src/domain/hierarchy.ts';
import { divisionFlows, mobilityRate, moves, netFlow } from '../src/domain/mobility.ts';
import { progressionCandidates, progressionFor, stagnation } from '../src/domain/progression.ts';
import { signals } from '../src/domain/insights.ts';
import { analysablePeople, personAnalysis } from '../src/domain/personAnalysis.ts';
import { glanceTotal, orgGlance, personGlance, positionGlance } from '../src/domain/glance.ts';
import { DEMO_DATASET_CSV, DEMO_DATASET_LABEL } from '../src/data/demoDataset.ts';

const parsed = parseCSV(DEMO_DATASET_CSV);
const model = ingest(parsed, DEMO_DATASET_LABEL);
model.lineage = classifyLineage(model);
const m = metrics(model);

console.log('\n=== INGEST ===');
console.log(`rows read ${model.stats.rowsRead}  used ${model.stats.rowsUsed}  skipped ${model.stats.rowsSkipped}`);
console.log(`people ${model.people.size}  positions ${model.positions.size}  assignments ${model.assignments.size}`);

console.log('\n=== LINEAGE ===');
const byRelation = {};
for (const v of model.lineage.values()) (byRelation[v.relation] ??= []).push(v);
for (const [rel, list] of Object.entries(byRelation).sort()) {
  console.log(`${rel.padEnd(14)} ${String(list.length).padStart(3)}`);
}

console.log('\n=== NON-TRIVIAL VERDICTS ===');
for (const v of model.lineage.values()) {
  if (v.relation === 'created') continue;
  const pos = model.positions.get(v.positionId);
  const preds = v.predecessorIds.map((id) => model.positions.get(id)?.title).join(' + ');
  console.log(
    `${v.relation.padEnd(13)} ${String(Math.round(v.confidence * 100)).padStart(3)}%  ` +
    `sim ${v.signals.titleSimilarity.toFixed(2)}  ${preds}  ->  ${pos.title}` +
    (v.needsReview ? '   [needs review]' : ''),
  );
}

console.log('\n=== DATA QUALITY ===');
for (const i of model.issues) console.log(`${i.kind.padEnd(13)} ${i.title}`);

console.log('\n=== HEADLINE ===');
console.log(`renamed not created : ${m.renameCount}`);
console.log(`genuinely new       : ${m.genuinelyNewCount}`);
console.log(`splits              : ${m.splitCount}`);
console.log(`merges              : ${m.mergeCount}`);
console.log(`needs a human       : ${m.succeededCount}`);
console.log(`issues found        : ${m.issueCount}`);
console.log(`headcount           : ${m.headcountStart} -> ${m.headcountEnd}`);
console.log('');

/* ------------------------------------------------------------------ *
 * Assertions.
 *
 * The project has no test runner and does not need one: the domain is
 * pure functions over one model, so the cheapest honest check is to run
 * the pipeline and assert on what comes out. A failure exits non-zero so
 * CI and a human see the same thing.
 * ------------------------------------------------------------------ */
let failures = 0;

export function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       expected ${JSON.stringify(expected)}\n       actual   ${JSON.stringify(actual)}`}`);
}

export function checkAbove(label, actual, floor) {
  const ok = typeof actual === 'number' && actual > floor;
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label} (${actual} > ${floor})`);
}

console.log('\n=== CHECKS ===');
check('headcount ends at 64', m.headcountEnd, 64);
check('people ingested', model.people.size, 67);
check('data issues found', model.issues.length, 4);

check('four presets offered', PRESETS.length, 4);
check('12m range spans 4 quarters', rangeFor(model, '12m').quarters, 4);
check('all-time starts at zero', rangeFor(model, 'all').from, 0);
check('previous of 12m sits directly before it', previousRange(model, rangeFor(model, '12m')).to, rangeFor(model, '12m').from - 1);
check('records current to the latest date on file', recordsCurrentTo(model), '2025-04-01');

const all = rangeFor(model, 'all');
check('three departures on record', departures(model, all).length, 3);
check('nobody still in a seat counts as departed',
  departures(model, all).filter((d) => !d.date).length, 0);
checkAbove('some seats are open', vacancies(model, model.window.quarterCount - 1).length, 0);
check('headcount at the last quarter matches metrics',
  headcountAt(model, model.window.quarterCount - 1), m.headcountEnd);
checkAbove('median time in role is positive', medianTimeInRoleYears(model), 0);
check('turnover reports a thin denominator honestly', turnover(model, all).thin, false);

const lastQ = model.window.quarterCount - 1;
const spanList = spans(model, lastQ);

checkAbove('spans exist', spanList.length, 0);
// Asserts the ordering rule, not a particular seat: the transfers in Task 2
// leave two seats tied at the top, separated only by alphabetical tiebreak.
check('spans come back widest first',
  spanList.every((s, i) => i === 0 || spanList[i - 1].reports >= s.reports), true);
checkAbove('the widest span exceeds the mean', spanList[0].reports, meanSpan(model, lastQ));
checkAbove('mean span is positive', meanSpan(model, lastQ), 0);
checkAbove('critical roles found', criticalRoles(model, lastQ).length, 0);
check('coverage totals match the critical roles',
  successionCoverage(model, lastQ).total, criticalRoles(model, lastQ).length);
checkAbove('the org is more than one layer deep', reportingDepth(model, lastQ), 1);

// P213 (Vincent Chua Boon Hock) carries two live assignment records that
// disagree on who it reports to — ingest.ts flags exactly this as a
// "conflict" DataIssue and declines to pick a side. structure.ts must pick
// one, on stated confidence rather than row order: P202 is recorded at
// confidence "high", P002 at "low". Checking the resolved value alone would
// not catch a regression to row order, because in this file P202 also
// happens to be listed first — so this check reverses the two records'
// order before asserting: a confidence-based choice survives that; a
// row-order choice would flip the report from P202 to P002.
const p213 = model.positions.get('P213');
p213.assignmentIds.reverse();
check('P213 reports to the high-confidence record (P202) even with its two conflicting rows reordered',
  spans(model, lastQ).find((s) => s.positionId === 'P202')?.reports, 2);
p213.assignmentIds.reverse();

check('six cross-division transfers',
  moves(model, all).filter((mv) => mv.kind === 'transfer').length, 6);
check('flows are drawn from transfers only',
  divisionFlows(model, all).reduce((n, f) => n + f.count, 0), 6);
check('a flow never starts and ends in the same division',
  divisionFlows(model, all).filter((f) => f.from === f.to).length, 0);
checkAbove('mobility rate is positive', mobilityRate(model, all).rate, 0);
check('every transfer is counted once as produced and once as received',
  netFlow(model, all).reduce((n, d) => n + d.produced, 0),
  netFlow(model, all).reduce((n, d) => n + d.received, 0));

check('every candidate carries its three checks',
  progressionCandidates(model).every((c) => c.checks.length === 3), true);
check('a candidate only signals when every check is met',
  progressionCandidates(model).every((c) => c.checks.every((k) => k.met)), true);
check('an unknown person yields nothing', progressionFor(model, 'NOBODY'), null);
// Both of these can fail: stagnation is defined as one seat, never left,
// three years or more, and each clause is asserted against the real records.
check('everyone flagged as stagnating holds exactly one seat',
  stagnation(model).every((s) => model.people.get(s.personId).assignmentIds.length === 1), true);
check('everyone flagged as stagnating has at least three years',
  stagnation(model).every((s) => s.years >= 3), true);

const RANK_ORDER = { attention: 0, review: 1, positive: 2 };
const sig = signals(model, all);

checkAbove('signals are produced', sig.length, 0);
check('every signal carries a basis', sig.every((s) => s.basis.length > 0), true);
check('every signal carries evidence', sig.every((s) => s.evidence.length > 0), true);
// Genuinely sorted: every neighbour pair is in non-decreasing severity rank,
// so a positive can never outrank something needing attention.
check('signals are ordered by severity',
  sig.every((s, i) => i === 0 || RANK_ORDER[sig[i - 1].severity] <= RANK_ORDER[s.severity]), true);
check('an empty model yields no signals and does not throw',
  signals({ ...model, people: new Map(), positions: new Map(), assignments: new Map(), lineage: new Map() }, all).length,
  0);

console.log('\n=== SIGNALS ===');
for (const s of sig) {
  console.log(`[${s.severity.toUpperCase()}] ${s.title}`);
  console.log(`   ${s.statement}`);
  for (const e of s.evidence) console.log(`   • ${e.label}: ${e.value}`);
  console.log(`   basis: ${s.basis}`);
  console.log(`   → ${s.action.label}\n`);
}


console.log('\n=== PERSON ANALYSIS ===');

const roster = analysablePeople(model);
check('every person in the records is analysable', roster.length, model.people.size);
// The picker puts people currently in a seat first. Asserted as a partition
// rather than by index, so it holds whatever the dataset's mix happens to be.
check('the roster lists seated people before departed ones',
  roster.every((p, i) => i === 0 || Number(roster[i - 1].inSeat) >= Number(p.inSeat)), true);
check('an unknown person yields nothing', personAnalysis(model, 'NOBODY', all), null);

const everyone = [...model.people.keys()].map((id) => personAnalysis(model, id, all));
check('every record produces an analysis', everyone.every(Boolean), true);
check('every person-level signal carries a basis and evidence',
  everyone.every((a) => a.signals.every((s) => s.basis.length > 0 && s.evidence.length > 0)), true);
check('person-level signals are ordered by severity',
  everyone.every((a) => a.signals.every(
    (s, i) => i === 0 || RANK_ORDER[a.signals[i - 1].severity] <= RANK_ORDER[s.severity])), true);

// The rule that matters most: a person is raised for progression review only
// when all three checks hold. Asserted in both directions against the same
// source of truth the general page uses, so the two scopes cannot drift.
check('a progression signal appears exactly when all three checks are met',
  everyone.every((a) => {
    const raised = a.signals.some((s) => s.id === 'person-progression');
    return raised === Boolean(progressionFor(model, a.personId)?.signal);
  }), true);

check('the moves shown for a person are all theirs',
  everyone.every((a) => a.moves.every((mv) => mv.personId === a.personId)), true);
check('a person flagged as not moving has no moves on record',
  everyone.every((a) => !a.signals.some((s) => s.id === 'person-stagnation') || a.moves.length === 0), true);

// A closed record has no progression checks: the rule is about time left in a
// seat, and there is none. It must still analyse rather than throw.
const departed = roster.find((p) => !p.inSeat);
const closed = personAnalysis(model, departed.id, all);
check('a departed record still analyses', Boolean(closed), true);
check('a departed record carries no progression checks', closed.progression, null);
check('a departed record is not raised for progression',
  closed.signals.some((s) => s.id === 'person-progression'), false);

const withSignals = everyone.filter((a) => a.signals.length > 0)
  .sort((a, b) => b.signals.length - a.signals.length);
for (const a of withSignals.slice(0, 3)) {
  console.log(`${a.name} — ${a.title}, ${a.division}`);
  for (const s of a.signals) console.log(`   [${s.severity.toUpperCase()}] ${s.title}`);
}


console.log('\n=== CHARTS ===');

const charted = sig.filter((s) => s.chart);
checkAbove('detectors produce charts', charted.length, 0);
check('every chart carries a caption and a unit',
  charted.every((s) => s.chart.caption.length > 0 && s.chart.unit.length > 0), true);
check('every chart carries at least one point',
  charted.every((s) => s.chart.series.length > 0 && s.chart.series.every((se) => se.points.length > 0)), true);
check('bar charts carry exactly one series',
  charted.filter((s) => s.chart.kind === 'bar').every((s) => s.chart.series.length === 1), true);
// Two lines on one axis only mean anything if they are sampled at the same
// points. An unequal pair would draw a divergence that is not in the data.
check('every series on a line chart is sampled at the same points',
  charted.filter((s) => s.chart.kind === 'line')
    .every((s) => new Set(s.chart.series.map((se) => se.points.length)).size === 1), true);
check('no chart value is missing or infinite',
  charted.every((s) => s.chart.series.every((se) => se.points.every((pt) => Number.isFinite(pt.value)))), true);
check('a reference line is always a real number',
  charted.every((s) => !s.chart.reference || Number.isFinite(s.chart.reference.value)), true);
// Emphasis is the only thing colour does on these plots, so two emphasised
// bars would be two subjects and therefore no subject.
check('exactly one bar per organisational chart is emphasised, or none',
  charted.every((s) => s.chart.series.every((se) => se.points.filter((pt) => pt.emphasis).length <= 1)), true);

// The chart has to plot what the sentence claims. This checks the two against
// each other rather than trusting that they were written from the same source.
const retentionSignal = sig.find((s) => s.id === 'retention');
if (retentionSignal) {
  const worstBar = retentionSignal.chart.series[0].points.find((pt) => pt.emphasis);
  check('the emphasised bar is the department the statement names',
    retentionSignal.statement.startsWith(worstBar.label), true);
  check('the emphasised bar is the tallest one',
    retentionSignal.chart.series[0].points.every((pt) => pt.value <= worstBar.value), true);
}

const spanSignal = sig.find((s) => s.id === 'span');
if (spanSignal) {
  check('the span chart is drawn against the organisational average',
    spanSignal.chart.reference.label, 'organisational average');
  check('the emphasised manager carries the most reports',
    spanSignal.chart.series[0].points.every((pt) => pt.value <= spanSignal.chart.series[0].points.find((q) => q.emphasis).value),
    true);
}

// Person-level peer charts must contain the person they are about, however
// long their department is — the cut keeps them in by construction.
const peerCharted = everyone.flatMap((a) =>
  a.signals.filter((s) => ['person-progression', 'person-stagnation'].includes(s.id) && s.chart)
    .map((s) => ({ person: a.personId, chart: s.chart })));
check('a peer chart always contains the person it is about',
  peerCharted.every((c) => c.chart.series[0].points.some((pt) => pt.emphasis)), true);
check('every person-level chart carries a caption',
  everyone.every((a) => a.signals.every((s) => !s.chart || s.chart.caption.length > 0)), true);

for (const s of charted) {
  const pts = s.chart.series[0].points;
  const peak = Math.max(...s.chart.series.flatMap((se) => se.points.map((pt) => pt.value)));
  console.log(`${s.chart.kind.padEnd(4)} ${String(pts.length).padStart(2)} pts, peak ${String(peak).padStart(3)} ${s.chart.unit.padEnd(15)} ${s.title}`);
}

/* ---------------------------------------------------------------- ORG CHART
 *
 * The chart drills one level at a time rather than expanding in place, so two
 * things must hold that a collapsible tree never needed: every live position
 * has to be reachable by id, and walking upwards from any of them has to
 * terminate at a position with no manager above it.
 *
 * The second is the one worth testing. A spreadsheet can perfectly well
 * describe a reporting loop — A reports to B, B reports to A — and a naive
 * walk up that chain never returns. This is the check that says the interface
 * refuses to hang on bad data.
 */
console.log('\n=== ORG CHART ===');

const chart = buildHierarchy(model, model.window.quarterCount - 1);

const deepest = [...chart.index.values()].reduce(
  (best, node) =>
    pathTo(chart.index, node.position.id).length > pathTo(chart.index, best.position.id).length
      ? node : best,
  [...chart.index.values()][0],
);
const trail = pathTo(chart.index, deepest.position.id);

check('every live position is reachable by id', chart.index.size, chart.liveCount);
check('a path ends at the position it was asked for',
  trail[trail.length - 1].position.id, deepest.position.id);
check('a path begins at a position with nobody above it', trail[0].reportsToPositionId, null);
check('every step of a path reports to the step before it',
  trail.every((node, i) => i === 0 || node.reportsToPositionId === trail[i - 1].position.id), true);
check('a position outside the tree stands alone in its own path',
  chart.orphans.every((o) => pathTo(chart.index, o.position.id).length === 1), true);
check('an id nobody holds has no path', pathTo(chart.index, 'NOT-A-POSITION').length, 0);

const loop = new Map([
  ['A', { position: { id: 'A', title: 'A' }, reportsToPositionId: 'B' }],
  ['B', { position: { id: 'B', title: 'B' }, reportsToPositionId: 'A' }],
]);
check('a reporting loop terminates instead of hanging', pathTo(loop, 'A').length, 2);

console.log(`${chart.roots.length} root(s) · ${chart.orphans.length} outside the tree · ${chart.liveCount} live`);
console.log(`deepest chain, ${trail.length} levels: ${trail.map((n) => n.position.title).join(' > ')}`);

/* ------------------------------------------------------------------ *
 * The glance.
 *
 * A composition bar asserts part-to-whole, so the only thing worth checking
 * hard is that its segments really do sum to the whole it names, and that its
 * buckets agree with the headline metrics rather than telling a second story.
 * ------------------------------------------------------------------ */
console.log('\n=== GLANCE ===');

const og = orgGlance(model, m);

check('the org glance hero is the headcount delta',
  og.hero.value, `+${m.headcountEnd - m.headcountStart}`);
check('the org glance segments sum to the arrival cohort',
  glanceTotal(og), [...model.positions.values()]
    .filter((p) => p.createdAt !== null && p.createdAt >= `${model.window.startYear}-04-01`).length);
check('the "genuinely new" bucket agrees with metrics.genuinelyNewCount',
  og.segments.find((s) => s.step === 0)?.value ?? 0, m.genuinelyNewCount);
check('no segment is empty', og.segments.every((s) => s.value > 0), true);
check('a bar is only drawn when there is something to compare',
  og.segments.length >= 2, true);
check('the pre-existing seats are named, not counted as growth',
  og.footnote.includes(String(model.positions.size - glanceTotal(og))), true);

// Every position must produce a glance whose parts sum to its stated lineage.
const badPosition = [...model.positions.keys()].find((id) => {
  const g = positionGlance(model, id);
  return g.segments.length > 0 && glanceTotal(g) !== Number(g.hero.value);
});
check('every position glance sums to its own version count', badPosition, undefined);

// Same for people: the changes behind the titles must add up.
const badPerson = [...model.people.keys()].find((id) => {
  const g = personGlance(model, id);
  return g.segments.length > 0 && g.whole === null;
});
check('every person glance names the whole its segments are parts of', badPerson, undefined);

check('a person who never moved is told so',
  [...model.people.keys()]
    .map((id) => personGlance(model, id))
    .filter((g) => g.segments.length === 0)
    .every((g) => g.footnote !== null),
  true);

const featured = [...model.people.keys()]
  .map((id) => ({ id, g: personGlance(model, id) }))
  .find(({ g }) => g.footnote === 'Their title changed without them ever moving.');
console.log(featured
  ? `the org moved someone who never moved: ${model.people.get(featured.id).name} — ${featured.g.hero.value} titles`
  : 'nobody in this file had their title changed without moving');

console.log(`org glance: ${og.hero.value} ${og.hero.label} · ${og.hero.detail}`);
for (const s of og.segments) console.log(`  ${String(s.value).padStart(3)}  ${s.label}`);
console.log(`  whole: ${og.whole}`);
console.log(`  foot:  ${og.footnote}`);

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}\n`);
if (failures > 0) process.exitCode = 1;
