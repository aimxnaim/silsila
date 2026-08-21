/**
 * The landing page.
 *
 * Two decisions worth naming:
 *
 * 1. The three numbers are COMPUTED from the demo dataset at load, not typed.
 *    Drop in a different file and the headline changes. A claim on a landing
 *    page that cannot be traced to data is exactly what this product objects
 *    to elsewhere, so it would be incoherent to hardcode them here.
 *
 * 2. There is one primary action. A landing page for a tool like this should
 *    get out of the way, not collect anything.
 */

import { useEffect, useState } from 'react';
import { parseCSV } from '../domain/csv.ts';
import { ingest } from '../domain/ingest.ts';
import { classifyLineage } from '../domain/lineage.ts';
import { metrics } from '../domain/metrics.ts';
import { DEMO_DATASET_CSV, DEMO_DATASET_LABEL } from '../data/demoDataset.ts';
import { Button, Eyebrow } from './ui/primitives.tsx';

interface Preview {
  renamed: number;
  genuinelyNew: number;
  unconfirmed: number;
  people: number;
  positions: number;
}

function computePreview(): Preview | null {
  // Wrapped: if anything here fails, the page must still render. A broken
  // statistic should never take down the front door.
  try {
    const model = ingest(parseCSV(DEMO_DATASET_CSV), DEMO_DATASET_LABEL);
    model.lineage = classifyLineage(model);
    const m = metrics(model);
    return {
      renamed: m.renameCount + m.splitCount + m.mergeCount,
      genuinelyNew: m.genuinelyNewCount,
      unconfirmed: m.issueCount + m.succeededCount,
      people: m.peopleCount,
      positions: m.positionCount,
    };
  } catch {
    return null;
  }
}

export function Landing({ onEnter }: { onEnter: () => void }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  useEffect(() => { setPreview(computePreview()); }, []);

  return (
    <main className="shell landing">
      <div className="wordmark">
        <span className="latin">Silsilah</span>
        <span className="arabic" lang="ar" dir="rtl">سلسلة</span>
      </div>

      <h1 className="hero-claim">
        Every change,<br />
        <span className="accent">in order.</span>
      </h1>

      <p className="hero-sub">
        Every HR system stores what is true <em>now</em>. Rename a role and the old
        title is overwritten; history is destroyed by design. Silsilah reconstructs
        it — how a role evolved, how a person moved, and where those two histories
        meet.
      </p>

      <div className="row gap-3 wrap" style={{ marginTop: 'var(--s6)' }}>
        <Button variant="primary" onClick={onEnter}>Open the demonstration</Button>
        <a className="btn" href="#how">How it decides</a>
      </div>

      {preview ? (
        <>
          <div className="stat-strip">
            <div className="stat-cell">
              <div className="stat-value">{preview.renamed}</div>
              <div className="stat-label">
                positions that were <strong>renamed, split or merged</strong> — the work
                continued, the label did not
              </div>
            </div>
            <div className="stat-cell">
              <div className="stat-value">{preview.genuinelyNew}</div>
              <div className="stat-label">
                <strong>genuinely new</strong> seats created during the period. This is
                the growth
              </div>
            </div>
            <div className="stat-cell">
              <div className="stat-value">{preview.unconfirmed}</div>
              <div className="stat-label">
                findings we <strong>cannot confirm</strong> from the records, and refuse
                to guess at
              </div>
            </div>
          </div>

          <p className="micro faint" style={{ marginTop: 'var(--s3)' }}>
            Computed at page load from {preview.people} people and {preview.positions}{' '}
            positions in the demonstration dataset. Nothing on this page is typed by hand.
          </p>
        </>
      ) : null}

      <section id="how" style={{ marginTop: 'var(--s9)' }}>
        <Eyebrow>The idea</Eyebrow>
        <h2 style={{ marginTop: 'var(--s3)', maxWidth: '20ch' }}>
          A rename is not a new role.
        </h2>
        <p className="measure muted" style={{ marginTop: 'var(--s4)' }}>
          Every tool on the market records <em>that</em> a title changed. None of them
          decides whether it was still the same job. Organisations make budget,
          redundancy and pay-equity decisions on the assumption that they know which
          one happened.
        </p>

        <div className="grid-3" style={{ marginTop: 'var(--s6)' }}>
          {[
            ['Title similarity', 'Overlap coefficient over normalised title tokens, stopwords removed.'],
            ['Date adjacency', 'How cleanly the handover meets, decaying over 180 days.'],
            ['Reporting continuity', 'Whether the manager survived the handover.'],
            ['Level change', 'Whether the grade attached to the seat was altered.'],
          ].map(([title, body]) => (
            <div className="card card-tight" key={title}>
              <h3 style={{ fontSize: 'var(--text-body)' }}>{title}</h3>
              <p className="small muted" style={{ marginTop: 'var(--s2)' }}>{body}</p>
            </div>
          ))}
        </div>

        <p className="measure muted small" style={{ marginTop: 'var(--s5)' }}>
          There is no model here and no training data. Four signals are measured from
          the records and blended into a confidence score — and every signal is shown
          on screen beside the verdict, so a reader who disagrees can see exactly which
          input to argue with.
        </p>
      </section>

      <footer style={{ marginTop: 'var(--s9)', paddingTop: 'var(--s5)', borderTop: '1px solid var(--line)' }}>
        <p className="micro faint measure">
          <strong>Prototype.</strong> All data in this build is synthetic. It is shaped
          like a large Malaysian bank so the demonstration is legible to a local
          audience; every person, position and document reference in it was written for
          this project. There is no backend and no account system — files are parsed in
          your browser and never leave your machine.
        </p>
      </footer>
    </main>
  );
}
