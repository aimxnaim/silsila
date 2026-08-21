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
