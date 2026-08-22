import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const root = '/Users/mdeyahiawollalom/Documents/silsila/';
const dir = join(root, 'node_modules', '.silsilah-peek');
mkdirSync(dir, { recursive: true });
const entry = join(dir, 'entry.tsx');

writeFileSync(entry, `
import { renderToStaticMarkup } from 'react-dom/server';
import { parseCSV } from '${root}src/domain/csv.ts';
import { ingest } from '${root}src/domain/ingest.ts';
import { classifyLineage } from '${root}src/domain/lineage.ts';
import { metrics } from '${root}src/domain/metrics.ts';
import { DEMO_DATASET_CSV, DEMO_DATASET_LABEL } from '${root}src/data/demoDataset.ts';
import { signals } from '${root}src/domain/insights.ts';
import { rangeFor } from '${root}src/domain/window.ts';
import { InsightCard } from '${root}src/components/views/wi/InsightCard.tsx';

const model = ingest(parseCSV(DEMO_DATASET_CSV), DEMO_DATASET_LABEL);
model.lineage = classifyLineage(model);
const all = rangeFor(model, 'all');
const noop = () => {};

for (const s of signals(model, all).slice(0, 2)) {
  const html = renderToStaticMarkup(<InsightCard signal={s} onOpenRecord={noop} onAct={noop} />);
  console.log('\\n' + '='.repeat(70));
  console.log(html
    .replace(/<i [^>]*width: ?([\\d.]+)%[^>]*>/g, (m, w) => '[' + '#'.repeat(Math.round(w / 4)) + ']')
    .replace(/<[^>]+>/g, '\\n')
    .split('\\n').map((l) => l.trim()).filter(Boolean).join('\\n'));
}
`);

await build({ entryPoints: [entry], bundle: true, outfile: join(dir, 'b.mjs'), format: 'esm',
  platform: 'node', jsx: 'automatic', loader: { '.ts': 'ts', '.tsx': 'tsx' },
  external: ['react', 'react-dom', 'react-dom/server', 'react/jsx-runtime'], logLevel: 'error' });
await import(`file://${join(dir, 'b.mjs')}`);
