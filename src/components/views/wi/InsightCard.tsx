/**
 * One finding.
 *
 * The order is deliberate and it changed for a reason: the shape comes first,
 * then the sentence explaining it. A reader who is handed "2 of 4 departures"
 * has to hold four numbers in their head to work out whether that is bad; a
 * reader who is shown one tall bar beside three short ones already knows, and
 * reads the sentence to find out why. Every chart here plots the same figures
 * the sentence quotes — it is the detector's own working, drawn.
 *
 * The card expands in place rather than navigating: a reader who wants to know
 * WHY should not have to leave the page that told them. Leaving is the CTA,
 * and it is a separate, deliberate act.
 *
 * The statement writes itself out when the card lands. That is a real cost —
 * about half a second before the sentence can be read in full — bought for one
 * thing: it puts the reader's eye on the sentence at the moment it is being
 * composed, and a finding that is watched being written is read. The text is
 * in the DOM from the first frame either way, laid out at full size behind the
 * visible portion, so nothing reflows as it fills in and nothing is hidden
 * from a reader who is not watching it happen.
 */

import { useEffect, useRef, useState } from 'react';
import type { EvidenceRecord, Signal } from '../../../domain/insights.ts';
import { SignalChart } from './SignalChart.tsx';

const SEVERITY_LABEL: Record<Signal['severity'], string> = {
  attention: 'Attention',
  review: 'Review',
  positive: 'Positive',
};

/** What the severity actually asks of the reader, in plain words. */
const SEVERITY_MEANING: Record<Signal['severity'], string> = {
  attention: 'Worth looking at first',
  review: 'Worth a look',
  positive: 'An opportunity, not a problem',
};

/** Milliseconds per character. Fast enough to read along with, not watch. */
const CHAR_MS = 9;

/**
 * How much of `text` has been written.
 *
 * Driven off the frame clock rather than an interval per character: a hundred
 * timers per card is a hundred renders, and four cards writing at once would
 * be four hundred. One rAF loop settles the whole sentence in ~60 renders and
 * stops dead when it reaches the end.
 */
function useWrittenLength(text: string, active: boolean): number {
  const [n, setN] = useState(() => (active ? 0 : text.length));
  const frame = useRef(0);

  useEffect(() => {
    if (!active) { setN(text.length); return; }

    setN(0);
    let started = 0;

    const tick = (now: number) => {
      if (!started) started = now;
      const chars = Math.floor((now - started) / CHAR_MS);
      if (chars >= text.length) { setN(text.length); return; }
      setN(chars);
      frame.current = requestAnimationFrame(tick);
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [text, active]);

  return n;
}

export function InsightCard({
  signal, onOpenRecord, onAct, stream = false,
}: {
  signal: Signal;
  onOpenRecord: (record: EvidenceRecord) => void;
  onAct: (signal: Signal) => void;
  /** Write the statement out on arrival rather than painting it whole. */
  stream?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const records = signal.evidence.flatMap((e) => e.records ?? []);

  const written = useWrittenLength(signal.statement, stream);
  const writing = written < signal.statement.length;

  return (
    <div className={`wi-signal wi-signal--${signal.severity} is-landing`}>
      <div className="wi-signal-top">
        <span className="wi-sev" title={SEVERITY_MEANING[signal.severity]}>
          {SEVERITY_LABEL[signal.severity]}
        </span>
        {signal.thin ? (
          <span className="wi-thin" title="Computed on a small population">thin data</span>
        ) : null}
        <span className="wi-sev-meaning">{SEVERITY_MEANING[signal.severity]}</span>
      </div>

      <h4>{signal.title}</h4>

      {signal.chart ? <SignalChart spec={signal.chart} severity={signal.severity} /> : null}

      {/* The summary sits under the picture, because it explains the picture. */}
      <p className={`wi-statement${writing ? ' is-writing' : ''}`}>
        {/* Full text, laid out but unpainted: it holds the height steady. */}
        <span className="wi-written-ghost">{signal.statement}</span>
        <span className="wi-written">
          {writing ? signal.statement.slice(0, written) : signal.statement}
          {writing ? <i className="wi-caret" aria-hidden="true" /> : null}
        </span>
      </p>

      <ul className="wi-ev">
        {signal.evidence.map((e) => (
          <li key={e.label}><span>{e.label}: <b>{e.value}</b></span></li>
        ))}
      </ul>

      {records.length > 0 ? (
        <>
          <button className="wi-cta" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? 'Hide the records' : `Show the ${records.length} records behind this`}
          </button>
          {open ? (
            <ul className="wi-records">
              {records.map((r) => (
                <li key={`${r.kind}-${r.id}`}>
                  <button onClick={() => onOpenRecord(r)}>{r.label}</button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      <p className="wi-basis">
        <b>How this was worked out:</b> {signal.basis}
      </p>

      <button className="wi-cta" onClick={() => onAct(signal)}>
        {signal.action.label} &rarr;
      </button>
    </div>
  );
}
