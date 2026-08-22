/**
 * The landing page.
 *
 * Three decisions worth naming:
 *
 * 1. The three numbers are COMPUTED from the demo dataset at load, not typed.
 *    Drop in a different file and the headline changes. A claim on a landing
 *    page that cannot be traced to data is exactly what this product objects
 *    to elsewhere, so hardcoding them here would be incoherent.
 *
 * 2. It is the same design system as the console, one notch looser. The bar,
 *    the cards, the pills and the red are all the ones behind the door; only
 *    the type scale and the whitespace change. A front page in a different
 *    visual language would make the product look like two products.
 *
 * 3. There is one primary action, and no form. A landing page for a tool like
 *    this should get out of the way rather than collect anything.
 */

import { useEffect, useState } from 'react';
import { parseCSV } from '../domain/csv.ts';
import { ingest } from '../domain/ingest.ts';
import { classifyLineage } from '../domain/lineage.ts';
import { metrics } from '../domain/metrics.ts';
import { DEMO_DATASET_CSV, DEMO_DATASET_LABEL } from '../data/demoDataset.ts';
import { Eyebrow } from './ui/primitives.tsx';

interface Preview {
  relabelled: number;
  genuinelyNew: number;
  unconfirmed: number;
  people: number;
  positions: number;
  from: number;
  to: number;
}

function computePreview(): Preview | null {
  // Wrapped: if anything here throws, the page must still render. A broken
  // statistic should never take down the front door.
  try {
    const model = ingest(parseCSV(DEMO_DATASET_CSV), DEMO_DATASET_LABEL);
    model.lineage = classifyLineage(model);
    const m = metrics(model);
    return {
      relabelled: m.renameCount + m.splitCount + m.mergeCount,
      genuinelyNew: m.genuinelyNewCount,
      unconfirmed: m.issueCount + m.succeededCount,
      people: m.peopleCount,
      positions: m.positionCount,
      from: m.headcountStart,
      to: m.headcountEnd,
    };
  } catch {
    return null;
  }
}

export function Landing({ onEnter }: { onEnter: () => void }) {
  const [preview, setPreview] = useState<Preview | null>(null);
  useEffect(() => { setPreview(computePreview()); }, []);

  return (
    <main className="landing">
      <div className="landing-top">
        <div className="shell row spread gap-3 wrap">
          <div className="wordmark">
            <span className="latin">SILSILAH</span>
            <span className="rule" />
            <span className="arabic" lang="ar" dir="rtl">سلسلة</span>
          </div>
          <span className="badge">Prototype · synthetic data</span>
        </div>
      </div>

      <div className="shell landing-body">
        <div className="hero-mark">
          <span className="tile" aria-hidden="true">SL</span>
          <span className="latin">SILSILAH</span>
          <span className="rule" aria-hidden="true" />
          <span className="arabic" lang="ar" dir="rtl">سلسلة</span>
        </div>

        <h1 className="hero-claim">
          Every change,<br />
          <em>in order.</em>
        </h1>

        <p className="hero-sub">
          Roles get renamed. Teams split. People move. Your HR system overwrites all
          of it. Silsilah puts the history back — and shows where a person's story
          meets the structure's.
        </p>

        <div className="hero-cta">
          <button className="btn btn-primary" onClick={onEnter}>Open the demonstration</button>
          <a className="btn" href="#how">How it decides</a>
        </div>

        {preview ? (
          <>
            <div className="stat-strip">
              <div className="stat-cell stat-cell--v">
                <span className="stat-tag">Relabelled</span>
                <span className="stat-value tnum">{preview.relabelled}</span>
                <span className="stat-label">
                  roles renamed, split or merged — not created
                </span>
              </div>
              <div className="stat-cell stat-cell--s">
                <span className="stat-tag">Real growth</span>
                <span className="stat-value tnum">{preview.genuinelyNew}</span>
                <span className="stat-label">genuinely new seats in five years</span>
              </div>
              <div className="stat-cell stat-cell--k">
                <span className="stat-tag">Unconfirmed</span>
                <span className="stat-value tnum">{preview.unconfirmed}</span>
                <span className="stat-label">findings we can&rsquo;t confirm from the records</span>
              </div>
            </div>

            <p className="micro faint" style={{ marginTop: 'var(--s4)' }}>
              Computed at page load from {preview.people} people and {preview.positions}{' '}
              positions. Headcount moved {preview.from} → {preview.to} over the period.
              Nothing on this page is typed by hand.
            </p>
          </>
        ) : null}
      </div>

      <section id="how" className="shell" style={{ paddingBottom: 'var(--s8)' }}>
        <Eyebrow>The idea</Eyebrow>
        <h2 style={{ marginTop: 'var(--s3)', maxWidth: '18ch' }}>
          A rename is not a <em>new role</em>.
        </h2>
        <p className="measure muted" style={{ marginTop: 'var(--s4)', fontSize: 16 }}>
          Every tool on the market records <em style={{ color: 'inherit' }}>that</em> a
          title changed. None of them decides whether it was still the same job.
          Organisations make budget, redundancy and pay-equity decisions on the
          assumption that they know which one happened.
        </p>

        <div className="grid-3" style={{ marginTop: 'var(--s6)' }}>
          {[
            ['Title similarity', 'Overlap coefficient over normalised title tokens, stopwords removed.'],
            ['Date adjacency', 'How cleanly the handover meets, decaying over 180 days.'],
            ['Reporting continuity', 'Whether the manager survived the handover.'],
            ['Level change', 'Whether the grade attached to the seat was altered.'],
          ].map(([title, body]) => (
            <div className="card card-tight" key={title}>
              <h4>{title}</h4>
              <p className="small muted" style={{ marginTop: 'var(--s2)' }}>{body}</p>
            </div>
          ))}
        </div>

        <p className="measure muted small" style={{ marginTop: 'var(--s5)' }}>
          There is no model here and no training data. Four signals are measured from
          the records and blended into a confidence score — and every signal is shown
          on screen beside the verdict, so a reader who disagrees can see exactly
          which input to argue with.
        </p>
      </section>

      <div className="shell landing-foot">
        <p className="micro faint measure">
          <strong>Prototype.</strong> All data is synthetic — shaped like a large
          Malaysian bank so the demonstration reads as familiar, but every person,
          position and document reference was written for this project. Files are
          parsed in your browser and never leave your machine.
        </p>
        <p className="micro faint">DevLeague 2026 · Lab 2</p>
      </div>
    </main>
  );
}
