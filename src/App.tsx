/**
 * Application shell.
 *
 * Five views, mapped to the brief. The mapping is deliberate and is documented
 * in docs/BRIEF-MAPPING.md:
 *
 *   Overview      the dashboard: what the records contain
 *   Org chart     how a position evolved                 (requirement 2)
 *   People        how a person moved                     (requirement 3)
 *   Timeline      the two histories on one axis          (requirement 4)
 *   Load data     accept a structured source             (requirement 1)
 *
 * Requirement 5 — present it clearly — is not a view. It is the whole design.
 *
 * Feature Analysis sits beside those six rather than among them. The six show
 * what the records contain; analysis interprets them, and interpretation is a
 * thing a reader should choose rather than land in. It is entered from a
 * button on the overview, keeps a rail button so it stays one click away, and
 * takes no place in the tab strip.
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOrgModel } from './hooks/useOrgModel.ts';
import { OverviewView } from './components/views/OverviewView.tsx';
import { AnalysisView } from './components/views/AnalysisView.tsx';
import type { AnalysisScope } from './components/views/AnalysisView.tsx';
import type { PresetId } from './domain/window.ts';
import type { AreaId } from './domain/insights.ts';
import { TimeChart } from './components/views/TimeChart.tsx';
import { RolesView } from './components/views/RolesView.tsx';
import { PeopleView } from './components/views/PeopleView.tsx';
import { LoadDataView } from './components/views/LoadDataView.tsx';
import { RoleDetail } from './components/views/RoleDetail.tsx';
import { PersonDetail } from './components/views/PersonDetail.tsx';
import { DeptView } from './components/views/DeptView.tsx';
import { Button, Empty } from './components/ui/primitives.tsx';
import { registerDivisions } from './components/ui/vocabulary.tsx';

type Tab = 'overview' | 'analysis' | 'orgchart' | 'people' | 'timeline' | 'load';

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
  analysis: (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
      <circle cx="7.8" cy="7.8" r="4.9" />
      <path d="M11.4 11.4L15.6 15.6" />
      <path d="M5.8 8.7v1.6M7.8 6.5v3.8M9.8 7.9v2.4" />
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
  load: (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11.5V2.5" /><path d="M5.5 6L9 2.5 12.5 6" />
      <path d="M2.5 11.5v3a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-3" />
    </svg>
  ),
};

/**
 * The tab strip. Feature Analysis is deliberately absent from it: it is an act
 * the reader chooses from the overview, not a peer destination sitting beside
 * the raw views. It keeps a rail button so it stays one click away once they
 * know it is there.
 */
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'orgchart', label: 'Org chart' },
  { id: 'people', label: 'People' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'load', label: 'Load data' },
];

const CRUMB: Record<Tab, string> = {
  overview: 'Company overview',
  analysis: 'Feature Analysis',
  orgchart: 'Org chart',
  people: 'All people',
  timeline: 'Timeline',
  load: 'Load data',
};

export function App() {
  const { model, metrics, error, load, loadDemo, clearError } = useOrgModel();
  const [tab, setTab] = useState<Tab>('overview');
  const [preset, setPreset] = useState<PresetId>('all');
  const [quarter, setQuarter] = useState(0);

  /**
   * Feature Analysis state, held here rather than inside the view so that
   * leaving for a person's record and coming back does not silently reset the
   * question the reader was asking.
   */
  const [scope, setScope] = useState<AnalysisScope>('general');
  const [subject, setSubject] = useState<string | null>(null);

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
   * The overview IS the front door, so there is no click that decides what to
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

  /**
   * Deal each department its hue as soon as a model exists, and before any
   * view renders — during render rather than in an effect, because assigning
   * afterwards would repaint every card, chip and chart bar one frame later.
   * The call is idempotent and cheap: it no-ops unless the divisions changed.
   */
  useMemo(() => {
    if (!model) return;
    registerDivisions([...model.positions.values()].map((p) => p.division));
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

  /**
   * Where each intelligence area sends the reader. The areas are questions,
   * not destinations, so each maps onto the view that already answers it
   * rather than a new page that would only restate the card.
   */
  const openArea = useCallback((id: AreaId) => {
    if (id === 'progression' || id === 'retention' || id === 'mobility') goTab('people');
    else if (id === 'succession' || id === 'structure') goTab('orgchart');
    else goTab('timeline');
  }, [goTab]);

  const tabCrumb = CRUMB[tab];
  const crumb =
    page?.kind === 'person' ? (model?.people.get(page.id)?.name ?? 'Employee record')
    : page?.kind === 'dept' ? page.id
    : tabCrumb;

  const backLabel =
    page?.kind === 'person' && page.fromDept ? `Back to ${page.fromDept}`
    : page?.kind === 'person' ? `Back to ${CRUMB[page.from]}`
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

        {/* Not a tab, but reachable from anywhere once the reader knows it exists. */}
        <span className="rail-sep" aria-hidden="true" />
        <button
          className="rail-btn"
          aria-current={tab === 'analysis'}
          aria-label="Feature Analysis"
          title="Feature Analysis"
          onClick={() => goTab('analysis')}
        >
          {ICONS.analysis}
        </button>

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
                  onAnalyse={() => goTab('analysis')}
                />
              ) : tab === 'analysis' ? (
                <AnalysisView
                  model={model}
                  metrics={metrics!}
                  preset={preset}
                  onPresetChange={setPreset}
                  scope={scope}
                  onScopeChange={setScope}
                  personId={subject}
                  onSelectPerson={setSubject}
                  onBack={() => goTab('overview')}
                  onOpenDept={openDept}
                  onOpenPerson={openPerson}
                  onOpenPosition={openPosition}
                  onOpenArea={openArea}
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
