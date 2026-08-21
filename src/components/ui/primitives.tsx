/**
 * The shared vocabulary of the interface.
 *
 * There are deliberately very few of these. The design has one container
 * (a bordered rectangle), one filled element (an ink button), and outlined
 * badges. Everything else is type and space.
 */

import type { ReactNode } from 'react';

/* ---------------------------------------------------------------- Card */

export function Card({
  children, className = '', flush = false, tight = false,
}: {
  children: ReactNode; className?: string; flush?: boolean; tight?: boolean;
}) {
  const mode = flush ? 'card-flush' : tight ? 'card-tight' : '';
  return <section className={`card ${mode} ${className}`.trim()}>{children}</section>;
}

export function CardHead({ title, meta }: { title: ReactNode; meta?: ReactNode }) {
  return (
    <header className="card-head">
      <h3>{title}</h3>
      {meta ? <span className="micro faint">{meta}</span> : null}
    </header>
  );
}

/* --------------------------------------------------------------- Badge */

type BadgeTone = 'default' | 'ink' | 'accent' | 'warn';

export function Badge({ children, tone = 'default' }: { children: ReactNode; tone?: BadgeTone }) {
  const cls = tone === 'default' ? '' : `badge-${tone}`;
  return <span className={`badge ${cls}`.trim()}>{children}</span>;
}

/* -------------------------------------------------------------- Button */

export function Button({
  children, onClick, variant = 'default', small = false, disabled = false, type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'quiet';
  small?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  const variantClass = variant === 'primary' ? 'btn-primary' : variant === 'quiet' ? 'btn-quiet' : '';
  return (
    <button
      type={type}
      className={`btn ${variantClass} ${small ? 'btn-sm' : ''}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- Misc */

export function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="eyebrow">{children}</div>;
}

export function Notice({
  children, tone = 'info',
}: { children: ReactNode; tone?: 'info' | 'error' }) {
  return <div className={`notice notice-${tone}`}>{children}</div>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <h3 style={{ marginBottom: 'var(--s2)' }}>{title}</h3>
      {children ? <p className="small measure" style={{ margin: '0 auto' }}>{children}</p> : null}
    </div>
  );
}

/**
 * One measured input behind a classification, drawn as an outlined track.
 * These are the whole reason a reader can argue with the verdict.
 */
export function SignalBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="signal">
      <span className="small muted">{label}</span>
      <div className="signal-track">
        <div className="signal-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="signal-value">{pct}%</span>
    </div>
  );
}
