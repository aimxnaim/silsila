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
import { divisionFlows, mobilityRate, moves, netFlow } from '../src/domain/mobility.ts';
import { progressionCandidates, progressionFor, stagnation } from '../src/domain/progression.ts';
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

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}\n`);
if (failures > 0) process.exitCode = 1;
