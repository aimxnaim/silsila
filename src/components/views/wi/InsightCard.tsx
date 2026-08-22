/**
 * One finding.
 *
 * The card expands in place rather than navigating: a reader who wants to know
 * WHY should not have to leave the page that told them. Leaving is the CTA,
 * and it is a separate, deliberate act.
 */

import { useState } from 'react';
import type { EvidenceRecord, Signal } from '../../../domain/insights.ts';

const SEVERITY_LABEL: Record<Signal['severity'], string> = {
  attention: 'Attention',
  review: 'Review',
  positive: 'Positive',
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
      <span className="wi-sev">{SEVERITY_LABEL[signal.severity]}</span>
      {signal.thin ? (
        <span className="wi-thin" title="Computed on a small population">thin data</span>
      ) : null}

      <h4>{signal.title}</h4>
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

      <p className="wi-basis">{signal.basis}</p>

      <button className="wi-cta" onClick={() => onAct(signal)}>
        {signal.action.label} &rarr;
      </button>
    </div>
  );
}
