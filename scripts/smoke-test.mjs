/**
 * Renders every view headlessly and fails loudly if any of them throws.
 *
 * A production build succeeding only proves the code compiles. This proves it
 * runs: the model is built from the real demo dataset, then each view is
 * rendered to a string with react-dom/server. Anything that would white-screen
 * a judge shows up here instead.
 *
 * Run:  npm run smoke
 */

import { build } from 'esbuild';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// The bundle must live inside the project so that Node resolves react and
// react-dom from the project's own node_modules.
const root = new URL('..', import.meta.url).pathname;
const dir = join(root, 'node_modules', '.silsilah-smoke');
mkdirSync(dir, { recursive: true });
const entry = join(dir, 'entry.tsx');
const bundle = join(dir, 'bundle.mjs');

writeFileSync(entry, `
import { renderToString } from 'react-dom/server';
import { parseCSV } from '${root}src/domain/csv.ts';
import { ingest } from '${root}src/domain/ingest.ts';
import { classifyLineage } from '${root}src/domain/lineage.ts';
import { metrics } from '${root}src/domain/metrics.ts';
import { DEMO_DATASET_CSV, DEMO_DATASET_LABEL } from '${root}src/data/demoDataset.ts';
import { Landing } from '${root}src/components/Landing.tsx';
import { OverviewView } from '${root}src/components/views/OverviewView.tsx';
import { TimeChart } from '${root}src/components/views/TimeChart.tsx';
import { RolesView } from '${root}src/components/views/RolesView.tsx';
import { PeopleView } from '${root}src/components/views/PeopleView.tsx';
import { QualityView } from '${root}src/components/views/QualityView.tsx';
import { LoadDataView } from '${root}src/components/views/LoadDataView.tsx';
import { RoleDetail } from '${root}src/components/views/RoleDetail.tsx';
import { PersonDetail } from '${root}src/components/views/PersonDetail.tsx';

const model = ingest(parseCSV(DEMO_DATASET_CSV), DEMO_DATASET_LABEL);
model.lineage = classifyLineage(model);
const m = metrics(model);
const noop = () => {};

const cases = [
  ['Landing',      <Landing onEnter={noop} />],
  ['Overview',     <OverviewView model={model} metrics={m} onOpenPosition={noop} onOpenPerson={noop} onGoToOrgChart={noop} />],
  ['TimeChart',    <TimeChart model={model} metrics={m} quarter={12} onQuarterChange={noop} onOpenPosition={noop} onOpenPerson={noop} />],
  ['Roles',        <RolesView model={model} onOpenPosition={noop} />],
  ['People',       <PeopleView model={model} onOpenPerson={noop} />],
  ['Data quality', <QualityView model={model} onResolve={noop} onOpenPosition={noop} onOpenPerson={noop} />],
  ['Load data',    <LoadDataView error={null} onLoad={() => true} onLoadDemo={() => true} onClearError={noop} onLoaded={noop} />],
];

// Every position and every person gets its detail panel rendered. If one of
// 78 positions has a lineage chain that breaks the renderer, we find it here
// rather than when a judge clicks it.
for (const id of model.positions.keys()) {
  cases.push(['RoleDetail ' + id, <RoleDetail model={model} positionId={id} onClose={noop} onOpenPosition={noop} onOpenPerson={noop} onShowOnTimeline={noop} />]);
}
for (const id of model.people.keys()) {
  cases.push(['PersonDetail ' + id, <PersonDetail model={model} personId={id} onClose={noop} onOpenPosition={noop} onShowOnTimeline={noop} />]);
}

let failed = 0;
let bytes = 0;
for (const [name, element] of cases) {
  try {
    const html = renderToString(element);
    bytes += html.length;
    if (html.length < 40) { console.error('EMPTY  ' + name); failed++; }
  } catch (err) {
    console.error('THREW  ' + name + '  ' + err.message);
    failed++;
  }
}

console.log('rendered ' + cases.length + ' views and panels, ' + Math.round(bytes / 1024) + ' kB of markup');
if (failed > 0) { console.error(failed + ' FAILED'); process.exit(1); }
console.log('all clear');
`);

await build({
  entryPoints: [entry],
  bundle: true,
  outfile: bundle,
  format: 'esm',
  platform: 'node',
  jsx: 'automatic',
  loader: { '.ts': 'ts', '.tsx': 'tsx' },
  external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime'],
  logLevel: 'error',
});

await import(`file://${bundle}`);
rmSync(dir, { recursive: true, force: true });
