/**
 * The one thing the overview asks the reader to do.
 *
 * A static card asking to be clicked competes with four figures that are
 * already interesting. This one moves instead: a slow sheen across the panel,
 * a comet running the border of the mark, and three bars that keep working
 * whether or not anyone is watching. The movement is the invitation.
 *
 * Pressing it does not navigate immediately. It arms — the mark spins up, the
 * label becomes a status, a hairline fills across the foot of the card — and
 * hands over about half a second later. That pause is not a fake loading bar
 * dressing up an instant transition: it is the acknowledgement that the click
 * landed, and it makes the analysis read as something that was RUN rather than
 * a page that was opened. Readers who have asked for reduced motion skip it
 * entirely and go straight through.
 */

import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from '../../../hooks/useReducedMotion.ts';

/** Long enough to register as an act, short enough not to feel like waiting. */
const ARM_MS = 460;

export function AnalyseCta({ onAnalyse, records }: {
  onAnalyse: () => void;
  /** How many employee records are about to be read. Shown while arming. */
  records: number;
}) {
  const [running, setRunning] = useState(false);
  const reduced = useReducedMotion();
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const run = () => {
    if (running) return;
    if (reduced) { onAnalyse(); return; }
    setRunning(true);
    timer.current = window.setTimeout(onAnalyse, ARM_MS);
  };

  return (
    <button
      className={`analyse${running ? ' is-running' : ''}`}
      onClick={run}
      aria-busy={running}
    >
      <span className="analyse-mark" aria-hidden="true">
        <span className="analyse-glyph">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="8.6" cy="8.6" r="5.4" />
            <path d="M12.6 12.6L17 17" />
            <path className="analyse-tick analyse-tick--1" d="M6.4 9.6v1.8" />
            <path className="analyse-tick analyse-tick--2" d="M8.6 7.2v4.2" />
            <path className="analyse-tick analyse-tick--3" d="M10.8 8.8v2.6" />
          </svg>
        </span>
        <span className="analyse-spark">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
            <path d="M6 0l1.1 3.4L10.5 4.5 7.1 5.6 6 9 4.9 5.6 1.5 4.5 4.9 3.4z" />
          </svg>
        </span>
      </span>

      <span className="analyse-text">
        <span className="analyse-title">
          Feature Analysis
          <span className="analyse-eq" aria-hidden="true"><i /><i /><i /></span>
        </span>
        <span className="analyse-sub">
          {running
            ? `Reading ${records} employee records for patterns worth an HR conversation…`
            : 'Read these records for patterns worth an HR conversation — across the organisation, or for one person. Every finding shows the rule behind it.'}
        </span>
      </span>

      <span className="analyse-pill">
        {running ? 'Analysing' : 'Run analysis'}
        <span className="analyse-go" aria-hidden="true">&rarr;</span>
      </span>

      <span className="analyse-scan" aria-hidden="true" />
    </button>
  );
}
