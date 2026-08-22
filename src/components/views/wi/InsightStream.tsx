/**
 * The findings, delivered rather than displayed.
 *
 * The detectors are instant — they run over a few thousand records in the same
 * tick as the render — so the honest thing would be to paint four finished
 * cards at once. That was the previous behaviour, and it read as a static
 * report: four boxes that had always been there, which a reader scrolls past
 * the way they scroll past a dashboard nobody asked for.
 *
 * So the answer arrives instead of appearing. A short working pass names what
 * is being read, skeletons hold the shape the findings will take, and then the
 * cards land one after another with their sentences written out. Nothing here
 * is invented to fill the time: every line of the working pass counts
 * something the detectors actually counted, and the progress rail tracks real
 * cards being revealed, not a timer pretending to be one.
 *
 * The wording stays careful for the same reason the cards carry their own
 * basis line. These findings are rules over records — not a model's opinion —
 * so the panel says "analysis engine", never "AI", and every claim it makes
 * about its own working is a claim that is true.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { EvidenceRecord, Signal } from '../../../domain/insights.ts';
import { useReducedMotion } from '../../../hooks/useReducedMotion.ts';
import { InsightCard } from './InsightCard.tsx';

type Phase = 'working' | 'streaming' | 'done';

/** How long each line of the working pass holds before the next one. */
const STEP_MS = 260;
/** The gap between one finding landing and the next. */
const REVEAL_MS = 220;

/** At most four cards are ever shown, so at most four skeletons stand in. */
const skeletonCount = (n: number) => Math.min(Math.max(n, 1), 4);

/**
 * Drive one pass of the panel.
 *
 * `runKey` is whatever the reader can change to ask a different question — the
 * period, the person. Changing it re-runs the pass; re-rendering for any other
 * reason must not, or a card would rewrite its own sentence every time a
 * parent re-rendered.
 */
function useAnalysisRun(runKey: string, steps: string[], total: number, reduced: boolean) {
  const [phase, setPhase] = useState<Phase>(reduced ? 'done' : 'working');
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState(reduced ? total : 0);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    timers.current.forEach(window.clearTimeout);
    timers.current = [];

    if (reduced) {
      setPhase('done');
      setStep(steps.length - 1);
      setRevealed(total);
      return;
    }

    setPhase('working');
    setStep(0);
    setRevealed(0);

    const at = (ms: number, fn: () => void) => {
      timers.current.push(window.setTimeout(fn, ms));
    };

    steps.forEach((_, i) => { if (i > 0) at(STEP_MS * i, () => setStep(i)); });

    const opened = STEP_MS * steps.length;
    at(opened, () => setPhase('streaming'));
    for (let i = 0; i < total; i += 1) {
      at(opened + REVEAL_MS * i, () => setRevealed(i + 1));
    }
    at(opened + REVEAL_MS * Math.max(total, 1), () => setPhase('done'));

    return () => {
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
    // steps is rebuilt every render by the caller; runKey is what changes the run.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runKey, total, reduced]);

  return { phase, step, revealed };
}

export function InsightStream({
  title, note, steps, signals, empty, runKey, onOpenRecord, onAct,
}: {
  title: string;
  note: string;
  /** What the pass is doing, in order. Each line must describe real work. */
  steps: string[];
  signals: Signal[];
  /** Shown instead of the cards when nothing was raised. */
  empty: React.ReactNode;
  runKey: string;
  onOpenRecord: (record: EvidenceRecord) => void;
  onAct: (signal: Signal) => void;
}) {
  const reduced = useReducedMotion();
  const shown = useMemo(() => signals.slice(0, 4), [signals]);
  const { phase, step, revealed } = useAnalysisRun(runKey, steps, shown.length, reduced);

  const working = phase === 'working';
  const found = signals.length;

  const status = working
    ? steps[step]
    : found === 0
      ? 'No pattern in these records met a detector’s threshold.'
      : `${found} finding${found === 1 ? '' : 's'} raised${found > shown.length ? `, ${shown.length} shown` : ''} — ordered by what to look at first.`;

  // The rail tracks the pass: the working lines, then a step per card landing.
  const progress = working
    ? ((step + 1) / (steps.length + 1)) * 100
    : shown.length === 0
      ? 100
      : (revealed / shown.length) * 100;

  return (
    <section className="ai" data-phase={phase} aria-busy={working}>
      <header className="ai-head">
        <span className={`ai-orb${working ? ' is-working' : ''}`} aria-hidden="true">
          <svg width="17" height="17" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10 1.6l1.6 4.9 4.9 1.6-4.9 1.6L10 14.6 8.4 9.7 3.5 8.1l4.9-1.6z" />
            <path d="M15.8 12.4l.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7z" opacity=".5" />
          </svg>
        </span>

        <div className="ai-head-text">
          <h2 className="ai-title">{title}</h2>
          <p className={`ai-status${working ? ' is-working' : ''}`} aria-live="polite">
            {/* Keyed so each new line remounts and fades in rather than swapping. */}
            <span className="ai-status-line" key={status}>{status}</span>
            {working ? <i className="ai-dots" aria-hidden="true"><b /><b /><b /></i> : null}
          </p>
        </div>

        <span
          className="ai-badge"
          title="Deterministic detectors over the loaded records. Every finding states the rule it used and hands over the records behind it."
        >
          <i aria-hidden="true" />
          Analysis engine
        </span>
      </header>

      <div className="ai-rail" aria-hidden="true">
        <i style={{ width: `${progress}%` }} />
      </div>

      <p className="ai-note">{note}</p>

      {working ? (
        <div className="wi-signals" aria-hidden="true">
          {Array.from({ length: skeletonCount(shown.length) }, (_, i) => (
            <div className="ai-skel" key={i} style={{ '--d': `${i * 80}ms` } as React.CSSProperties}>
              <span className="ai-skel-pill" />
              <span className="ai-skel-line" style={{ width: '72%' }} />
              <span className="ai-skel-plot" />
              <span className="ai-skel-line" style={{ width: '96%' }} />
              <span className="ai-skel-line" style={{ width: '58%' }} />
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="wi-unknown">{empty}</div>
      ) : (
        <div className="wi-signals">
          {shown.slice(0, revealed).map((s) => (
            <InsightCard
              key={s.id}
              signal={s}
              /* The sentence writes itself out only on the pass that revealed it. */
              stream={!reduced}
              onOpenRecord={onOpenRecord}
              onAct={onAct}
            />
          ))}
        </div>
      )}
    </section>
  );
}
