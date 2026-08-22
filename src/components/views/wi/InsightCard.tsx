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
 */

import { useState } from 'react';
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

export function InsightCard({
  signal, onOpenRecord, onAct,
}: {
  signal: Signal;
  onOpenRecord: (record: EvidenceRecord) => void;
  onAct: (signal: Signal) => void;
}) {
  const [open, setOpen] = useState(false);
  const records = signal.evidence.flatMap((e) => e.records ?? []);

  return (
    <div className={`wi-signal wi-signal--${signal.severity}`}>
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
      <p className="wi-statement">{signal.statement}</p>

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
