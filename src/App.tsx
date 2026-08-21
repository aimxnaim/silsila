/**
 * Application shell.
 *
 * Five tabs, one per requirement in the brief. The mapping is deliberate and
 * is documented in docs/BRIEF-MAPPING.md:
 *
 *   Timeline      the two histories on one axis          (requirement 4)
 *   Roles         how a position evolved                 (requirement 2)
 *   People        how a person moved                     (requirement 3)
 *   Data quality  what the records cannot confirm        (requirement 6)
 *   Load data     accept a structured source             (requirement 1)
 *
 * Requirement 5 — present it clearly — is not a tab. It is the whole design.
 */

import { useCallback, useEffect, useState } from 'react';
import { useOrgModel } from './hooks/useOrgModel.ts';
import { Landing } from './components/Landing.tsx';
import { TimelineView } from './components/views/TimelineView.tsx';
import { RolesView } from './components/views/RolesView.tsx';
import { PeopleView } from './components/views/PeopleView.tsx';
import { QualityView } from './components/views/QualityView.tsx';
import { LoadDataView } from './components/views/LoadDataView.tsx';
import { RoleDetail } from './components/views/RoleDetail.tsx';
import { PersonDetail } from './components/views/PersonDetail.tsx';
import { Button, Empty } from './components/ui/primitives.tsx';

type Tab = 'timeline' | 'roles' | 'people' | 'quality' | 'load';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'timeline', label: 'Timeline' },
  { id: 'roles', label: 'Roles' },
  { id: 'people', label: 'People' },
  { id: 'quality', label: 'Data quality' },
  { id: 'load', label: 'Load data' },
];

export function App() {
  const { model, metrics, error, load, loadDemo, resolveIssue, clearError } = useOrgModel();
  const [entered, setEntered] = useState(false);
  const [tab, setTab] = useState<Tab>('timeline');
  const [quarter, setQuarter] = useState(0);

  // Exactly one thing can be open in the detail panel at a time.
  const [selection, setSelection] = useState<
    { kind: 'position' | 'person'; id: string } | null
  >(null);

  const enter = useCallback(() => {
    if (!model) loadDemo();
    setEntered(true);
  }, [model, loadDemo]);

  // Start the scrubber at the end of the window: the most recent quarter is
  // the one a reader is arriving to ask about.
  useEffect(() => {
    if (model) setQuarter(model.window.quarterCount - 1);
  }, [model]);

  const openPosition = useCallback((id: string) => setSelection({ kind: 'position', id }), []);
  const openPerson = useCallback((id: string) => setSelection({ kind: 'person', id }), []);
  const closeDetail = useCallback(() => setSelection(null), []);

  /** Jump from a detail panel back to where the subject sits in time. */
  const showOnTimeline = useCallback((atQuarter: number) => {
    setQuarter(atQuarter);
    setTab('timeline');
    setSelection(null);
  }, []);

  if (!entered) return <Landing onEnter={enter} />;

  return (
    <>
      <header className="appbar no-print">
        <div className="shell appbar-inner">
          <button
            className="wordmark"
            onClick={() => setEntered(false)}
            style={{ background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
            aria-label="Back to the front page"
          >
            <span className="latin">SILSILAH</span>
            <span className="rule" />
            <span className="arabic" lang="ar" dir="rtl">سلسلة</span>
          </button>

          {model ? (
            <span className="badge" title="Where the currently loaded records came from">
              {model.datasetLabel}
            </span>
          ) : null}

          <nav className="tabs" role="tablist" aria-label="Views">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                className="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="shell page">
        {!model ? (
          <div className="card">
            <Empty title="No records loaded">
              Load the demonstration dataset, or drop in a CSV of your own, to
              reconstruct a history.
            </Empty>
            <div className="row gap-3" style={{ justifyContent: 'center' }}>
              <Button variant="primary" onClick={loadDemo}>Use demonstration dataset</Button>
              <Button onClick={() => setTab('load')}>Load a file</Button>
            </div>
          </div>
        ) : tab === 'timeline' ? (
          <TimelineView
            model={model}
            metrics={metrics!}
            quarter={quarter}
            onQuarterChange={setQuarter}
            onOpenPosition={openPosition}
            onOpenPerson={openPerson}
          />
        ) : tab === 'roles' ? (
          <RolesView model={model} onOpenPosition={openPosition} />
        ) : tab === 'people' ? (
          <PeopleView model={model} onOpenPerson={openPerson} />
        ) : tab === 'quality' ? (
          <QualityView
            model={model}
            onResolve={resolveIssue}
            onOpenPosition={openPosition}
            onOpenPerson={openPerson}
          />
        ) : (
          <LoadDataView
            error={error}
            onLoad={load}
            onLoadDemo={loadDemo}
            onClearError={clearError}
            onLoaded={() => setTab('timeline')}
          />
        )}
      </main>

      {model && selection?.kind === 'position' ? (
        <RoleDetail
          model={model}
          positionId={selection.id}
          onClose={closeDetail}
          onOpenPosition={openPosition}
          onOpenPerson={openPerson}
          onShowOnTimeline={showOnTimeline}
        />
      ) : null}

      {model && selection?.kind === 'person' ? (
        <PersonDetail
          model={model}
          personId={selection.id}
          onClose={closeDetail}
          onOpenPosition={openPosition}
          onShowOnTimeline={showOnTimeline}
        />
      ) : null}
    </>
  );
}
