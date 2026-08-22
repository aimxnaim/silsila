/**
 * Does this reader want motion?
 *
 * The stylesheet already flattens CSS animation for anyone who asks for less
 * of it, but the analysis sequence is driven from JavaScript — a staged reveal
 * and a typed sentence are timers, not keyframes, and no media query can reach
 * them. So the timers ask too, and skip straight to the finished state.
 */

import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(QUERY).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(QUERY);
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return reduced;
}
