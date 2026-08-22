/**
 * Application shell.
 *
 * Five views, mapped to the brief. The mapping is deliberate and is documented
 * in docs/BRIEF-MAPPING.md:
 *
 *   Overview      what the records contain, and how the
 *                 organisation changed over time         (requirement 4)
 *   Org chart     how a position evolved                 (requirement 2)
 *   Departments   how a person moved                     (requirement 3)
 *   Load data     accept a structured source             (requirement 1)
 *
 * There is no all-people tab. It and the departments index were answering the
 * same question with the same five columns, and only one of them could say
 * which department a name belonged to without the reader already knowing. So
 * the route to a person runs through the department that holds them: pick a
 * department, and its page lists the roles inside it and everyone in them.
 *
 * Requirement 5 — present it clearly — is not a view. It is the whole design.
 *
 * Feature Analysis sits beside those six rather than among them. The six show
 * what the records contain; analysis interprets them, and interpretation is a
 * thing a reader should choose rather than land in. It is entered from a
 * button on the overview, keeps a standing button in the top bar so it stays
 * one click away, and takes no place in the tab strip.
 *
 * The frame is a breadcrumb bar and a tab strip stacked above a scrolling
 * canvas. Navigation lives entirely along the top: the full width belongs to
 * the records, and the chrome never scrolls away from under the reader.
 *
 * There is no splash screen in front of it. The Overview opens on load with
 * records already in it, because a tool that reconstructs a history should
 * show one before it asks for anything.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useOrgModel } from './hooks/useOrgModel.ts';
import { latestActiveQuarter } from './domain/metrics.ts';
import { OverviewView } from './components/views/OverviewView.tsx';
import { AnalysisView } from './components/views/AnalysisView.tsx';
import type { AnalysisScope } from './components/views/AnalysisView.tsx';
import type { PresetId } from './domain/window.ts';
import type { AreaId } from './domain/insights.ts';
import { DepartmentsView } from './components/views/DepartmentsView.tsx';
import { RolesView } from './components/views/RolesView.tsx';
import { LoadDataView } from './components/views/LoadDataView.tsx';
import { RoleDetail } from './components/views/RoleDetail.tsx';
import { PersonDetail } from './components/views/PersonDetail.tsx';
import { DeptView } from './components/views/DeptView.tsx';
import { Button, Empty } from './components/ui/primitives.tsx';
import { registerDivisions } from './components/ui/vocabulary.tsx';

type Tab = 'overview' | 'analysis' | 'orgchart' | 'departments' | 'load';

/**
 * Tab glyphs.
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
  departments: (
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
      <rect x="2" y="6.5" width="6" height="9.5" rx="1.2" />
      <rect x="10" y="2" width="6" height="14" rx="1.2" />
      <path d="M4.2 9.4h1.6M4.2 12.4h1.6M12.2 5h1.6M12.2 8h1.6M12.2 11h1.6" strokeLinecap="round" />
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
 * the raw views. It keeps a button in the top bar so it stays one click away
 * once they know it is there.
 */
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'orgchart', label: 'Org chart' },
  { id: 'departments', label: 'Departments' },
  { id: 'load', label: 'Load data' },
];

const CRUMB: Record<Tab, string> = {
  overview: 'Company overview',
  analysis: 'Feature Analysis',
  orgchart: 'Org chart',
  departments: 'Departments',
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
   * return there. A person reached from the overview should go back to the
   * overview, not to a list they never visited.
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

  // Start on the most recent quarter that has something in it, not the end of
  // the window — see latestActiveQuarter. The history is the front page now,
  // and a front page must not open on an empty ledger.
  useEffect(() => {
    if (model) setQuarter(latestActiveQuarter(model));
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

  /**
   * Every navigation returns the canvas to the top. Without this a reader who
   * scrolls to the bottom of the overview — which is now a long page — and
   * then picks another tab arrives halfway down whatever they picked.
   */
  const toTop = () => document.querySelector('.frame-scroll')?.scrollTo({ top: 0 });

  const openPosition = useCallback((id: string) => setPosition(id), []);
  const closeDetail = useCallback(() => setPosition(null), []);

  const openPerson = useCallback((id: string) => {
    toTop();
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
    toTop();
    setPosition(null);
    setPage({ kind: 'dept', id: division, from: tab, fromDept: null });
  }, [tab]);

  const closePage = useCallback(() => {
    toTop();
    setPage((prev) => {
      // A person opened from a department steps back to the department first.
      if (prev?.kind === 'person' && prev.fromDept) {
        return { kind: 'dept', id: prev.fromDept, from: prev.from, fromDept: null };
      }
      return null;
    });
  }, []);

  const goTab = useCallback((next: Tab) => {
    toTop();
    setTab(next);
    setPage(null);
    setPosition(null);
  }, []);

  /**
   * Jump from a detail panel back to where the subject sits in time.
   *
   * The history is a section of the overview now rather than a tab, so this
   * has to land the reader on the right part of a long page as well as the
   * right quarter. The counter exists to make repeat jumps fire the effect
   * again — the quarter and the tab may both already be what they need to be.
   */
  const [timeJump, setTimeJump] = useState(0);
  const showInTime = useCallback((atQuarter: number) => {
    setQuarter(atQuarter);
    setTab('overview');
    setPage(null);
    setPosition(null);
    setTimeJump((n) => n + 1);
  }, []);

  useEffect(() => {
    if (timeJump === 0) return;
    document.getElementById('how-it-changed')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [timeJump]);

  /**
   * Where each intelligence area sends the reader. The areas are questions,
   * not destinations, so each maps onto the view that already answers it
   * rather than a new page that would only restate the card.
   */
  const openArea = useCallback((id: AreaId) => {
    if (id === 'progression' || id === 'retention' || id === 'mobility') goTab('departments');
    else if (id === 'succession' || id === 'structure') goTab('orgchart');
    else goTab('overview');
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
      {/* ---- Brand, breadcrumb, standing actions ----------------------- */}
      <header className="topbar no-print">
        <button
          className="topbar-logo"
          onClick={() => goTab('overview')}
          title="Back to the overview"
          aria-label="Back to the overview"
        >
          SL
        </button>

        <button className="crumb" onClick={() => goTab('overview')}>Silsilah</button>
        <span className="crumb-sep" aria-hidden="true">/</span>
        <span className="crumb-now">{crumb}</span>

        {model ? (
          <span className="badge" title="Where the currently loaded records came from">
            {model.datasetLabel}
          </span>
        ) : null}

        <span className="grow" />

        {/* Not a tab, but reachable from anywhere once the reader knows it exists. */}
        <button
          className="btn btn-sm topbar-analyse"
          aria-current={tab === 'analysis'}
          /* The word beside the glyph drops out on narrow windows, so the name
             is spelled here rather than left to the label that may not be there. */
          aria-label="Feature Analysis"
          title="Feature Analysis"
          onClick={() => goTab('analysis')}
        >
          {ICONS.analysis}
          <span className="topbar-btn-label">Analysis</span>
        </button>

        <button
          className="btn btn-sm btn-icon"
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

        <button className="btn btn-primary btn-sm" onClick={() => goTab('load')}>
          Load a spreadsheet
        </button>
      </header>

      {/* ---- Tab strip --------------------------------------------------- */}
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
              <span className="tab-icon" aria-hidden="true">{ICONS[t.id]}</span>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ---- The canvas -------------------------------------------------- */}
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
                onShowInTime={showInTime}
              />
            ) : page?.kind === 'dept' ? (
              <DeptView
                model={model}
                division={page.id}
                onBack={closePage}
                onOpenPerson={openPerson}
                onOpenPosition={openPosition}
              />
            ) : tab === 'overview' ? (
              <OverviewView
                model={model}
                metrics={metrics!}
                quarter={quarter}
                onQuarterChange={setQuarter}
                onGoToDepartments={() => goTab('departments')}
                onAnalyse={() => goTab('analysis')}
                onOpenPosition={openPosition}
                onOpenPerson={openPerson}
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
            ) : tab === 'departments' ? (
              <DepartmentsView
                model={model}
                metrics={metrics!}
                onOpenDept={openDept}
              />
            ) : tab === 'orgchart' ? (
              <RolesView model={model} onOpenPosition={openPosition} />
            ) : (
              <LoadDataView
                error={error}
                onLoad={load}
                onLoadDemo={loadDemo}
                onClearError={clearError}
                onLoaded={() => goTab('overview')}
              />
            )}
          </div>
        </main>
      </div>

      {model && position ? (
        <RoleDetail
          model={model}
          positionId={position}
          onClose={closeDetail}
          onOpenPosition={openPosition}
          onOpenPerson={openPerson}
          onShowInTime={showInTime}
        />
      ) : null}
    </div>
  );
}
