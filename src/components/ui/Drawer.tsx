import { useEffect, type ReactNode } from 'react';

/**
 * The detail panel. Everything clickable in the application opens into here,
 * so a reader never loses the view they were reading from.
 */
export function Drawer({
  title, subtitle, onClose, children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="scrim no-print" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-modal="true" aria-label={String(title)}>
        <header className="drawer-head">
          <div className="grow">
            <h2 style={{ fontSize: 'var(--text-head)' }}>{title}</h2>
            {subtitle ? <div className="small muted" style={{ marginTop: 4 }}>{subtitle}</div> : null}
          </div>
          <button className="btn btn-quiet btn-sm no-print" onClick={onClose} aria-label="Close panel">
            Close
          </button>
        </header>
        <div className="drawer-body stack gap-5">{children}</div>
      </aside>
    </>
  );
}
