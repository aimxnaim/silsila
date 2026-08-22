/**
 * Application shell.
 *
 * Six views, one per requirement in the brief. The mapping is deliberate and
 * is documented in docs/BRIEF-MAPPING.md:
 *
 *   Overview      the dashboard: what the records contain
 *   Org chart     how a position evolved                 (requirement 2)
 *   People        how a person moved                     (requirement 3)
 *   Timeline      the two histories on one axis          (requirement 4)
 *   Data quality  what the records cannot confirm        (requirement 6)
 *   Load data     accept a structured source             (requirement 1)
 *
 * Requirement 5 — present it clearly — is not a view. It is the whole design.
 *
 * The frame is a rail, a breadcrumb and a tab strip around a scrolling canvas,
 * which is the shape of the HR portal this tool is meant to sit beside. Every
 * destination is reachable in one click from anywhere, and the chrome never
 * scrolls away from under the reader.
 *
 * There is no splash screen in front of it. The Overview opens on load with
 * records already in it, because a tool that reconstructs a history should
 * show one before it asks for anything.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useOrgModel } from './hooks/useOrgModel.ts';
import { OverviewView } from './components/views/OverviewView.tsx';
import { TimeChart } from './components/views/TimeChart.tsx';
import { RolesView } from './components/views/RolesView.tsx';
import { PeopleView } from './components/views/PeopleView.tsx';
import { QualityView } from './components/views/QualityView.tsx';
import { LoadDataView } from './components/views/LoadDataView.tsx';
import { RoleDetail } from './components/views/RoleDetail.tsx';
import { PersonDetail } from './components/views/PersonDetail.tsx';
import { DeptView } from './components/views/DeptView.tsx';
import { Button, Empty } from './components/ui/primitives.tsx';

type Tab = 'overview' | 'orgchart' | 'people' | 'timeline' | 'quality' | 'load';

/**
 * Rail glyphs.
 *
 * Drawn rather than imported: six 18px marks do not justify a dependency, and
 * an icon font would be one more thing to load before the first paint.
 */
const ICONS: Record<Tab, JSX.Element> = {
  overview: (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="2" y="2" width="6" height="6" rx="1.5" /><rect x="10" y="2" width="6" height="6" rx="1.5" />
      <rect x="2" y="10" width="6" height="6" rx="1.5" /><rect x="10" y="10" width="6" height="6" rx="1.5" />
    </svg>
  ),
  orgchart: (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="6" y="1.5" width="6" height="4.5" rx="1.2" />
      <rect x="1" y="12" width="6" height="4.5" rx="1.2" /><rect x="11" y="12" width="6" height="4.5" rx="1.2" />
      <path d="M9 6v3M4 12V9h10v3" strokeLinecap="round" />
    </svg>
  ),
  people: (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="7" cy="6" r="2.8" /><path d="M2 15.5c0-2.6 2.2-4.2 5-4.2s5 1.6 5 4.2" strokeLinecap="round" />
      <path d="M12.5 4.2a2.8 2.8 0 0 1 0 5.4M13 11.6c2.1.4 3.5 1.9 3.5 3.9" strokeLinecap="round" />
    </svg>
  ),
  timeline: (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M2 4.5h12" /><path d="M2 9h7" /><path d="M2 13.5h10" />
    </svg>
  ),
  quality: (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M9 1.8l6.2 2.6v4.2c0 3.6-2.5 6.3-6.2 7.6-3.7-1.3-6.2-4-6.2-7.6V4.4z" strokeLinejoin="round" />
      <path d="M9 6.4v3.2" strokeLinecap="round" /><circle cx="9" cy="11.9" r=".95" fill="currentColor" stroke="none" />
    </svg>
  ),
  load: (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11.5V2.5" /><path d="M5.5 6L9 2.5 12.5 6" />
      <path d="M2.5 11.5v3a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-3" />
    </svg>
  ),
};

const TABS: Array<{ id: Tab; label: string; crumb: string }> = [
  { id: 'overview', label: 'Overview', crumb: 'Overview' },
  { id: 'orgchart', label: 'Org chart', crumb: 'Org chart' },
  { id: 'people', label: 'People', crumb: 'All people' },
  { id: 'timeline', label: 'Timeline', crumb: 'Timeline' },
  { id: 'quality', label: 'Data quality', crumb: 'Data quality' },
  { id: 'load', label: 'Load data', crumb: 'Load data' },
];

export function App() {
  const { model, metrics, error, load, loadDemo, resolveIssue, clearError } = useOrgModel();
  const [tab, setTab] = useState<Tab>('overview');
  const [quarter, setQuarter] = useState(0);

  /**
   * Where a person or department page was opened FROM, so its back link can
   * return there. A person reached from the timeline should go back to the
   * timeline, not to a list they never visited.
   */
  const [page, setPage] = useState<
    { kind: 'person' | 'dept'; id: string; from: Tab; fromDept: string | null } | null
  >(null);

  /** The position panel stays a drawer: it is opened from inside other views. */
  const [position, setPosition] = useState<string | null>(null);

  /**
   * The dashboard IS the front door, so there is no click that decides what to
   * read. The demonstration dataset loads once on mount and the reader lands on
   * a populated Overview; loading a file of their own replaces it in place.
   */
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    loadDemo();
  }, [loadDemo]);

  // Start the scrubber at the end of the window: the most recent quarter is
  // the one a reader is arriving to ask about.
  useEffect(() => {
    if (model) setQuarter(model.window.quarterCount - 1);
  }, [model]);

  const openPosition = useCallback((id: string) => setPosition(id), []);
  const closeDetail = useCallback(() => setPosition(null), []);

  const openPerson = useCallback((id: string) => {
    setPosition(null);
    setPage((prev) => ({
      kind: 'person',
      id,
      // Opening a person from a department page must return to that department.
      from: prev?.kind === 'dept' ? tab : (prev?.from ?? tab),
      fromDept: prev?.kind === 'dept' ? prev.id : (prev?.fromDept ?? null),
    }));
  }, [tab]);

  const openDept = useCallback((division: string) => {
    setPosition(null);
    setPage({ kind: 'dept', id: division, from: tab, fromDept: null });
  }, [tab]);

  const closePage = useCallback(() => {
    setPage((prev) => {
      // A person opened from a department steps back to the department first.
      if (prev?.kind === 'person' && prev.fromDept) {
        return { kind: 'dept', id: prev.fromDept, from: prev.from, fromDept: null };
      }
      return null;
    });
  }, []);

  const goTab = useCallback((next: Tab) => {
    setTab(next);
    setPage(null);
    setPosition(null);
  }, []);

  /** Jump from a detail page back to where the subject sits in time. */
  const showOnTimeline = useCallback((atQuarter: number) => {
    setQuarter(atQuarter);
    setTab('timeline');
    setPage(null);
    setPosition(null);
  }, []);

  const tabCrumb = TABS.find((t) => t.id === tab)?.crumb ?? 'Overview';
  const crumb =
    page?.kind === 'person' ? (model?.people.get(page.id)?.name ?? 'Employee record')
    : page?.kind === 'dept' ? page.id
    : tabCrumb;

  const backLabel =
    page?.kind === 'person' && page.fromDept ? `Back to ${page.fromDept}`
    : page?.kind === 'person' ? `Back to ${TABS.find((t) => t.id === page.from)?.crumb ?? 'Overview'}`
    : 'All departments';

  return (
    <div className="frame">
      {/* ---- Left rail ------------------------------------------------- */}
      <nav className="rail no-print" aria-label="Sections">
        <button
          className="rail-logo"
          onClick={() => goTab('overview')}
          title="Back to the overview"
          aria-label="Back to the overview"
        >
          SL
        </button>
        <span className="rail-sep" aria-hidden="true" />

        {TABS.map((t) => (
          <button
            key={t.id}
            className="rail-btn"
            aria-current={tab === t.id}
            aria-label={t.label}
            title={t.label}
            onClick={() => goTab(t.id)}
          >
            {ICONS[t.id]}
          </button>
        ))}

        <span className="rail-spacer" />

        <button
          className="rail-btn"
          title="Print this view"
          aria-label="Print this view"
          onClick={() => window.print()}
        >
          <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
            <path d="M5 6.5V2.2h8v4.3" />
            <path d="M5 12.5H3.2a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1h11.6a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H13" />
            <rect x="5" y="10.5" width="8" height="5.3" rx="1" />
          </svg>
        </button>
      </nav>

      <div className="frame-main">
        {/* ---- Breadcrumb ---------------------------------------------- */}
        <header className="topbar no-print">
          <button className="crumb" onClick={() => goTab('overview')}>Silsilah</button>
          <span className="crumb-sep" aria-hidden="true">/</span>
          <span className="crumb-now">{crumb}</span>

          {model ? (
            <span className="badge" title="Where the currently loaded records came from">
              {model.datasetLabel}
            </span>
          ) : null}

          <span className="grow" />

          <button className="btn btn-primary btn-sm" onClick={() => goTab('load')}>
            Load a spreadsheet
          </button>
        </header>

        {/* ---- Tab strip ------------------------------------------------ */}
        <div className="tabstrip no-print">
          <nav className="tabs" role="tablist" aria-label="Views">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                className="tab"
                aria-selected={tab === t.id}
                onClick={() => goTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* ---- The canvas ----------------------------------------------- */}
        <div className="frame-scroll">
          <main className="page">
            <div className="shell-app">
              {!model ? (
                <div className="card">
                  <Empty title="No records loaded">
                    Load the demonstration dataset, or drop in a CSV of your own, to
                    reconstruct a history.
                  </Empty>
                  <div className="row gap-3" style={{ justifyContent: 'center' }}>
                    <Button variant="primary" onClick={loadDemo}>Use demonstration dataset</Button>
                    <Button onClick={() => goTab('load')}>Load a file</Button>
                  </div>
                </div>
              ) : page?.kind === 'person' ? (
                <PersonDetail
                  model={model}
                  personId={page.id}
                  backLabel={backLabel}
                  onBack={closePage}
                  onOpenPosition={openPosition}
                  onShowOnTimeline={showOnTimeline}
                />
              ) : page?.kind === 'dept' ? (
                <DeptView
                  model={model}
                  division={page.id}
                  onBack={closePage}
                  onOpenPerson={openPerson}
                />
              ) : tab === 'overview' ? (
                <OverviewView
                  model={model}
                  metrics={metrics!}
                  onOpenDept={openDept}
                  onGoToTimeline={() => goTab('timeline')}
                />
              ) : tab === 'timeline' ? (
                <TimeChart
                  model={model}
                  metrics={metrics!}
                  quarter={quarter}
                  onQuarterChange={setQuarter}
                  onOpenPosition={openPosition}
                  onOpenPerson={openPerson}
                />
              ) : tab === 'orgchart' ? (
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
                  onLoaded={() => goTab('timeline')}
                />
              )}
            </div>
          </main>
        </div>
      </div>

      {model && position ? (
        <RoleDetail
          model={model}
          positionId={position}
          onClose={closeDetail}
          onOpenPosition={openPosition}
          onOpenPerson={openPerson}
          onShowOnTimeline={showOnTimeline}
        />
      ) : null}
    </div>
  );
}
