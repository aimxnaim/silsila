# Workforce Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Overview tab with a Workforce Intelligence landing page that turns the existing role/person/lineage records into explainable HR signals, each traceable to the records that produced it.

**Architecture:** Six new pure domain modules under `src/domain/` compute the figures; a detector layer (`insights.ts`) turns them into a ranked `Signal[]`; a new `WorkforceView` renders them. No new data model — everything derives from the existing `OrgModel`. No backend.

**Tech Stack:** React 18 + TypeScript + Vite. No new dependencies. Verification through the existing `scripts/verify-domain.mjs` harness (Node 22 with `--experimental-strip-types`).

**Spec:** `docs/superpowers/specs/2026-08-22-workforce-intelligence-design.md`

## Global Constraints

- **No new dependencies.** `package.json` dependencies stay `react` + `react-dom`.
- **No invented data.** Every displayed figure derives from the loaded `OrgModel`. Where a field does not exist, render the spec's exact empty-state wording.
- **Proxy rules are printed on screen.** Any figure from a proxy rule renders a `basis` line stating the rule.
- **Counts lead, percentages follow.** Never show a bare rate. Any rate on a denominator below 10 carries `thin: true` and renders a "thin data" marker.
- **No deterministic HR claims.** Permitted: "potentially ready for progression review", "retention signal detected", "management capacity may be stretched", "role proliferation detected", "succession coverage gap", "internal mobility pattern identified". Forbidden: any percentage chance of promotion, any claim a person will leave, any claim a department needs N more staff.
- **Colour does a job.** Use existing tokens only: `--ok-*` healthy, `--wr-*` review, `--brand` attention, `--hatch` unknown. No new palette.
- **Existing files keep their voice.** Every module in `src/domain/` opens with a block comment explaining *why* it exists, not what it does. Match that.
- **British spelling** in all user-facing copy ("organisation", "behaviour"), matching the existing interface.
- Time is quantised to quarters via `toQuarterIndex`. `WINDOW_QUARTERS = 22` (Q1 2021 – Q2 2026).

---

## File Structure

| File | Responsibility |
|---|---|
| `src/domain/window.ts` | Range type, presets, previous-period arithmetic |
| `src/domain/workforce.ts` | Headcount, departures, turnover, vacancies, tenure |
| `src/domain/structure.ts` | Spans, critical roles, succession coverage, depth |
| `src/domain/mobility.ts` | Internal moves, division flows |
| `src/domain/progression.ts` | Per-person progression and stagnation evidence |
| `src/domain/insights.ts` | Detectors → ranked `Signal[]` |
| `src/components/views/WorkforceView.tsx` | The page; composes the sections |
| `src/components/views/wi/InsightCard.tsx` | One signal, expandable to its records |
| `src/components/views/wi/AreaCard.tsx` | One intelligence area panel |
| `src/components/views/wi/RoleTrend.tsx` | Titles-vs-headcount over time |
| `src/components/views/wi/MobilityFlow.tsx` | Division-to-division flows |
| `src/components/views/wi/ChangeLog.tsx` | Recent organisational changes |

Modified: `scripts/verify-domain.mjs`, `scripts/generate-dataset.mjs`, `package.json`, `src/App.tsx`, `src/components/views/DeptView.tsx`, `src/components/views/PersonDetail.tsx`, `src/styles/app.css`.

---

## Task 1: Repair the verification harness

`npm run verify` currently crashes on Node 22 — it imports `.ts` without type stripping. Every later task's tests depend on it, so it is fixed first.

**Files:**
- Modify: `package.json` (scripts block)
- Modify: `scripts/verify-domain.mjs` (append assertion helper + section)

**Interfaces:**
- Consumes: nothing
- Produces: `check(label, actual, expected)` and `checkAbove(label, actual, floor)` in `verify-domain.mjs`; a non-zero exit code when any check fails.

- [ ] **Step 1: Confirm the failure**

Run: `npm run verify`
Expected: FAIL with `ERR_UNKNOWN_FILE_EXTENSION ... ".ts"`

- [ ] **Step 2: Add the type-stripping flag**

In `package.json`, replace the `verify` and `smoke` scripts:

```json
    "verify": "node --experimental-strip-types scripts/verify-domain.mjs",
    "smoke": "node --experimental-strip-types scripts/smoke-test.mjs"
```

- [ ] **Step 3: Verify it runs**

Run: `npm run verify`
Expected: PASS — prints `=== INGEST ===` through `=== HEADLINE ===`, ending `headcount : 44 -> 64`

- [ ] **Step 4: Add the assertion helper**

Append to `scripts/verify-domain.mjs`:

```js
/* ------------------------------------------------------------------ *
 * Assertions.
 *
 * The project has no test runner and does not need one: the domain is
 * pure functions over one model, so the cheapest honest check is to run
 * the pipeline and assert on what comes out. A failure exits non-zero so
 * CI and a human see the same thing.
 * ------------------------------------------------------------------ */
let failures = 0;

export function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : `\n       expected ${JSON.stringify(expected)}\n       actual   ${JSON.stringify(actual)}`}`);
}

export function checkAbove(label, actual, floor) {
  const ok = typeof actual === 'number' && actual > floor;
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label} (${actual} > ${floor})`);
}

console.log('\n=== CHECKS ===');
check('headcount ends at 64', m.headcountEnd, 64);
check('people ingested', model.people.size, 67);
check('data issues found', model.issues.length, 4);

console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}\n`);
if (failures > 0) process.exitCode = 1;
```

- [ ] **Step 5: Run and confirm the checks pass**

Run: `npm run verify`
Expected: PASS — `=== CHECKS ===` shows three `ok` lines and `All checks passed.`

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/verify-domain.mjs
git commit -m "fix: run the verify harness under Node 22 type stripping

The harness imports .ts directly, which Node 22 refuses without
--experimental-strip-types. Adds the flag and an assertion helper so
domain logic has somewhere to be checked."
```

---

## Task 2: Add cross-division transfers to the demo dataset

The dataset has zero cross-division moves, so the mobility section would render empty. Six transfers are added to the generator — not to the generated file, which is marked `GENERATED FILE — do not edit by hand`.

Each transfer closes the origin seat and opens a destination seat in a different division. No departures are created, so turnover stays at 3.

**Files:**
- Modify: `scripts/generate-dataset.mjs`
- Regenerate: `src/data/demoDataset.ts`

**Interfaces:**
- Consumes: `P(...)` and `A(...)` helpers already in the generator
- Produces: positions `P901`–`P906`; six people gain a second assignment span crossing divisions

- [ ] **Step 1: Add the destination positions**

In `scripts/generate-dataset.mjs`, immediately after the `filler` loop (`for (const [id, title, ...] of filler) { P({...}); }`), insert:

```js
/* ------------------------------------------------------------------ *
 * 5. Internal transfers.
 *
 * Six people who crossed a divisional boundary. Without these the
 * mobility view has nothing to draw: every other move in this dataset
 * stays inside its own division, which is itself a finding, but not one
 * a flow diagram can show.
 * ------------------------------------------------------------------ */
P({ id: 'P901', title: 'Platform Product Manager', unit: 'Digital Product', div: 'Group Digital', level: 4, loc: BGS, created: '2023-04-01', reports: 'P009' });
P({ id: 'P902', title: 'Operations Data Lead', unit: 'Payments Operations', div: 'Group Operations', level: 4, loc: KL, created: '2023-10-02', reports: 'P003' });
P({ id: 'P903', title: 'Branch Digital Adoption Lead', unit: 'Branch Operations', div: 'Community Financial Services', level: 4, loc: KL, created: '2024-02-01', reports: 'P004' });
P({ id: 'P904', title: 'Technology Risk Specialist', unit: 'Regulatory Compliance', div: 'Group Risk & Compliance', level: 4, loc: KL, created: '2024-05-02', reports: 'P005' });
P({ id: 'P905', title: 'Technical Recruiter', unit: 'Talent & Rewards', div: 'Group Human Capital', level: 3, loc: KL, created: '2024-09-02', reports: 'P006' });
P({ id: 'P906', title: 'Islamic Digital Product Lead', unit: 'Islamic Product', div: 'Islamic Banking', level: 5, loc: KL, created: '2025-01-06', reports: 'P007' });
```

- [ ] **Step 2: Close the six origin seats**

In the `filler` array, the eighth element of each row is the `closed` date. Change these six rows (the ids are the first element — find each by id):

```js
  ['P511', 'Core Banking Engineer', 'Core Banking Platforms', 'Group Technology', 3, CYB, '2021-01-04', '2023-03-31', 'P002'],
  ['P517', 'Data Engineer', 'Data & Analytics', 'Group Technology', 3, CYB, '2021-09-01', '2023-09-30', 'P002'],
  ['P211', 'Product Designer', 'Digital Product', 'Group Digital', 3, BGS, '2021-05-03', '2024-01-31', 'P009'],
  ['P514', 'Security Operations Analyst', 'Cybersecurity', 'Group Technology', 3, CYB, '2021-01-04', '2024-04-30', 'P002'],
  ['P519', 'QA Automation Engineer', 'Core Banking Platforms', 'Group Technology', 3, CYB, '2021-04-01', '2024-08-31', 'P002'],
  ['P217', 'Growth Analyst', 'Digital Product', 'Group Digital', 3, BGS, '2023-03-01', '2024-12-31', 'P009'],
```

- [ ] **Step 3: Remove the six from the compact list**

These six people are currently declared in the `simple` array (`// -- The wider organisation: one seat each, straightforward histories.`), which gives everyone a single seat. Delete exactly these six rows from it — they are about to get a second seat, so they no longer belong in a list of one-seat histories:

```js
  ['E024', 'Amirul Hakim bin Roslan', 'P511', '2021-01-04'],
  ['E027', 'Izzat Haiqal bin Suhaimi', 'P514', '2021-01-04'],
  ['E030', 'Ng Hui Shan', 'P517', '2021-09-01'],
  ['E032', 'Faiz Iskandar bin Mansor', 'P519', '2021-04-01'],
  ['E033', 'Rachel Teoh Sze Wei', 'P211', '2021-05-03'],
  ['E038', 'Meor Hafiz bin Kamal', 'P217', '2023-03-01'],
```

- [ ] **Step 4: Declare their two-span histories**

Add these `A(...)` calls immediately before the `const simple = [` line:

```js
// -- Internal transfers: six people who crossed a division. ----------------
A('E024', 'Amirul Hakim bin Roslan', [
  ['P511', '2021-01-04', '2023-03-31', 'P002', 'HRIS export, row 511', 'high', null],
  ['P901', '2023-04-01', null, 'P009', 'Internal transfer letter dated 02 Mar 2023', 'high', 'Transferred to Group Digital'],
]);
A('E030', 'Ng Hui Shan', [
  ['P517', '2021-09-01', '2023-09-30', 'P002', 'HRIS export, row 517', 'high', null],
  ['P902', '2023-10-02', null, 'P003', 'Internal transfer letter dated 11 Sep 2023', 'high', 'Transferred to Group Operations'],
]);
A('E033', 'Rachel Teoh Sze Wei', [
  ['P211', '2021-05-03', '2024-01-31', 'P009', 'HRIS export, row 211', 'high', null],
  ['P903', '2024-02-01', null, 'P004', 'Internal transfer letter dated 08 Jan 2024', 'high', 'Transferred to Community Financial Services'],
]);
A('E027', 'Izzat Haiqal bin Suhaimi', [
  ['P514', '2021-01-04', '2024-04-30', 'P002', 'HRIS export, row 514', 'high', null],
  ['P904', '2024-05-02', null, 'P005', 'Internal transfer letter dated 15 Apr 2024', 'high', 'Transferred to Group Risk & Compliance'],
]);
A('E032', 'Faiz Iskandar bin Mansor', [
  ['P519', '2021-04-01', '2024-08-31', 'P002', 'HRIS export, row 519', 'high', null],
  ['P905', '2024-09-02', null, 'P006', 'Internal transfer letter dated 19 Aug 2024', 'high', 'Transferred to Group Human Capital'],
]);
A('E038', 'Meor Hafiz bin Kamal', [
  ['P217', '2023-03-01', '2024-12-31', 'P009', 'HRIS export, row 217b', 'high', null],
  ['P906', '2025-01-06', null, 'P007', 'Internal transfer letter dated 12 Dec 2024', 'high', 'Transferred to Islamic Banking'],
]);
```

- [ ] **Step 5: Regenerate and verify**

Run: `npm run generate:data && npm run verify`
Expected: PASS — `people 67`, all checks still `ok`. Headcount may shift by ±1; if `headcount ends at 64` fails, update that assertion to the new value and note it in the commit message.

- [ ] **Step 6: Confirm six cross-division moves exist**

Run:

```bash
node --experimental-strip-types -e "
import('./src/domain/csv.ts').then(async ({parseCSV})=>{
  const {ingest}=await import('./src/domain/ingest.ts');
  const {DEMO_DATASET_CSV,DEMO_DATASET_LABEL}=await import('./src/data/demoDataset.ts');
  const m=ingest(parseCSV(DEMO_DATASET_CSV),DEMO_DATASET_LABEL);
  let n=0;
  for(const p of m.people.values()){
    const a=p.assignmentIds.map(i=>m.assignments.get(i));
    for(let k=1;k<a.length;k++){
      const x=m.positions.get(a[k-1].positionId), y=m.positions.get(a[k].positionId);
      if(x&&y&&x.division!==y.division){n++;console.log(p.name,':',x.division,'->',y.division);}
    }
  }
  console.log('cross-division moves:',n);
});"
```

Expected: `cross-division moves: 6`

- [ ] **Step 7: Commit**

```bash
git add scripts/generate-dataset.mjs src/data/demoDataset.ts
git commit -m "data: add six cross-division transfers to the demo dataset

Every move in the dataset stayed inside its own division, so the
mobility view had no flows to draw. These six cross a boundary; none
of them creates a departure, so turnover is unchanged."
```

---

## Task 3: `window.ts` — the time range

**Files:**
- Create: `src/domain/window.ts`
- Modify: `scripts/verify-domain.mjs`

**Interfaces:**
- Consumes: `OrgModel` from `types.ts`; `toQuarterIndex`, `quarterLabel` from `dates.ts`
- Produces:
  - `type PresetId = '12m' | '2y' | '3y' | 'all'`
  - `interface Range { from: number; to: number; quarters: number; label: string }`
  - `PRESETS: Array<{ id: PresetId; label: string }>`
  - `rangeFor(model: OrgModel, id: PresetId): Range`
  - `previousRange(model: OrgModel, r: Range): Range | null`
  - `recordsCurrentTo(model: OrgModel): string | null`

- [ ] **Step 1: Write the failing checks**

Append to the `=== CHECKS ===` section of `scripts/verify-domain.mjs`, above the summary lines:

Add this to the **static import block at the top of the file**, beside the existing `import` lines:

```js
import { PRESETS, previousRange, rangeFor, recordsCurrentTo } from '../src/domain/window.ts';
```

Then add the checks themselves:

```js
check('four presets offered', PRESETS.length, 4);
check('12m range spans 4 quarters', rangeFor(model, '12m').quarters, 4);
check('all-time starts at zero', rangeFor(model, 'all').from, 0);
check('previous of 12m sits directly before it', previousRange(model, rangeFor(model, '12m')).to, rangeFor(model, '12m').from - 1);
check('records current to the latest date on file', recordsCurrentTo(model), '2025-04-01');
```

**Every later task adds its imports the same way** — a static `import` at the top of the file, never `await import`. The harness is a plain ES module and top-level await would work, but the file's existing style is static imports and mixing the two makes the check block harder to read.

- [ ] **Step 2: Run to verify it fails**

Run: `npm run verify`
Expected: FAIL — `Cannot find module .../src/domain/window.ts`

- [ ] **Step 3: Write the module**

Create `src/domain/window.ts`:

```ts
/**
 * The reporting period.
 *
 * Every figure on the intelligence page is computed inside a window, and the
 * window is stated on screen rather than assumed. The label says "of records"
 * because the dataset's present is not today's date: records here end in 2025
 * while the wall clock says otherwise, and a control that quietly implied
 * "the last twelve months" would be the exact class of misreading this product
 * exists to correct.
 */

import type { OrgModel } from './types.ts';
import { quarterLabel } from './dates.ts';

export type PresetId = '12m' | '2y' | '3y' | 'all';

export interface Range {
  /** Inclusive quarter index the period opens at. */
  from: number;
  /** Inclusive quarter index the period closes at. */
  to: number;
  quarters: number;
  /** Rendered on screen, e.g. "Q3 2025 – Q2 2026". */
  label: string;
}

export const PRESETS: Array<{ id: PresetId; label: string }> = [
  { id: '12m', label: 'Last 12 months of records' },
  { id: '2y', label: 'Last 2 years of records' },
  { id: '3y', label: 'Last 3 years of records' },
  { id: 'all', label: 'All time' },
];

const QUARTERS: Record<PresetId, number | null> = { '12m': 4, '2y': 8, '3y': 12, all: null };

function build(from: number, to: number): Range {
  return {
    from,
    to,
    quarters: to - from + 1,
    label: from === to ? quarterLabel(from) : `${quarterLabel(from)} – ${quarterLabel(to)}`,
  };
}

export function rangeFor(model: OrgModel, id: PresetId): Range {
  const last = model.window.quarterCount - 1;
  const want = QUARTERS[id];
  const from = want === null ? 0 : Math.max(0, last - want + 1);
  return build(from, last);
}

/**
 * The equal-length period immediately before this one. Null when the records
 * do not reach back far enough — in which case no comparison is drawn at all,
 * rather than one against a half-empty period.
 */
export function previousRange(model: OrgModel, r: Range): Range | null {
  const to = r.from - 1;
  const from = to - r.quarters + 1;
  if (from < 0) return null;
  return build(from, to);
}

/** The latest date any record mentions. Shown as "records current to". */
export function recordsCurrentTo(model: OrgModel): string | null {
  let latest: string | null = null;
  const consider = (d: string | null | undefined) => {
    if (d && (!latest || d > latest)) latest = d;
  };
  for (const a of model.assignments.values()) {
    consider(a.startDate);
    consider(a.endDate);
  }
  for (const p of model.positions.values()) {
    consider(p.createdAt);
    consider(p.closedAt);
  }
  return latest;
}

/** True when a quarter index falls inside the range. */
export function inRange(range: Range, quarter: number | null): boolean {
  return quarter !== null && quarter >= range.from && quarter <= range.to;
}
```

Note the import list: `toQuarterIndex` is not used by this module — import only `quarterLabel` from `dates.ts`.

- [ ] **Step 4: Run the checks**

Run: `npm run verify`
Expected: PASS — the five window checks read `ok`

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS, no output

- [ ] **Step 6: Commit**

```bash
git add src/domain/window.ts scripts/verify-domain.mjs
git commit -m "feat: add the reporting window

Presets, previous-period arithmetic and a records-current-to date, so
every figure on the intelligence page can state the period it covers."
```

---

## Task 4: `workforce.ts` — headcount, departures, turnover, vacancies

**Files:**
- Create: `src/domain/workforce.ts`
- Modify: `scripts/verify-domain.mjs`

**Interfaces:**
- Consumes: `Range`, `inRange` from `window.ts`; `toQuarterIndex` from `dates.ts`
- Produces:
  - `interface Departure { personId; name; division; date; quarter; lastPositionId; lastTitle }`
  - `departures(model, range): Departure[]`
  - `headcountAt(model, quarter): number`
  - `meanHeadcount(model, range): number`
  - `interface Turnover { departures: Departure[]; mean: number; rate: number | null; thin: boolean }`
  - `turnover(model, range): Turnover`
  - `interface DivisionTurnover { division; departures: Departure[]; people: number; rate: number | null; thin: boolean }`
  - `turnoverByDivision(model, range): DivisionTurnover[]`
  - `interface Vacancy { positionId; title; division; sinceQuarter; quartersOpen }`
  - `vacancies(model, quarter): Vacancy[]`
  - `tenureYears(model, personId): number | null`
  - `timeInRoleYears(model, personId): number | null`
  - `medianTimeInRoleYears(model): number | null`

- [ ] **Step 1: Write the failing checks**

Add to the checks section of `scripts/verify-domain.mjs`:

Static import at the top of the file:

```js
import { departures, headcountAt, medianTimeInRoleYears, turnover, vacancies } from '../src/domain/workforce.ts';
```

The checks:

```js
const all = rangeFor(model, 'all');
check('three departures on record', departures(model, all).length, 3);
check('nobody still in a seat counts as departed',
  departures(model, all).filter((d) => !d.date).length, 0);
checkAbove('some seats are open', vacancies(model, model.window.quarterCount - 1).length, 0);
check('headcount at the last quarter matches metrics',
  headcountAt(model, model.window.quarterCount - 1), m.headcountEnd);
checkAbove('median time in role is positive', medianTimeInRoleYears(model), 0);
check('turnover reports a thin denominator honestly', turnover(model, all).thin, false);
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run verify`
Expected: FAIL — `Cannot find module .../src/domain/workforce.ts`

- [ ] **Step 3: Write the module**

Create `src/domain/workforce.ts`:

```ts
/**
 * Who is here, who left, and what is standing empty.
 *
 * The one judgement in this file is what counts as a departure. An assignment
 * that ends is not a leaver — most of them are people moving seat. A departure
 * is a person whose LAST assignment ends and who never appears again. Getting
 * that wrong would turn every promotion in the dataset into attrition, which
 * is how turnover figures usually end up wrong.
 */

import type { OrgModel } from './types.ts';
import { toQuarterIndex } from './dates.ts';
import type { Range } from './window.ts';
import { inRange } from './window.ts';

/** Below this many people, a rate is too volatile to lead with. */
export const THIN_DENOMINATOR = 10;

export interface Departure {
  personId: string;
  name: string;
  division: string;
  date: string;
  quarter: number;
  lastPositionId: string;
  lastTitle: string;
}

export function departures(model: OrgModel, range: Range): Departure[] {
  const out: Departure[] = [];

  for (const person of model.people.values()) {
    const spans = person.assignmentIds
      .map((id) => model.assignments.get(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
    if (spans.length === 0) continue;

    const last = spans[spans.length - 1];
    if (!last.endDate) continue; // still in a seat

    const quarter = toQuarterIndex(last.endDate);
    if (!inRange(range, quarter)) continue;

    const pos = model.positions.get(last.positionId);
    out.push({
      personId: person.id,
      name: person.name,
      division: pos?.division ?? 'Not recorded',
      date: last.endDate,
      quarter: quarter!,
      lastPositionId: last.positionId,
      lastTitle: pos?.title ?? last.positionId,
    });
  }

  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export function headcountAt(model: OrgModel, quarter: number): number {
  const live = new Set<string>();
  for (const a of model.assignments.values()) {
    const from = toQuarterIndex(a.startDate);
    if (from === null || from > quarter) continue;
    const to = a.endDate ? toQuarterIndex(a.endDate) : model.window.quarterCount - 1;
    if (to !== null && to < quarter) continue;
    live.add(a.personId);
  }
  return live.size;
}

export function meanHeadcount(model: OrgModel, range: Range): number {
  let total = 0;
  for (let q = range.from; q <= range.to; q++) total += headcountAt(model, q);
  return total / Math.max(range.quarters, 1);
}

export interface Turnover {
  departures: Departure[];
  mean: number;
  /** Null when there is no population to divide by. */
  rate: number | null;
  thin: boolean;
}

export function turnover(model: OrgModel, range: Range): Turnover {
  const list = departures(model, range);
  const mean = meanHeadcount(model, range);
  return {
    departures: list,
    mean,
    rate: mean > 0 ? (list.length / mean) * 100 : null,
    thin: mean < THIN_DENOMINATOR,
  };
}

export interface DivisionTurnover {
  division: string;
  departures: Departure[];
  /** Everyone who held a seat here at any point in the range. */
  people: number;
  rate: number | null;
  thin: boolean;
}

export function turnoverByDivision(model: OrgModel, range: Range): DivisionTurnover[] {
  const everyone = new Map<string, Set<string>>();

  for (const pos of model.positions.values()) {
    for (const id of pos.assignmentIds) {
      const a = model.assignments.get(id);
      if (!a) continue;
      const from = toQuarterIndex(a.startDate);
      const to = a.endDate ? toQuarterIndex(a.endDate) : model.window.quarterCount - 1;
      if (from === null) continue;
      // Overlaps the range at all?
      if (from > range.to || (to !== null && to < range.from)) continue;
      if (!everyone.has(pos.division)) everyone.set(pos.division, new Set());
      everyone.get(pos.division)!.add(a.personId);
    }
  }

  const leavers = new Map<string, Departure[]>();
  for (const d of departures(model, range)) {
    if (!leavers.has(d.division)) leavers.set(d.division, []);
    leavers.get(d.division)!.push(d);
  }

  const out: DivisionTurnover[] = [];
  for (const [division, people] of everyone) {
    const list = leavers.get(division) ?? [];
    out.push({
      division,
      departures: list,
      people: people.size,
      rate: people.size > 0 ? (list.length / people.size) * 100 : null,
      thin: people.size < THIN_DENOMINATOR,
    });
  }

  return out.sort((a, b) => b.departures.length - a.departures.length || a.division.localeCompare(b.division));
}

export interface Vacancy {
  positionId: string;
  title: string;
  division: string;
  /** First quarter the seat stood empty. */
  sinceQuarter: number;
  quartersOpen: number;
}

/** A seat that exists, is not closed, and nobody is sitting in. */
export function vacancies(model: OrgModel, quarter: number): Vacancy[] {
  const out: Vacancy[] = [];

  for (const pos of model.positions.values()) {
    const created = toQuarterIndex(pos.createdAt);
    if (created === null || created > quarter) continue;
    const closed = pos.closedAt ? toQuarterIndex(pos.closedAt) : null;
    if (closed !== null && closed < quarter) continue;

    const occupied = pos.assignmentIds.some((id) => {
      const a = model.assignments.get(id);
      if (!a) return false;
      const from = toQuarterIndex(a.startDate);
      if (from === null || from > quarter) return false;
      const to = a.endDate ? toQuarterIndex(a.endDate) : model.window.quarterCount - 1;
      return to === null || to >= quarter;
    });
    if (occupied) continue;

    // Walk back to the quarter it emptied.
    let since = created;
    for (const id of pos.assignmentIds) {
      const a = model.assignments.get(id);
      if (!a?.endDate) continue;
      const ended = toQuarterIndex(a.endDate);
      if (ended !== null && ended < quarter && ended + 1 > since) since = ended + 1;
    }

    out.push({
      positionId: pos.id,
      title: pos.title,
      division: pos.division,
      sinceQuarter: since,
      quartersOpen: Math.max(0, quarter - since + 1),
    });
  }

  return out.sort((a, b) => b.quartersOpen - a.quartersOpen);
}

const DAYS_PER_YEAR = 365.25;

function yearsBetween(from: string, to: string): number {
  return (new Date(to).getTime() - new Date(from).getTime()) / (DAYS_PER_YEAR * 86_400_000);
}

/** How long this person has been with the organisation, in years. */
export function tenureYears(model: OrgModel, personId: string): number | null {
  const person = model.people.get(personId);
  if (!person) return null;
  const spans = person.assignmentIds
    .map((id) => model.assignments.get(id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  if (spans.length === 0) return null;

  const start = spans[0].startDate;
  const last = spans[spans.length - 1];
  const end = last.endDate ?? endOfWindow(model);
  return Math.max(0, yearsBetween(start, end));
}

/** How long in the seat they hold now. */
export function timeInRoleYears(model: OrgModel, personId: string): number | null {
  const person = model.people.get(personId);
  if (!person) return null;
  const spans = person.assignmentIds
    .map((id) => model.assignments.get(id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  const last = spans[spans.length - 1];
  if (!last) return null;
  return Math.max(0, yearsBetween(last.startDate, last.endDate ?? endOfWindow(model)));
}

function endOfWindow(model: OrgModel): string {
  const year = model.window.startYear + Math.floor((model.window.quarterCount - 1) / 4);
  const month = ((model.window.quarterCount - 1) % 4) * 3 + 3;
  return `${year}-${String(month).padStart(2, '0')}-28`;
}

/** The org's median time in current role — the yardstick progression uses. */
export function medianTimeInRoleYears(model: OrgModel): number | null {
  const values: number[] = [];
  for (const person of model.people.values()) {
    const spans = person.assignmentIds
      .map((id) => model.assignments.get(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
    const last = spans[spans.length - 1];
    if (!last || last.endDate) continue; // current holders only
    const v = timeInRoleYears(model, person.id);
    if (v !== null) values.push(v);
  }
  if (values.length === 0) return null;
  values.sort((a, b) => a - b);
  const mid = Math.floor(values.length / 2);
  return values.length % 2 === 0 ? (values[mid - 1] + values[mid]) / 2 : values[mid];
}
```

- [ ] **Step 4: Run the checks**

Run: `npm run verify`
Expected: PASS — six workforce checks read `ok`

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/domain/workforce.ts scripts/verify-domain.mjs
git commit -m "feat: derive headcount, departures, turnover and vacancies

A departure is a person whose last assignment ends and who never
appears again — not merely an assignment that ended, which would count
every promotion as attrition."
```

---

## Task 5: `structure.ts` — spans, critical roles, succession

**Files:**
- Create: `src/domain/structure.ts`
- Modify: `scripts/verify-domain.mjs`

**Interfaces:**
- Consumes: `toQuarterIndex` from `dates.ts`
- Produces:
  - `interface Span { positionId; title; division; holderName; holderPersonId; reports }`
  - `spans(model, quarter): Span[]`
  - `meanSpan(model, quarter): number`
  - `interface Successor { personId; name; positionId; title; level; tenureYears }`
  - `interface CriticalRole { positionId; title; division; level; holderName; holderPersonId; reports; covered; successors: Successor[]; reason }`
  - `criticalRoles(model, quarter): CriticalRole[]`
  - `interface Coverage { total; covered; gaps: CriticalRole[]; rate: number | null }`
  - `successionCoverage(model, quarter): Coverage`
  - `reportingDepth(model, quarter): number`
  - `CRITICAL_BASIS` and `SUCCESSION_BASIS` string constants — the rule text the UI prints

- [ ] **Step 1: Write the failing checks**

Add to the checks section:

Static import at the top of the file:

```js
import { criticalRoles, meanSpan, reportingDepth, spans, successionCoverage } from '../src/domain/structure.ts';
```

The checks:

```js
const lastQ = model.window.quarterCount - 1;
const spanList = spans(model, lastQ);

checkAbove('spans exist', spanList.length, 0);
// Asserts the ordering rule, not a particular seat: the transfers in Task 2
// leave two seats tied at the top, separated only by alphabetical tiebreak.
check('spans come back widest first',
  spanList.every((s, i) => i === 0 || spanList[i - 1].reports >= s.reports), true);
checkAbove('the widest span exceeds the mean', spanList[0].reports, meanSpan(model, lastQ));
checkAbove('mean span is positive', meanSpan(model, lastQ), 0);
checkAbove('critical roles found', criticalRoles(model, lastQ).length, 0);
check('coverage totals match the critical roles',
  successionCoverage(model, lastQ).total, criticalRoles(model, lastQ).length);
checkAbove('the org is more than one layer deep', reportingDepth(model, lastQ), 1);
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run verify`
Expected: FAIL — `Cannot find module .../src/domain/structure.ts`

- [ ] **Step 3: Write the module**

Create `src/domain/structure.ts`:

```ts
/**
 * The shape of the reporting tree, and what it implies.
 *
 * Two of the figures here are proxies, and the interface says so out loud.
 * The records carry no "critical role" flag and no named successor, so both
 * are inferred from structure: a seat matters if work reports through it, and
 * it is covered if somebody close enough below it could step up. Those rules
 * are printed next to the numbers they produce, because a proxy nobody can
 * see the workings of is just an assertion.
 */

import type { OrgModel } from './types.ts';
import { toQuarterIndex } from './dates.ts';
import { tenureYears } from './workforce.ts';

export const CRITICAL_BASIS =
  'Derived: live seats carrying direct reports, or graded 6 and above.';

export const SUCCESSION_BASIS =
  'Derived: covered when a direct report sits within two grades and has two years’ service.';

/** Grades within which a direct report is treated as a plausible successor. */
const SUCCESSOR_GRADE_REACH = 2;
/** Years of service a successor needs before the seat counts as covered. */
const SUCCESSOR_MIN_YEARS = 2;
/** Grade at or above which a seat is critical regardless of reports. */
const SENIOR_GRADE = 6;

interface Holder {
  personId: string;
  name: string;
  startDate: string;
}

/** Who was sitting in each live seat at this quarter, and who they reported to. */
function occupancy(model: OrgModel, quarter: number) {
  const holderOf = new Map<string, Holder>();
  const reportsTo = new Map<string, string>();

  for (const pos of model.positions.values()) {
    const created = toQuarterIndex(pos.createdAt);
    if (created === null || created > quarter) continue;
    const closed = pos.closedAt ? toQuarterIndex(pos.closedAt) : null;
    if (closed !== null && closed < quarter) continue;

    for (const id of pos.assignmentIds) {
      const a = model.assignments.get(id);
      if (!a) continue;
      const from = toQuarterIndex(a.startDate);
      if (from === null || from > quarter) continue;
      const to = a.endDate ? toQuarterIndex(a.endDate) : model.window.quarterCount - 1;
      if (to !== null && to < quarter) continue;

      const person = model.people.get(a.personId);
      if (person) holderOf.set(pos.id, { personId: person.id, name: person.name, startDate: a.startDate });
      if (a.reportsToPositionId) reportsTo.set(pos.id, a.reportsToPositionId);
      break;
    }
  }

  return { holderOf, reportsTo };
}

export interface Span {
  positionId: string;
  title: string;
  division: string;
  holderName: string | null;
  holderPersonId: string | null;
  reports: number;
}

export function spans(model: OrgModel, quarter: number): Span[] {
  const { holderOf, reportsTo } = occupancy(model, quarter);

  const counts = new Map<string, number>();
  for (const parent of reportsTo.values()) counts.set(parent, (counts.get(parent) ?? 0) + 1);

  const out: Span[] = [];
  for (const [positionId, reports] of counts) {
    const pos = model.positions.get(positionId);
    if (!pos) continue;
    const holder = holderOf.get(positionId) ?? null;
    out.push({
      positionId,
      title: pos.title,
      division: pos.division,
      holderName: holder?.name ?? null,
      holderPersonId: holder?.personId ?? null,
      reports,
    });
  }

  return out.sort((a, b) => b.reports - a.reports || a.title.localeCompare(b.title));
}

export function meanSpan(model: OrgModel, quarter: number): number {
  const list = spans(model, quarter);
  if (list.length === 0) return 0;
  return list.reduce((sum, s) => sum + s.reports, 0) / list.length;
}

export interface Successor {
  personId: string;
  name: string;
  positionId: string;
  title: string;
  level: number | null;
  tenureYears: number;
}

export interface CriticalRole {
  positionId: string;
  title: string;
  division: string;
  level: number | null;
  holderName: string | null;
  holderPersonId: string | null;
  reports: number;
  covered: boolean;
  successors: Successor[];
  /** Why this seat qualified, in plain words. */
  reason: string;
}

export function criticalRoles(model: OrgModel, quarter: number): CriticalRole[] {
  const { holderOf, reportsTo } = occupancy(model, quarter);

  const counts = new Map<string, number>();
  const childrenOf = new Map<string, string[]>();
  for (const [child, parent] of reportsTo) {
    counts.set(parent, (counts.get(parent) ?? 0) + 1);
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent)!.push(child);
  }

  const out: CriticalRole[] = [];

  for (const [positionId, holder] of holderOf) {
    const pos = model.positions.get(positionId);
    if (!pos) continue;

    const reports = counts.get(positionId) ?? 0;
    const senior = (pos.level ?? 0) >= SENIOR_GRADE;
    if (reports === 0 && !senior) continue;

    const reason =
      reports > 0 && senior ? `Grade ${pos.level} with ${reports} direct reports`
      : reports > 0 ? `${reports} direct report${reports === 1 ? '' : 's'}`
      : `Grade ${pos.level}`;

    const successors: Successor[] = [];
    for (const childId of childrenOf.get(positionId) ?? []) {
      const childPos = model.positions.get(childId);
      const childHolder = holderOf.get(childId);
      if (!childPos || !childHolder) continue;

      const gap = (pos.level ?? 0) - (childPos.level ?? 0);
      if (gap < 0 || gap > SUCCESSOR_GRADE_REACH) continue;

      // Measured against the end of the window, not the wall clock: every
      // other figure on the page is computed inside the window, and a tenure
      // that kept growing against today's date would disagree with them.
      const years = tenureYears(model, childHolder.personId) ?? 0;
      if (years < SUCCESSOR_MIN_YEARS) continue;

      successors.push({
        personId: childHolder.personId,
        name: childHolder.name,
        positionId: childId,
        title: childPos.title,
        level: childPos.level,
        tenureYears: years,
      });
    }

    out.push({
      positionId,
      title: pos.title,
      division: pos.division,
      level: pos.level,
      holderName: holder.name,
      holderPersonId: holder.personId,
      reports,
      covered: successors.length > 0,
      successors,
      reason,
    });
  }

  return out.sort((a, b) => (b.level ?? 0) - (a.level ?? 0) || b.reports - a.reports);
}

export interface Coverage {
  total: number;
  covered: number;
  gaps: CriticalRole[];
  rate: number | null;
}

export function successionCoverage(model: OrgModel, quarter: number): Coverage {
  const roles = criticalRoles(model, quarter);
  const gaps = roles.filter((r) => !r.covered);
  return {
    total: roles.length,
    covered: roles.length - gaps.length,
    gaps,
    rate: roles.length > 0 ? ((roles.length - gaps.length) / roles.length) * 100 : null,
  };
}

/** Longest chain of reporting lines at this quarter. */
export function reportingDepth(model: OrgModel, quarter: number): number {
  const { reportsTo } = occupancy(model, quarter);

  const depthOf = (id: string, seen: Set<string>): number => {
    if (seen.has(id)) return 0;
    seen.add(id);
    const parent = reportsTo.get(id);
    return parent ? 1 + depthOf(parent, seen) : 1;
  };

  let deepest = 0;
  for (const id of reportsTo.keys()) deepest = Math.max(deepest, depthOf(id, new Set()));
  return deepest;
}
```

- [ ] **Step 4: Run the checks**

Run: `npm run verify`
Expected: PASS — six structure checks read `ok`

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS

```bash
git add src/domain/structure.ts scripts/verify-domain.mjs
git commit -m "feat: derive spans, critical roles and succession coverage

Both critical-role and succession rules are proxies over structure —
the records carry neither flag — so each exports the rule text the
interface prints beside the figure."
```

---

## Task 6: `mobility.ts` — internal movement

**Files:**
- Create: `src/domain/mobility.ts`
- Modify: `scripts/verify-domain.mjs`

**Interfaces:**
- Consumes: `Range`, `inRange` from `window.ts`; `toQuarterIndex` from `dates.ts`
- Produces:
  - `type MoveKind = 'transfer' | 'progression' | 'lateral'`
  - `interface Move { personId; name; date; quarter; fromPositionId; toPositionId; fromTitle; toTitle; fromDivision; toDivision; fromLevel; toLevel; kind }`
  - `moves(model, range): Move[]`
  - `interface Flow { from: string; to: string; count: number; people: Array<{ id: string; name: string }> }`
  - `divisionFlows(model, range): Flow[]`
  - `interface MobilityRate { movers: number; population: number; rate: number | null; thin: boolean }`
  - `mobilityRate(model, range): MobilityRate`

- [ ] **Step 1: Write the failing checks**

Static import at the top of the file:

```js
import { divisionFlows, mobilityRate, moves, netFlow } from '../src/domain/mobility.ts';
```

The checks:

```js
check('six cross-division transfers',
  moves(model, all).filter((mv) => mv.kind === 'transfer').length, 6);
check('flows are drawn from transfers only',
  divisionFlows(model, all).reduce((n, f) => n + f.count, 0), 6);
check('a flow never starts and ends in the same division',
  divisionFlows(model, all).filter((f) => f.from === f.to).length, 0);
checkAbove('mobility rate is positive', mobilityRate(model, all).rate, 0);
check('every transfer is counted once as produced and once as received',
  netFlow(model, all).reduce((n, d) => n + d.produced, 0),
  netFlow(model, all).reduce((n, d) => n + d.received, 0));
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run verify`
Expected: FAIL — `Cannot find module .../src/domain/mobility.ts`

- [ ] **Step 3: Write the module**

Create `src/domain/mobility.ts`:

```ts
/**
 * Movement inside the organisation.
 *
 * A move is the join between two consecutive assignments for one person. What
 * kind of move it was comes from comparing the two seats: a different division
 * is a transfer, a higher grade is progression, anything else is lateral. The
 * distinction matters because an organisation that promotes but never
 * transfers looks identical to one that does both, if you only count moves.
 */

import type { OrgModel } from './types.ts';
import { toQuarterIndex } from './dates.ts';
import type { Range } from './window.ts';
import { inRange } from './window.ts';
import { THIN_DENOMINATOR, meanHeadcount } from './workforce.ts';

export type MoveKind = 'transfer' | 'progression' | 'lateral';

export interface Move {
  personId: string;
  name: string;
  date: string;
  quarter: number;
  fromPositionId: string;
  toPositionId: string;
  fromTitle: string;
  toTitle: string;
  fromDivision: string;
  toDivision: string;
  fromLevel: number | null;
  toLevel: number | null;
  kind: MoveKind;
}

export function moves(model: OrgModel, range: Range): Move[] {
  const out: Move[] = [];

  for (const person of model.people.values()) {
    const spans = person.assignmentIds
      .map((id) => model.assignments.get(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));

    for (let i = 1; i < spans.length; i++) {
      const prev = spans[i - 1];
      const next = spans[i];
      if (prev.positionId === next.positionId) continue;

      const quarter = toQuarterIndex(next.startDate);
      if (!inRange(range, quarter)) continue;

      const from = model.positions.get(prev.positionId);
      const to = model.positions.get(next.positionId);
      if (!from || !to) continue;

      const kind: MoveKind =
        from.division !== to.division ? 'transfer'
        : (to.level ?? 0) > (from.level ?? 0) ? 'progression'
        : 'lateral';

      out.push({
        personId: person.id,
        name: person.name,
        date: next.startDate,
        quarter: quarter!,
        fromPositionId: from.id,
        toPositionId: to.id,
        fromTitle: from.title,
        toTitle: to.title,
        fromDivision: from.division,
        toDivision: to.division,
        fromLevel: from.level,
        toLevel: to.level,
        kind,
      });
    }
  }

  return out.sort((a, b) => b.date.localeCompare(a.date));
}

export interface Flow {
  from: string;
  to: string;
  count: number;
  people: Array<{ id: string; name: string }>;
}

export function divisionFlows(model: OrgModel, range: Range): Flow[] {
  const map = new Map<string, Flow>();

  for (const mv of moves(model, range)) {
    if (mv.kind !== 'transfer') continue;
    const key = `${mv.fromDivision} ${mv.toDivision}`;
    if (!map.has(key)) {
      map.set(key, { from: mv.fromDivision, to: mv.toDivision, count: 0, people: [] });
    }
    const flow = map.get(key)!;
    flow.count++;
    flow.people.push({ id: mv.personId, name: mv.name });
  }

  return [...map.values()].sort((a, b) => b.count - a.count || a.from.localeCompare(b.from));
}

export interface MobilityRate {
  movers: number;
  population: number;
  rate: number | null;
  thin: boolean;
}

export function mobilityRate(model: OrgModel, range: Range): MobilityRate {
  const movers = new Set(moves(model, range).map((mv) => mv.personId)).size;
  const population = meanHeadcount(model, range);
  return {
    movers,
    population,
    rate: population > 0 ? (movers / population) * 100 : null,
    thin: population < THIN_DENOMINATOR,
  };
}

/** Divisions that send more people out than they take in, and the reverse. */
export function netFlow(model: OrgModel, range: Range) {
  const out = new Map<string, { division: string; produced: number; received: number }>();
  const touch = (division: string) => {
    if (!out.has(division)) out.set(division, { division, produced: 0, received: 0 });
    return out.get(division)!;
  };

  for (const flow of divisionFlows(model, range)) {
    touch(flow.from).produced += flow.count;
    touch(flow.to).received += flow.count;
  }

  return [...out.values()].sort(
    (a, b) => b.produced - a.produced || b.received - a.received,
  );
}
```

- [ ] **Step 4: Run the checks**

Run: `npm run verify`
Expected: PASS — four mobility checks read `ok`

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS

```bash
git add src/domain/mobility.ts scripts/verify-domain.mjs
git commit -m "feat: derive internal movement and division flows

Moves are typed as transfer, progression or lateral, because counting
them together hides whether an organisation actually circulates people."
```

---

## Task 7: `progression.ts` — progression and stagnation evidence

**Files:**
- Create: `src/domain/progression.ts`
- Modify: `scripts/verify-domain.mjs`

**Interfaces:**
- Consumes: `timeInRoleYears`, `tenureYears`, `medianTimeInRoleYears` from `workforce.ts`
- Produces:
  - `interface Check { label: string; met: boolean; detail: string }`
  - `interface Progression { personId; name; title; division; level; yearsInRole; yearsService; checks: Check[]; signal: boolean }`
  - `progressionFor(model, personId): Progression | null`
  - `progressionCandidates(model): Progression[]`
  - `interface Stagnation { personId; name; division; title; years }`
  - `stagnation(model): Stagnation[]`
  - `PROGRESSION_BASIS`, `STAGNATION_BASIS` string constants

- [ ] **Step 1: Write the failing checks**

Static import at the top of the file:

```js
import { progressionCandidates, progressionFor, stagnation } from '../src/domain/progression.ts';
```

The checks:

```js
check('every candidate carries its three checks',
  progressionCandidates(model).every((c) => c.checks.length === 3), true);
check('a candidate only signals when every check is met',
  progressionCandidates(model).every((c) => c.checks.every((k) => k.met)), true);
check('an unknown person yields nothing', progressionFor(model, 'NOBODY'), null);
// Both of these can fail: stagnation is defined as one seat, never left,
// three years or more, and each clause is asserted against the real records.
check('everyone flagged as stagnating holds exactly one seat',
  stagnation(model).every((s) => model.people.get(s.personId).assignmentIds.length === 1), true);
check('everyone flagged as stagnating has at least three years',
  stagnation(model).every((s) => s.years >= 3), true);
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run verify`
Expected: FAIL — `Cannot find module .../src/domain/progression.ts`

- [ ] **Step 3: Write the module**

Create `src/domain/progression.ts`:

```ts
/**
 * Who the records suggest is worth a conversation.
 *
 * This file is where the product is easiest to get wrong, so it is the most
 * conservative one here. It never says a person should be promoted and never
 * scores them. It reports three checks against the record — time in seat,
 * a prior step up, and room above them — and only raises a signal when all
 * three hold. The checks travel with the signal so a reader can disagree with
 * any one of them, which is the entire point: this is evidence for a human
 * review, not a decision.
 */

import type { OrgModel } from './types.ts';
import { medianTimeInRoleYears, tenureYears, timeInRoleYears } from './workforce.ts';

export const PROGRESSION_BASIS =
  'Derived: time in seat at or above the organisational median, at least one previous step up in grade, and a higher grade existing in their division.';

export const STAGNATION_BASIS =
  'Derived: three or more years of service with no recorded change of seat.';

/** Years of service after which no movement is worth noticing. */
const STAGNATION_YEARS = 3;

export interface Check {
  label: string;
  met: boolean;
  detail: string;
}

export interface Progression {
  personId: string;
  name: string;
  title: string;
  division: string;
  level: number | null;
  yearsInRole: number;
  yearsService: number;
  checks: Check[];
  /** True only when every check is met. */
  signal: boolean;
}

function ceilingOf(model: OrgModel, division: string): number {
  let top = 0;
  for (const pos of model.positions.values()) {
    if (pos.division === division && (pos.level ?? 0) > top) top = pos.level ?? 0;
  }
  return top;
}

export function progressionFor(model: OrgModel, personId: string): Progression | null {
  const person = model.people.get(personId);
  if (!person) return null;

  const spans = person.assignmentIds
    .map((id) => model.assignments.get(id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  const last = spans[spans.length - 1];
  if (!last || last.endDate) return null; // only people currently in a seat

  const pos = model.positions.get(last.positionId);
  if (!pos) return null;

  const median = medianTimeInRoleYears(model) ?? 0;
  const inRole = timeInRoleYears(model, personId) ?? 0;
  const service = tenureYears(model, personId) ?? 0;

  // Has their grade ever gone up?
  let steppedUp = false;
  for (let i = 1; i < spans.length; i++) {
    const from = model.positions.get(spans[i - 1].positionId);
    const to = model.positions.get(spans[i].positionId);
    if (from && to && (to.level ?? 0) > (from.level ?? 0)) steppedUp = true;
  }

  const ceiling = ceilingOf(model, pos.division);
  const headroom = (pos.level ?? 0) < ceiling;

  const checks: Check[] = [
    {
      label: 'Relevant time in seat',
      met: inRole >= median,
      detail: `${inRole.toFixed(1)} years in role, against an organisational median of ${median.toFixed(1)}`,
    },
    {
      label: 'Previous progression on record',
      met: steppedUp,
      detail: steppedUp
        ? 'Grade has increased at least once during their history'
        : 'No previous increase in grade is recorded',
    },
    {
      label: 'Higher grade exists in their department',
      met: headroom,
      detail: headroom
        ? `Currently grade ${pos.level ?? '—'}; ${pos.division} runs to grade ${ceiling}`
        : `Already at the highest grade recorded in ${pos.division}`,
    },
  ];

  return {
    personId: person.id,
    name: person.name,
    title: pos.title,
    division: pos.division,
    level: pos.level,
    yearsInRole: inRole,
    yearsService: service,
    checks,
    signal: checks.every((c) => c.met),
  };
}

/** Everyone whose record meets all three checks. */
export function progressionCandidates(model: OrgModel): Progression[] {
  const out: Progression[] = [];
  for (const person of model.people.values()) {
    const p = progressionFor(model, person.id);
    if (p?.signal) out.push(p);
  }
  return out.sort((a, b) => b.yearsInRole - a.yearsInRole);
}

export interface Stagnation {
  personId: string;
  name: string;
  division: string;
  title: string;
  years: number;
}

/** Long service, one seat, no movement. A pattern worth reviewing. */
export function stagnation(model: OrgModel): Stagnation[] {
  const out: Stagnation[] = [];

  for (const person of model.people.values()) {
    const spans = person.assignmentIds
      .map((id) => model.assignments.get(id))
      .filter((a): a is NonNullable<typeof a> => Boolean(a));
    if (spans.length !== 1) continue;

    const only = spans[0];
    if (only.endDate) continue;

    const years = tenureYears(model, person.id) ?? 0;
    if (years < STAGNATION_YEARS) continue;

    const pos = model.positions.get(only.positionId);
    out.push({
      personId: person.id,
      name: person.name,
      division: pos?.division ?? 'Not recorded',
      title: pos?.title ?? only.positionId,
      years,
    });
  }

  return out.sort((a, b) => b.years - a.years);
}
```

- [ ] **Step 4: Run the checks**

Run: `npm run verify`
Expected: PASS — four progression checks read `ok`

- [ ] **Step 5: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS

```bash
git add src/domain/progression.ts scripts/verify-domain.mjs
git commit -m "feat: derive progression and stagnation evidence

Three checks against the record, all of which must hold before a signal
is raised, and every one of them travels with the signal so a reader can
disagree with it. Nothing here says anyone should be promoted."
```

---

## Task 8: `insights.ts` — the detectors

**Files:**
- Create: `src/domain/insights.ts`
- Modify: `scripts/verify-domain.mjs`

**Interfaces:**
- Consumes: everything from Tasks 3–7
- Produces:
  - `type Severity = 'attention' | 'review' | 'positive'`
  - `type AreaId = 'progression' | 'succession' | 'structure' | 'retention' | 'evolution' | 'mobility'`
  - `type Target = { kind: 'dept'; id: string } | { kind: 'person'; id: string } | { kind: 'position'; id: string } | { kind: 'area'; id: AreaId }`
  - `interface EvidenceRecord { id: string; kind: 'person' | 'position'; label: string }`
  - `interface Evidence { label: string; value: string; records?: EvidenceRecord[] }`
  - `interface Signal { id; severity; title; statement; evidence: Evidence[]; basis; action: { label: string; target: Target }; magnitude; thin }`
  - `signals(model, range): Signal[]`

- [ ] **Step 1: Write the failing checks**

Static import at the top of the file:

```js
import { signals } from '../src/domain/insights.ts';
```

The checks:

```js
const RANK_ORDER = { attention: 0, review: 1, positive: 2 };
const sig = signals(model, all);

checkAbove('signals are produced', sig.length, 0);
check('every signal carries a basis', sig.every((s) => s.basis.length > 0), true);
check('every signal carries evidence', sig.every((s) => s.evidence.length > 0), true);
// Genuinely sorted: every neighbour pair is in non-decreasing severity rank,
// so a positive can never outrank something needing attention.
check('signals are ordered by severity',
  sig.every((s, i) => i === 0 || RANK_ORDER[sig[i - 1].severity] <= RANK_ORDER[s.severity]), true);
check('an empty model yields no signals and does not throw',
  signals({ ...model, people: new Map(), positions: new Map(), assignments: new Map(), lineage: new Map() }, all).length,
  0);
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run verify`
Expected: FAIL — `Cannot find module .../src/domain/insights.ts`

- [ ] **Step 3: Write the module**

Create `src/domain/insights.ts`:

```ts
/**
 * Patterns worth a human's attention.
 *
 * Each detector looks for one shape in the records and returns either a signal
 * or nothing at all. Returning nothing matters as much as returning something:
 * a page that always shows four cards teaches its reader that the cards are
 * decoration. These fire only when the pattern is actually there.
 *
 * No detector predicts. Every one of them describes something that has already
 * happened, states the rule it used, and hands over the records it used so the
 * reader can check the working and disagree.
 */

import type { OrgModel } from './types.ts';
import type { Range } from './window.ts';
import { turnover, turnoverByDivision, vacancies } from './workforce.ts';
import { CRITICAL_BASIS, SUCCESSION_BASIS, meanSpan, spans, successionCoverage } from './structure.ts';
import { divisionFlows, mobilityRate } from './mobility.ts';
import { PROGRESSION_BASIS, STAGNATION_BASIS, progressionCandidates, stagnation } from './progression.ts';

export type Severity = 'attention' | 'review' | 'positive';

export type AreaId =
  | 'progression' | 'succession' | 'structure'
  | 'retention' | 'evolution' | 'mobility';

export type Target =
  | { kind: 'dept'; id: string }
  | { kind: 'person'; id: string }
  | { kind: 'position'; id: string }
  | { kind: 'area'; id: AreaId };

export interface EvidenceRecord {
  id: string;
  kind: 'person' | 'position';
  label: string;
}

export interface Evidence {
  label: string;
  value: string;
  /** Revealed when the reader expands the card. */
  records?: EvidenceRecord[];
}

export interface Signal {
  id: string;
  severity: Severity;
  /** Short, e.g. "Retention concern". */
  title: string;
  /** One sentence of plain English. */
  statement: string;
  evidence: Evidence[];
  /** The derivation rule, printed under the evidence. */
  basis: string;
  action: { label: string; target: Target };
  /** Ranking only. Never displayed. */
  magnitude: number;
  /** True when the figure rests on a denominator too small to lead with. */
  thin: boolean;
}

const RANK: Record<Severity, number> = { attention: 0, review: 1, positive: 2 };

/** A span this many times the mean is worth a look. */
const SPAN_OUTLIER = 1.5;

function retention(model: OrgModel, range: Range): Signal | null {
  const byDivision = turnoverByDivision(model, range).filter((d) => d.departures.length > 0);
  if (byDivision.length === 0) return null;

  const worst = byDivision[0];
  const overall = turnover(model, range);

  return {
    id: 'retention',
    severity: worst.departures.length >= 2 ? 'attention' : 'review',
    title: 'Retention concern',
    statement:
      `${worst.division} recorded ${worst.departures.length} of the organisation's ` +
      `${overall.departures.length} departures in this period, from ${worst.people} people.`,
    evidence: [
      {
        label: 'Departures recorded',
        value: `${worst.departures.length} of ${worst.people} people`,
        records: worst.departures.map((d) => ({
          id: d.personId,
          kind: 'person' as const,
          label: `${d.name} — ${d.lastTitle}, left ${d.date}`,
        })),
      },
      {
        label: 'Across the organisation',
        value: `${overall.departures.length} departures from an average of ${overall.mean.toFixed(0)} people`,
      },
      {
        label: 'Highest of any department',
        value: byDivision.length > 1
          ? `next highest is ${byDivision[1].division} with ${byDivision[1].departures.length}`
          : 'no other department recorded a departure',
      },
    ],
    basis: 'Derived: a person whose last assignment ends and who does not appear again.',
    action: { label: 'Review retention', target: { kind: 'dept', id: worst.division } },
    magnitude: worst.departures.length,
    thin: worst.thin,
  };
}

function managementCapacity(model: OrgModel, range: Range): Signal | null {
  const list = spans(model, range.to);
  if (list.length === 0) return null;

  const mean = meanSpan(model, range.to);
  const widest = list[0];
  if (mean <= 0 || widest.reports < mean * SPAN_OUTLIER) return null;

  return {
    id: 'span',
    severity: 'review',
    title: 'Management capacity may be stretched',
    statement:
      `${widest.holderName ?? 'One seat'} oversees ${widest.reports} direct reports, ` +
      `against an organisational average of ${mean.toFixed(1)}.`,
    evidence: [
      { label: 'Widest span', value: `${widest.reports} direct reports — ${widest.title}` },
      { label: 'Organisational average', value: mean.toFixed(1) },
      { label: 'Relative to average', value: `${(widest.reports / mean).toFixed(1)}×` },
    ],
    basis: 'Derived: live positions whose current holder reports to this seat.',
    action: { label: 'Review structure', target: { kind: 'position', id: widest.positionId } },
    magnitude: widest.reports / mean,
    thin: false,
  };
}

function progression(model: OrgModel): Signal | null {
  const candidates = progressionCandidates(model);
  if (candidates.length === 0) return null;

  return {
    id: 'progression',
    severity: 'positive',
    title: 'Career progression',
    statement:
      `${candidates.length} ${candidates.length === 1 ? 'person' : 'people'} may warrant a ` +
      'progression review based on their recorded career history.',
    evidence: [
      {
        label: 'Potentially ready for progression review',
        value: `${candidates.length} ${candidates.length === 1 ? 'person' : 'people'}`,
        records: candidates.map((c) => ({
          id: c.personId,
          kind: 'person' as const,
          label: `${c.name} — ${c.title}, ${c.yearsInRole.toFixed(1)} years in role`,
        })),
      },
      { label: 'Every check met', value: 'time in seat, previous progression, and headroom above them' },
    ],
    basis: PROGRESSION_BASIS,
    action: { label: 'Review people', target: { kind: 'area', id: 'progression' } },
    magnitude: candidates.length,
    thin: false,
  };
}

function roleProliferation(model: OrgModel): Signal | null {
  const titles = new Set<string>();
  for (const pos of model.positions.values()) titles.add(pos.title);

  const people = model.people.size;
  if (titles.size <= people) return null;

  const relabelled = [...model.lineage.values()].filter(
    (v) => v.relation === 'rename' || v.relation === 'redesignated',
  ).length;
  const split = [...model.lineage.values()].filter((v) => v.relation === 'split').length;
  const merged = [...model.lineage.values()].filter((v) => v.relation === 'merge').length;

  return {
    id: 'proliferation',
    severity: 'review',
    title: 'Role proliferation detected',
    statement:
      `The organisation carries ${titles.size} distinct job titles for ${people} people — ` +
      'more titles than staff.',
    evidence: [
      { label: 'Distinct job titles', value: String(titles.size) },
      { label: 'People on record', value: String(people) },
      { label: 'Renamed or redesignated', value: `${relabelled} — the same job, new wording` },
      { label: 'Split or merged', value: `${split} split, ${merged} merged` },
    ],
    basis: 'Direct: distinct position titles, classified by the lineage verdict on each seat.',
    action: { label: 'Explore role evolution', target: { kind: 'area', id: 'evolution' } },
    magnitude: titles.size / Math.max(people, 1),
    thin: false,
  };
}

function succession(model: OrgModel, range: Range): Signal | null {
  const coverage = successionCoverage(model, range.to);
  if (coverage.total === 0 || coverage.gaps.length === 0) return null;

  return {
    id: 'succession',
    severity: coverage.gaps.length >= coverage.total / 2 ? 'attention' : 'review',
    title: 'Succession coverage gap',
    statement:
      `${coverage.gaps.length} of ${coverage.total} critical roles have no direct report ` +
      'close enough in grade to be an evident successor.',
    evidence: [
      {
        label: 'Roles without evident cover',
        value: `${coverage.gaps.length} of ${coverage.total}`,
        records: coverage.gaps.map((g) => ({
          id: g.positionId,
          kind: 'position' as const,
          label: `${g.title} — ${g.holderName ?? 'vacant'} (${g.reason})`,
        })),
      },
      {
        label: 'Coverage',
        value: coverage.rate === null ? 'not calculable' : `${coverage.rate.toFixed(0)}%`,
      },
    ],
    basis: `${CRITICAL_BASIS} ${SUCCESSION_BASIS}`,
    action: { label: 'Review succession', target: { kind: 'area', id: 'succession' } },
    magnitude: coverage.gaps.length,
    thin: false,
  };
}

function stagnationSignal(model: OrgModel): Signal | null {
  const list = stagnation(model);
  if (list.length < 3) return null;

  return {
    id: 'stagnation',
    severity: 'review',
    title: 'Retention signal detected',
    statement:
      `${list.length} people have three or more years of service with no recorded change of seat.`,
    evidence: [
      {
        label: 'Long service, no movement',
        value: `${list.length} people`,
        records: list.slice(0, 12).map((s) => ({
          id: s.personId,
          kind: 'person' as const,
          label: `${s.name} — ${s.title}, ${s.years.toFixed(1)} years`,
        })),
      },
    ],
    basis: STAGNATION_BASIS,
    action: { label: 'Review retention', target: { kind: 'area', id: 'retention' } },
    magnitude: list.length / Math.max(model.people.size, 1),
    thin: false,
  };
}

function vacancySignal(model: OrgModel, range: Range): Signal | null {
  const open = vacancies(model, range.to).filter((v) => v.quartersOpen >= 2);
  if (open.length === 0) return null;

  return {
    id: 'vacancy',
    severity: 'review',
    title: 'Seats standing empty',
    statement:
      `${open.length} ${open.length === 1 ? 'seat has' : 'seats have'} been open for two ` +
      'quarters or more without a recorded holder.',
    evidence: [
      {
        label: 'Open seats',
        value: String(open.length),
        records: open.map((v) => ({
          id: v.positionId,
          kind: 'position' as const,
          label: `${v.title} — ${v.division}, open ${v.quartersOpen} quarters`,
        })),
      },
    ],
    basis: 'Derived: a position that exists, is not closed, and has no current holder.',
    action: { label: 'Review organisation', target: { kind: 'area', id: 'structure' } },
    magnitude: open.length,
    thin: false,
  };
}

function mobilitySignal(model: OrgModel, range: Range): Signal | null {
  const flows = divisionFlows(model, range);
  if (flows.length === 0) return null;

  const rate = mobilityRate(model, range);

  return {
    id: 'mobility',
    severity: 'positive',
    title: 'Internal mobility pattern identified',
    statement:
      `${flows.reduce((n, f) => n + f.count, 0)} people moved between departments, ` +
      `most commonly ${flows[0].from} to ${flows[0].to}.`,
    evidence: [
      { label: 'Most common path', value: `${flows[0].from} → ${flows[0].to} (${flows[0].count})` },
      { label: 'Distinct paths', value: String(flows.length) },
      {
        label: 'People with any internal move',
        value: `${rate.movers} of an average ${rate.population.toFixed(0)}`,
      },
    ],
    basis: 'Direct: consecutive assignments for one person in different divisions.',
    action: { label: 'Explore mobility', target: { kind: 'area', id: 'mobility' } },
    magnitude: flows.length,
    thin: rate.thin,
  };
}

/**
 * Run every detector and rank what came back. Severity first, then size —
 * a large positive should never outrank something needing attention.
 */
export function signals(model: OrgModel, range: Range): Signal[] {
  const found = [
    retention(model, range),
    managementCapacity(model, range),
    succession(model, range),
    vacancySignal(model, range),
    roleProliferation(model),
    stagnationSignal(model),
    progression(model),
    mobilitySignal(model, range),
  ].filter((s): s is Signal => s !== null);

  return found.sort(
    (a, b) => RANK[a.severity] - RANK[b.severity] || b.magnitude - a.magnitude,
  );
}
```

- [ ] **Step 4: Run the checks**

Run: `npm run verify`
Expected: PASS — five insight checks read `ok`

- [ ] **Step 5: Print the signals to read them as a human would**

Add to the checks section, after the insight checks:

```js
console.log('\n=== SIGNALS ===');
for (const s of sig) {
  console.log(`[${s.severity.toUpperCase()}] ${s.title}`);
  console.log(`   ${s.statement}`);
  for (const e of s.evidence) console.log(`   • ${e.label}: ${e.value}`);
  console.log(`   basis: ${s.basis}`);
  console.log(`   → ${s.action.label}\n`);
}
```

Run: `npm run verify`
Expected: readable signal output. **Read it.** Every statement must be true of the data and free of any deterministic HR claim. Fix wording now if not.

- [ ] **Step 6: Typecheck and commit**

Run: `npm run typecheck`
Expected: PASS

```bash
git add src/domain/insights.ts scripts/verify-domain.mjs
git commit -m "feat: detect workforce signals from the records

Eight detectors, each returning a signal or nothing. Every signal
carries its evidence, the rule that produced it, and the records behind
it. None of them predicts anything."
```

---

## Task 9: Styles for the intelligence page

**Files:**
- Modify: `src/styles/app.css` (append)

**Interfaces:**
- Consumes: tokens from `tokens.css`
- Produces: classes `wi-head`, `wi-range`, `wi-kpis`, `wi-kpi`, `wi-signals`, `wi-signal`, `wi-signal--attention|review|positive`, `wi-sev`, `wi-ev`, `wi-basis`, `wi-records`, `wi-areas`, `wi-area`, `wi-metric`, `wi-flow`, `wi-flow-row`, `wi-trend`, `wi-log`, `wi-unknown`, `wi-thin`

- [ ] **Step 1: Append the styles**

Add to the end of `src/styles/app.css`:

```css
/* ==================================================================
 * WORKFORCE INTELLIGENCE
 *
 * The page leans on the tokens the rest of the interface already uses.
 * The only new idea here is the severity rail down the left edge of an
 * insight card: it carries the status without colouring the whole card,
 * which would turn a page of eight findings into a traffic jam.
 * ================================================================== */

.wi-head { display: flex; align-items: flex-start; gap: var(--s4); flex-wrap: wrap; justify-content: space-between; }
.wi-eyebrow { font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-4); }
.wi-title { font-size: 27px; font-weight: 700; letter-spacing: -.03em; color: var(--ink); margin-top: 2px; }
.wi-sub { font-size: 14px; color: var(--ink-3); margin-top: 6px; max-width: 62ch; }
.wi-range { display: flex; align-items: center; gap: var(--s3); }
.wi-range select {
  font: inherit; font-size: 13px; padding: 7px 11px; border: 1px solid var(--line);
  border-radius: var(--r-sm); background: var(--surface); color: var(--ink); cursor: pointer;
}
.wi-updated { font-size: 12px; color: var(--ink-4); }

/* ---- Snapshot ---------------------------------------------------- */
.wi-kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s4); }
.wi-kpi {
  text-align: left; border: 1px solid var(--line); border-radius: var(--r-lg);
  background: var(--surface); padding: 18px 20px; cursor: pointer; transition: box-shadow .15s, border-color .15s;
}
.wi-kpi:hover { box-shadow: var(--lift); border-color: var(--ink-4); }
.wi-kpi-label { display: block; font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-4); }
.wi-kpi-value { display: block; font-size: 32px; font-weight: 700; letter-spacing: -.03em; color: var(--ink); margin-top: 8px; }
.wi-kpi-note { display: block; font-size: 12.5px; color: var(--ink-3); margin-top: 6px; }

/* ---- Insight cards ----------------------------------------------- */
.wi-signals { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--s4); }
.wi-signal {
  position: relative; text-align: left; border: 1px solid var(--line); border-radius: var(--r-lg);
  background: var(--surface); padding: 18px 20px 16px 22px; overflow: hidden; cursor: pointer;
}
.wi-signal::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--nu-bar); }
.wi-signal--attention::before { background: var(--brand); }
.wi-signal--review::before    { background: var(--wr-bar); }
.wi-signal--positive::before  { background: var(--ok-bar); }
.wi-sev { display: inline-block; font-size: 10.5px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; padding: 3px 8px; border-radius: var(--r-pill); }
.wi-signal--attention .wi-sev { color: var(--brand-deep); background: var(--brand-tint); }
.wi-signal--review .wi-sev    { color: var(--wr-fg);     background: var(--wr-bg); }
.wi-signal--positive .wi-sev  { color: var(--ok-fg);     background: var(--ok-bg); }
.wi-signal h4 { font-size: 15px; font-weight: 700; color: var(--ink); margin: 10px 0 0; }
.wi-statement { font-size: 13px; color: var(--ink-2); margin-top: 6px; line-height: 1.5; }
.wi-ev { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 5px; }
.wi-ev li { font-size: 12.5px; color: var(--ink-3); display: flex; gap: 7px; }
.wi-ev li::before { content: '\2022'; color: var(--ink-4); }
.wi-basis { font-size: 11.5px; color: var(--ink-4); font-style: italic; margin-top: 11px; padding-top: 9px; border-top: 1px solid var(--line-faint); line-height: 1.45; }
.wi-records { list-style: none; margin: 10px 0 0; padding: 10px 0 0; border-top: 1px solid var(--line-faint); display: grid; gap: 4px; }
.wi-records li { font-size: 12px; }
.wi-records button { font: inherit; background: none; border: 0; padding: 0; color: var(--brand); cursor: pointer; text-align: left; }
.wi-records button:hover { text-decoration: underline; }
.wi-cta { margin-top: 12px; font-size: 12.5px; font-weight: 600; color: var(--brand); background: none; border: 0; padding: 0; cursor: pointer; }
.wi-thin { font-size: 11px; color: var(--wr-fg); background: var(--wr-bg); padding: 2px 7px; border-radius: var(--r-pill); margin-left: 6px; }

/* ---- Intelligence areas ------------------------------------------ */
.wi-areas { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--s4); }
.wi-area { border: 1px solid var(--line); border-radius: var(--r-lg); background: var(--surface); padding: 20px 22px; }
.wi-area h3 { font-size: 16px; font-weight: 700; color: var(--ink); margin: 0; letter-spacing: -.02em; }
.wi-area-block { margin-top: var(--s4); padding-top: var(--s4); border-top: 1px solid var(--line-faint); }
.wi-area-block:first-of-type { border-top: 0; }
.wi-area-label { font-size: 11px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-4); }
.wi-metric { display: flex; justify-content: space-between; gap: var(--s3); font-size: 13px; padding: 5px 0; color: var(--ink-2); }
.wi-metric b { font-variant-numeric: tabular-nums; color: var(--ink); }

/* ---- The unknown ------------------------------------------------- */
.wi-unknown {
  background: var(--hatch); border: 1px dashed var(--line); border-radius: var(--r-sm);
  padding: 12px 14px; font-size: 12.5px; color: var(--ink-3); margin-top: var(--s3);
}

/* ---- Flow and trend ---------------------------------------------- */
.wi-flow { display: grid; gap: 7px; margin-top: var(--s3); }
.wi-flow-row { display: grid; grid-template-columns: 1fr auto 1fr auto; align-items: center; gap: var(--s3); font-size: 12.5px; }
.wi-flow-row span:first-child { text-align: right; color: var(--ink-2); }
.wi-flow-arrow { color: var(--ink-4); }
.wi-flow-bar { height: 6px; border-radius: 3px; background: var(--cat-3); }
.wi-trend { display: flex; align-items: flex-end; gap: 6px; height: 96px; margin-top: var(--s4); }
.wi-trend-col { flex: 1; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 5px; }
.wi-trend-col i { display: block; width: 100%; background: var(--cat-1); border-radius: 2px 2px 0 0; min-height: 2px; }
.wi-trend-col span { font-size: 10.5px; color: var(--ink-4); }

/* ---- Change log --------------------------------------------------- */
.wi-log { list-style: none; margin: 0; padding: 0; }
.wi-log li { display: grid; grid-template-columns: 92px 1fr auto; gap: var(--s4); align-items: baseline; padding: 11px 0; border-top: 1px solid var(--line-faint); }
.wi-log li:first-child { border-top: 0; }
.wi-log-when { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--ink-4); }
.wi-log button { font: inherit; background: none; border: 0; padding: 0; cursor: pointer; text-align: left; color: var(--ink); font-weight: 600; font-size: 13.5px; }
.wi-log button:hover { color: var(--brand); }
.wi-log-what { font-size: 12.5px; color: var(--ink-3); margin-top: 2px; }

@media (max-width: 1100px) {
  .wi-kpis, .wi-signals { grid-template-columns: repeat(2, 1fr); }
  .wi-areas { grid-template-columns: 1fr; }
}
```

- [ ] **Step 2: Confirm the app still builds**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/styles/app.css
git commit -m "style: add the workforce intelligence layer

Severity lives on a 3px rail down the card edge rather than in a fill,
so eight findings on one page still read as a page rather than an alarm."
```

---

## Task 10: `WorkforceView` — header, snapshot, and the insight section

**Files:**
- Create: `src/components/views/wi/InsightCard.tsx`
- Create: `src/components/views/WorkforceView.tsx`

**Interfaces:**
- Consumes: `signals`, `Signal`, `Target` from `insights.ts`; `PRESETS`, `rangeFor`, `previousRange`, `recordsCurrentTo`, `Range`, `PresetId` from `window.ts`; `turnover`, `headcountAt` from `workforce.ts`; `mobilityRate` from `mobility.ts`; `criticalRoles`, `successionCoverage` from `structure.ts`
- Produces:
  - `InsightCard({ signal, onOpenRecord, onAct })`
  - `WorkforceView({ model, metrics, preset, onPresetChange, onOpenDept, onOpenPerson, onOpenPosition, onOpenArea })`

- [ ] **Step 1: Write `InsightCard`**

Create `src/components/views/wi/InsightCard.tsx`:

```tsx
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
      {signal.thin ? <span className="wi-thin" title="Computed on a small population">thin data</span> : null}

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
```

- [ ] **Step 2: Write the page shell with header, snapshot and insights**

Create `src/components/views/WorkforceView.tsx`:

```tsx
/**
 * Workforce Intelligence — the front door.
 *
 * The order is the argument: what the workforce IS, then what may need
 * attention, then the four questions HR actually asks, then where to look.
 * A reader who stops after ten seconds should still have learnt the second
 * of those, which is why the findings sit above the analysis rather than
 * beneath it.
 */

import { useMemo } from 'react';
import type { Metrics, OrgModel } from '../../domain/types.ts';
import type { AreaId, EvidenceRecord, Signal } from '../../domain/insights.ts';
import { signals } from '../../domain/insights.ts';
import type { PresetId } from '../../domain/window.ts';
import { PRESETS, previousRange, rangeFor, recordsCurrentTo } from '../../domain/window.ts';
import { headcountAt, turnover } from '../../domain/workforce.ts';
import { mobilityRate } from '../../domain/mobility.ts';
import { criticalRoles, successionCoverage } from '../../domain/structure.ts';
import { formatDate } from '../../domain/dates.ts';
import { InsightCard } from './wi/InsightCard.tsx';

// `metrics` is declared here but deliberately NOT destructured yet: Task 11 is
// the first task that reads it, and `noUnusedLocals` would fail this task's own
// typecheck gate on an unused binding.
export function WorkforceView({
  model, preset, onPresetChange, onOpenDept, onOpenPerson, onOpenPosition, onOpenArea,
}: {
  model: OrgModel;
  metrics: Metrics;
  preset: PresetId;
  onPresetChange: (id: PresetId) => void;
  onOpenDept: (division: string) => void;
  onOpenPerson: (id: string) => void;
  onOpenPosition: (id: string) => void;
  onOpenArea: (id: AreaId) => void;
}) {
  const range = useMemo(() => rangeFor(model, preset), [model, preset]);
  const prior = useMemo(() => previousRange(model, range), [model, range]);
  const found = useMemo(() => signals(model, range), [model, range]);

  const now = headcountAt(model, range.to);
  const before = prior ? headcountAt(model, prior.to) : null;
  const delta = before !== null && before > 0 ? ((now - before) / before) * 100 : null;

  const churn = useMemo(() => turnover(model, range), [model, range]);
  const mobility = useMemo(() => mobilityRate(model, range), [model, range]);
  const critical = useMemo(() => criticalRoles(model, range.to), [model, range]);
  const coverage = useMemo(() => successionCoverage(model, range.to), [model, range]);

  const openRecord = (r: EvidenceRecord) =>
    r.kind === 'person' ? onOpenPerson(r.id) : onOpenPosition(r.id);

  const act = (s: Signal) => {
    const t = s.action.target;
    if (t.kind === 'dept') onOpenDept(t.id);
    else if (t.kind === 'person') onOpenPerson(t.id);
    else if (t.kind === 'position') onOpenPosition(t.id);
    else onOpenArea(t.id);
  };

  return (
    <div className="stack gap-6">
      {/* ---- Header ---------------------------------------------------- */}
      <div className="wi-head">
        <div>
          <div className="wi-eyebrow">Silsila</div>
          <h1 className="wi-title">Workforce Intelligence</h1>
          <p className="wi-sub">
            Understand how your organisation is changing &mdash; and where HR attention
            may be needed.
          </p>
        </div>

        <div className="wi-range no-print">
          <select
            value={preset}
            onChange={(e) => onPresetChange(e.target.value as PresetId)}
            aria-label="Reporting period"
          >
            {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <span className="wi-updated">
            Records current to {formatDate(recordsCurrentTo(model))}
          </span>
        </div>
      </div>

      {/* ---- Snapshot -------------------------------------------------- */}
      <div className="wi-kpis">
        <button className="wi-kpi" onClick={() => onOpenArea('structure')}>
          <span className="wi-kpi-label">Total employees</span>
          <span className="wi-kpi-value tnum">{now}</span>
          <span className="wi-kpi-note">
            {delta === null ? `over ${range.label}`
              : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}% vs previous period`}
          </span>
        </button>

        <button className="wi-kpi" onClick={() => onOpenArea('retention')}>
          <span className="wi-kpi-label">Turnover</span>
          <span className="wi-kpi-value tnum">
            {churn.departures.length}
          </span>
          <span className="wi-kpi-note">
            departure{churn.departures.length === 1 ? '' : 's'} from an average of{' '}
            {churn.mean.toFixed(0)} people
            {churn.rate !== null ? ` (${churn.rate.toFixed(1)}%)` : ''}
          </span>
        </button>

        <button className="wi-kpi" onClick={() => onOpenArea('mobility')}>
          <span className="wi-kpi-label">Internal mobility</span>
          <span className="wi-kpi-value tnum">
            {mobility.rate === null ? '—' : `${mobility.rate.toFixed(1)}%`}
          </span>
          <span className="wi-kpi-note">
            {mobility.movers} with a recorded role or department move
          </span>
        </button>

        <button className="wi-kpi" onClick={() => onOpenArea('succession')}>
          <span className="wi-kpi-label">Critical roles</span>
          <span className="wi-kpi-value tnum">{critical.length}</span>
          <span className="wi-kpi-note">
            {coverage.gaps.length} require succession review
          </span>
        </button>
      </div>

      {/* ---- What should HR know? -------------------------------------- */}
      <div>
        <div style={{ marginBottom: 'var(--s4)' }}>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.02em' }}>
            What should HR know?
          </div>
          <div className="small muted" style={{ marginTop: 3 }}>
            Signals surfaced from workforce and organisational history.
          </div>
        </div>

        {found.length === 0 ? (
          <div className="wi-unknown">
            No signals were raised for this period. The records may be too short to
            show a pattern &mdash; try a longer period.
          </div>
        ) : (
          <div className="wi-signals">
            {found.slice(0, 4).map((s) => (
              <InsightCard key={s.id} signal={s} onOpenRecord={openRecord} onAct={act} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS. `metrics` is not yet read — if TypeScript complains about the unused prop, leave it; it is consumed in Task 11.

- [ ] **Step 4: Commit**

```bash
git add src/components/views/WorkforceView.tsx src/components/views/wi/InsightCard.tsx
git commit -m "feat: add the Workforce Intelligence header, snapshot and findings

Insight cards expand to the records behind them in place. Leaving the
page is the CTA and nothing else."
```

---

## Task 11: The four intelligence areas

**Files:**
- Create: `src/components/views/wi/AreaCard.tsx`
- Create: `src/components/views/wi/RoleTrend.tsx`
- Create: `src/components/views/wi/MobilityFlow.tsx`
- Modify: `src/components/views/WorkforceView.tsx`

**Interfaces:**
- Consumes: all domain modules
- Produces: `AreaCard({ title, children })`, `Metric({ label, value })`, `Unknown({ children })`, `RoleTrend({ model })`, `MobilityFlow({ flows, onOpenPerson })`

- [ ] **Step 1: Write `AreaCard` with its small parts**

Create `src/components/views/wi/AreaCard.tsx`:

```tsx
/**
 * One of the four questions, as a panel.
 *
 * Each panel answers a question HR already asks out loud, which is why the
 * headings are questions rather than nouns. A panel that cannot answer says so
 * in the hatch box rather than showing a zero, because a zero is a claim.
 */

import type { ReactNode } from 'react';

export function AreaCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="wi-area">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function Block({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="wi-area-block">
      <div className="wi-area-label">{label}</div>
      {children}
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="wi-metric">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

/** What the records cannot answer. Drawn in hatch, never as a zero. */
export function Unknown({ children }: { children: ReactNode }) {
  return <div className="wi-unknown">{children}</div>;
}

export function Cta({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button className="wi-cta no-print" onClick={onClick} style={{ marginTop: 'var(--s4)' }}>
      {label} &rarr;
    </button>
  );
}
```

- [ ] **Step 2: Write `RoleTrend`**

Create `src/components/views/wi/RoleTrend.tsx`:

```tsx
/**
 * Job titles against people, year by year.
 *
 * Two series on one axis because the finding only exists in the comparison:
 * titles climbing faster than headcount is role proliferation, and titles
 * climbing alongside it is simply growth.
 */

import { useMemo } from 'react';
import type { OrgModel } from '../../../domain/types.ts';
import { WINDOW_START_YEAR, toQuarterIndex } from '../../../domain/dates.ts';
import { headcountAt } from '../../../domain/workforce.ts';

export function RoleTrend({ model }: { model: OrgModel }) {
  const rows = useMemo(() => {
    const years = new Map<number, { titles: Set<string>; people: number }>();
    const lastYear = WINDOW_START_YEAR + Math.floor((model.window.quarterCount - 1) / 4);

    for (let year = WINDOW_START_YEAR; year <= lastYear; year++) {
      const quarter = Math.min((year - WINDOW_START_YEAR) * 4 + 3, model.window.quarterCount - 1);
      const titles = new Set<string>();

      for (const pos of model.positions.values()) {
        const created = toQuarterIndex(pos.createdAt);
        if (created === null || created > quarter) continue;
        const closed = pos.closedAt ? toQuarterIndex(pos.closedAt) : null;
        if (closed !== null && closed < quarter) continue;
        titles.add(pos.title);
      }

      years.set(year, { titles, people: headcountAt(model, quarter) });
    }

    const out = [...years.entries()].map(([year, v]) => ({
      year, titles: v.titles.size, people: v.people,
    }));
    const peak = Math.max(...out.map((r) => Math.max(r.titles, r.people)), 1);
    return out.map((r) => ({ ...r, peak }));
  }, [model]);

  const first = rows[0];
  const last = rows[rows.length - 1];

  return (
    <>
      <div className="wi-metric">
        <span>Distinct job titles</span>
        <b>{first?.titles} &rarr; {last?.titles}</b>
      </div>
      <div className="wi-metric">
        <span>People</span>
        <b>{first?.people} &rarr; {last?.people}</b>
      </div>

      <div className="wi-trend">
        {rows.map((r) => (
          <div className="wi-trend-col" key={r.year} title={`${r.year}: ${r.titles} titles, ${r.people} people`}>
            <i style={{ height: `${(r.titles / r.peak) * 100}%`, background: 'var(--cat-2)' }} />
            <i style={{ height: `${(r.people / r.peak) * 100}%`, background: 'var(--cat-1)' }} />
            <span>{r.year}</span>
          </div>
        ))}
      </div>
      <div className="micro faint" style={{ marginTop: 6 }}>
        Red: distinct job titles. Dark: people.
      </div>
    </>
  );
}
```

- [ ] **Step 3: Write `MobilityFlow`**

Create `src/components/views/wi/MobilityFlow.tsx`:

```tsx
/**
 * Where people moved between departments.
 *
 * A bar per path rather than a Sankey: with a handful of paths a Sankey is
 * decoration, and the reader's question — which route is most travelled — is
 * answered faster by lengths they can compare on one axis.
 */

import type { Flow } from '../../../domain/mobility.ts';

export function MobilityFlow({
  flows, onOpenPerson,
}: {
  flows: Flow[];
  onOpenPerson: (id: string) => void;
}) {
  if (flows.length === 0) {
    return (
      <div className="wi-unknown">
        No movement between departments was recorded in this period. Every recorded
        move stayed inside its own department.
      </div>
    );
  }

  const most = Math.max(...flows.map((f) => f.count), 1);

  return (
    <div className="wi-flow">
      {flows.map((f) => (
        <div className="wi-flow-row" key={`${f.from}-${f.to}`}>
          <span>{f.from}</span>
          <span className="wi-flow-arrow" aria-hidden="true">&rarr;</span>
          <span>
            {f.to}
            <span className="wi-flow-bar" style={{ width: `${(f.count / most) * 100}%`, marginTop: 4 }} />
          </span>
          <b className="tnum" style={{ fontSize: 12.5 }}>
            {f.people.map((p, i) => (
              <span key={p.id}>
                {i > 0 ? ', ' : ''}
                <button
                  className="wi-cta"
                  style={{ marginTop: 0, fontWeight: 600 }}
                  onClick={() => onOpenPerson(p.id)}
                >
                  {p.name.split(' ')[0]}
                </button>
              </span>
            ))}
          </b>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Add the four areas to `WorkforceView`**

In `src/components/views/WorkforceView.tsx`, add `metrics` to the destructuring pattern (Task 10 declared the prop but left it undestructured; this task is the first to read it):

```tsx
export function WorkforceView({
  model, metrics, preset, onPresetChange, onOpenDept, onOpenPerson, onOpenPosition, onOpenArea,
}: {
```

Add these imports:

```tsx
import { AreaCard, Block, Cta, Metric, Unknown } from './wi/AreaCard.tsx';
import { RoleTrend } from './wi/RoleTrend.tsx';
import { MobilityFlow } from './wi/MobilityFlow.tsx';
import { divisionFlows, moves, netFlow } from '../../domain/mobility.ts';
import { meanSpan, reportingDepth, spans } from '../../domain/structure.ts';
import { vacancies } from '../../domain/workforce.ts';
import { progressionCandidates, stagnation } from '../../domain/progression.ts';
```

Add these computations beside the existing `useMemo` calls:

```tsx
  const flows = useMemo(() => divisionFlows(model, range), [model, range]);
  const allMoves = useMemo(() => moves(model, range), [model, range]);
  const spanList = useMemo(() => spans(model, range.to), [model, range]);
  const open = useMemo(() => vacancies(model, range.to), [model, range]);
  const ready = useMemo(() => progressionCandidates(model), [model]);
  const stuck = useMemo(() => stagnation(model), [model]);
  const depth = useMemo(() => reportingDepth(model, range.to), [model, range]);
  const avgSpan = useMemo(() => meanSpan(model, range.to), [model, range]);
  const net = useMemo(() => netFlow(model, range), [model, range]);
```

Then append this block inside the outer `<div className="stack gap-6">`, after the "What should HR know?" section:

```tsx
      {/* ---- The four questions ---------------------------------------- */}
      <div className="wi-areas">
        <AreaCard title="Are we developing the right people?">
          <Block label="Career progression">
            <Metric label="Potentially ready for progression review" value={ready.length} />
            <Metric label="Recorded moves with a rise in grade"
              value={allMoves.filter((mv) => mv.kind === 'progression').length} />
            <Metric label="Long service with no change of seat" value={stuck.length} />
            <Unknown>Performance evidence unavailable. These signals rest on role history and tenure alone.</Unknown>
            <Cta label="Explore career progression" onClick={() => onOpenArea('progression')} />
          </Block>

          <Block label="Succession planning">
            <Metric label="Critical roles" value={critical.length} />
            <Metric label="With an evident successor" value={coverage.covered} />
            <Metric label="Without an evident successor" value={coverage.gaps.length} />
            <Metric label="Coverage"
              value={coverage.rate === null ? 'not calculable' : `${coverage.rate.toFixed(0)}%`} />
            <Cta label="Review succession" onClick={() => onOpenArea('succession')} />
          </Block>
        </AreaCard>

        <AreaCard title="Do we have the right workforce structure?">
          <Block label="Workforce capacity">
            <Metric label="Current headcount" value={now} />
            <Metric label="Seats with no current holder" value={open.length} />
            <Metric label="Average management span" value={avgSpan.toFixed(1)} />
            <Unknown>
              Capacity assessment requires additional workforce planning data. Staffing
              sufficiency cannot be determined from headcount alone.
            </Unknown>
          </Block>

          <Block label="Organisational bottlenecks">
            <Metric label="Widest management span"
              value={spanList[0] ? `${spanList[0].reports} — ${spanList[0].title}` : '—'} />
            <Metric label="Seats carrying direct reports" value={spanList.length} />
            <Metric label="Deepest reporting chain" value={`${depth} layers`} />
            <Cta label="Review organisation" onClick={() => onOpenArea('structure')} />
          </Block>
        </AreaCard>

        <AreaCard title="Are we retaining our people?">
          <Block label="Turnover">
            <Metric label="Departures in this period" value={churn.departures.length} />
            <Metric label="Average headcount" value={churn.mean.toFixed(0)} />
            <Metric label="Rate"
              value={churn.rate === null ? 'not calculable' : `${churn.rate.toFixed(1)}%${churn.thin ? ' (thin data)' : ''}`} />
          </Block>

          <Block label="Retention signals">
            <Metric label="Long service, no movement" value={stuck.length} />
            <Metric label="Seats open two quarters or more"
              value={open.filter((v) => v.quartersOpen >= 2).length} />
            <div className="micro faint" style={{ marginTop: 8 }}>
              Patterns worth reviewing. These are not predictions about any individual.
            </div>
            <Cta label="Review retention" onClick={() => onOpenArea('retention')} />
          </Block>
        </AreaCard>

        <AreaCard title="How is our organisation evolving?">
          <Block label="Role evolution">
            <RoleTrend model={model} />
            <Metric label="Renamed or redesignated" value={metrics.renameCount} />
            <Metric label="Genuinely new seats" value={metrics.genuinelyNewCount} />
            <Metric label="Split / merged" value={`${metrics.splitCount} / ${metrics.mergeCount}`} />
            <Cta label="Explore role evolution" onClick={() => onOpenArea('evolution')} />
          </Block>

          <Block label="Career mobility">
            <MobilityFlow flows={flows} onOpenPerson={onOpenPerson} />
            {net.length > 0 ? (
              <div style={{ marginTop: 'var(--s4)' }}>
                <Metric
                  label="Produces internal talent"
                  value={net.filter((d) => d.produced > d.received)
                    .map((d) => `${d.division} (${d.produced})`).join(', ') || 'none'}
                />
                <Metric
                  label="Receives internal talent"
                  value={net.filter((d) => d.received > d.produced)
                    .map((d) => `${d.division} (${d.received})`).join(', ') || 'none'}
                />
              </div>
            ) : null}
            <Cta label="Explore mobility" onClick={() => onOpenArea('mobility')} />
          </Block>
        </AreaCard>
      </div>
```

- [ ] **Step 5: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/views/WorkforceView.tsx src/components/views/wi/
git commit -m "feat: add the four HR intelligence areas

Each panel answers a question HR already asks aloud. Where the records
cannot answer, the panel says so in hatch rather than showing a zero."
```

---

## Task 12: Departments and recent organisational changes

**Files:**
- Create: `src/components/views/wi/ChangeLog.tsx`
- Modify: `src/components/views/WorkforceView.tsx`

**Interfaces:**
- Consumes: `departments` from `overview.ts`; `changeFeed` from `overview.ts`; `moves` from `mobility.ts`; `turnoverByDivision` from `workforce.ts`; `RELATION_LABEL` from `vocabulary.tsx`
- Produces: `ChangeLog({ model, range, onOpenPerson, onOpenPosition })`

- [ ] **Step 1: Write `ChangeLog`**

Create `src/components/views/wi/ChangeLog.tsx`:

```tsx
/**
 * What actually happened, newest first.
 *
 * Two histories on one list: seats that changed shape, and people who moved.
 * They are shown together because that is how they happened — the merge and
 * the departure that followed it are one event to everybody except a database.
 */

import { useMemo } from 'react';
import type { OrgModel } from '../../../domain/types.ts';
import type { Range } from '../../../domain/window.ts';
import { changeFeed } from '../../../domain/overview.ts';
import { moves } from '../../../domain/mobility.ts';
import { formatMonthYear, toQuarterIndex } from '../../../domain/dates.ts';
import { RELATION_LABEL } from '../../ui/vocabulary.tsx';
import { inRange } from '../../../domain/window.ts';

interface Entry {
  date: string;
  subject: string;
  what: string;
  onOpen: () => void;
}

export function ChangeLog({
  model, range, onOpenPerson, onOpenPosition, limit = 12,
}: {
  model: OrgModel;
  range: Range;
  onOpenPerson: (id: string) => void;
  onOpenPosition: (id: string) => void;
  limit?: number;
}) {
  const entries = useMemo<Entry[]>(() => {
    const out: Entry[] = [];

    for (const event of changeFeed(model)) {
      if (!event.date || event.relation === 'created') continue;
      if (!inRange(range, toQuarterIndex(event.date))) continue;
      out.push({
        date: event.date,
        subject: event.title,
        what: `Role ${RELATION_LABEL[event.relation].toLowerCase()} · ${event.division}`,
        onOpen: () => onOpenPosition(event.positionId),
      });
    }

    for (const mv of moves(model, range)) {
      const what =
        mv.kind === 'transfer' ? `Transferred · ${mv.fromDivision} → ${mv.toDivision}`
        : mv.kind === 'progression' ? `Promoted · ${mv.fromTitle} → ${mv.toTitle}`
        : `Moved seat · ${mv.fromTitle} → ${mv.toTitle}`;
      out.push({
        date: mv.date,
        subject: mv.name,
        what,
        onOpen: () => onOpenPerson(mv.personId),
      });
    }

    return out.sort((a, b) => b.date.localeCompare(a.date)).slice(0, limit);
  }, [model, range, onOpenPerson, onOpenPosition, limit]);

  if (entries.length === 0) {
    return <div className="wi-unknown">No organisational changes were recorded in this period.</div>;
  }

  return (
    <ul className="wi-log">
      {entries.map((e, i) => (
        <li key={`${e.date}-${e.subject}-${i}`}>
          <span className="wi-log-when">{formatMonthYear(e.date)}</span>
          <span>
            <button onClick={e.onOpen}>{e.subject}</button>
            <div className="wi-log-what">{e.what}</div>
          </span>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: Add departments and the change log to `WorkforceView`**

Add imports:

```tsx
import { departments } from '../../domain/overview.ts';
import { turnoverByDivision } from '../../domain/workforce.ts';
import { deptAbbr, deptColor } from '../ui/vocabulary.tsx';
import { ChangeLog } from './wi/ChangeLog.tsx';
```

Add the computation:

```tsx
  /**
   * The leader / manager / member split.
   *
   * The records carry no such field, so it is read off the two things they do
   * carry: a seat with people reporting to it is a management seat, and grade
   * 6 and above is a leadership seat. Stated on the card so nobody mistakes it
   * for an establishment figure.
   */
  const depts = useMemo(() => {
    const churnBy = new Map(turnoverByDivision(model, range).map((d) => [d.division, d]));
    const carriesReports = new Set(spanList.map((s) => s.positionId));

    return departments(model).map((d) => {
      const t = churnBy.get(d.division);
      const criticalHere = critical.filter((c) => c.division === d.division);
      const gapsHere = criticalHere.filter((c) => !c.covered).length;
      const openHere = open.filter((v) => v.division === d.division).length;

      let leaders = 0;
      let managers = 0;
      let members = 0;
      for (const pos of model.positions.values()) {
        if (pos.division !== d.division) continue;
        const filled = pos.assignmentIds.some((id) => !model.assignments.get(id)?.endDate);
        if (!filled) continue;
        if ((pos.level ?? 0) >= 6) leaders++;
        else if (carriesReports.has(pos.id)) managers++;
        else members++;
      }

      const status: 'ok' | 'review' | 'attention' =
        (t?.departures.length ?? 0) >= 2 ? 'attention'
        : gapsHere > 0 || openHere > 0 ? 'review'
        : 'ok';

      return {
        ...d,
        departures: t?.departures.length ?? 0,
        rate: t?.rate ?? null,
        thin: t?.thin ?? true,
        critical: criticalHere.length,
        gaps: gapsHere,
        open: openHere,
        leaders,
        managers,
        members,
        status,
      };
    });
  }, [model, range, critical, open, spanList]);
```

Append after the four areas:

```tsx
      {/* ---- Departments ------------------------------------------------ */}
      <div>
        <div style={{ marginBottom: 'var(--s4)' }}>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.02em' }}>Departments</div>
          <div className="small muted" style={{ marginTop: 3 }}>
            Click a department to open its full record.
          </div>
        </div>

        <div className="dept-grid">
          {depts.map((d) => (
            <button key={d.division} className="dept" onClick={() => onOpenDept(d.division)}>
              <span className="dept-top">
                <span className="dept-tile" style={{ background: deptColor(d.division) }}>
                  {deptAbbr(d.division)}
                </span>
                <span className="dept-name">{d.division}</span>
              </span>

              <span className="dept-count">
                <b className="tnum">{d.headcount}</b>
                <span>employees</span>
              </span>

              <span className="dept-foot" style={{ display: 'grid', gap: 3 }}>
                <span>
                  {d.leaders} leader{d.leaders === 1 ? '' : 's'} ·{' '}
                  {d.managers} manager{d.managers === 1 ? '' : 's'} ·{' '}
                  {d.members} member{d.members === 1 ? '' : 's'}
                </span>
                <span>
                  {d.departures} departure{d.departures === 1 ? '' : 's'}
                  {d.rate !== null && !d.thin ? ` · ${d.rate.toFixed(1)}%` : ''}
                </span>
                <span>{d.critical} critical · {d.gaps} without cover · {d.open} open</span>
                <span style={{
                  color: d.status === 'attention' ? 'var(--brand)'
                    : d.status === 'review' ? 'var(--wr-fg)' : 'var(--ok-fg)',
                  fontWeight: 600,
                }}>
                  {d.status === 'attention' ? '● Needs attention'
                    : d.status === 'review' ? '● Review' : '● Healthy'}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ---- Recent organisational changes ------------------------------ */}
      <div className="card">
        <div style={{ marginBottom: 'var(--s4)' }}>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.02em' }}>
            Recent organisational changes
          </div>
          <div className="small muted" style={{ marginTop: 3 }}>
            Seats that changed shape, and people who moved. Click any entry to open it.
          </div>
        </div>
        <ChangeLog
          model={model}
          range={range}
          onOpenPerson={onOpenPerson}
          onOpenPosition={onOpenPosition}
        />
      </div>
```

- [ ] **Step 3: Typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/views/WorkforceView.tsx src/components/views/wi/ChangeLog.tsx
git commit -m "feat: add the department grid and the change log

Structural changes and people's moves are listed together because that
is how they happened."
```

---

## Task 13: Wire the page into the application

**Files:**
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `WorkforceView`, `PresetId`, `AreaId`
- Produces: tab `workforce` replaces `overview`; `preset` state; `onOpenArea` routing

- [ ] **Step 1: Replace the Overview tab**

In `src/App.tsx`:

1. Change the `Tab` type:

```tsx
type Tab = 'workforce' | 'orgchart' | 'people' | 'timeline' | 'quality' | 'load';
```

2. Rename the `overview` key in `ICONS` to `workforce`, keeping the same SVG.

3. Replace the first entry of `TABS`:

```tsx
  { id: 'workforce', label: 'Workforce', crumb: 'Workforce Intelligence' },
```

4. Replace the import of `OverviewView`:

```tsx
import { WorkforceView } from './components/views/WorkforceView.tsx';
import type { PresetId } from './domain/window.ts';
import type { AreaId } from './domain/insights.ts';
```

5. Change the initial tab and add preset state:

```tsx
  const [tab, setTab] = useState<Tab>('workforce');
  const [preset, setPreset] = useState<PresetId>('all');
```

6. Change every remaining `goTab('overview')` to `goTab('workforce')` (the rail logo and the breadcrumb both use it).

- [ ] **Step 2: Route the area CTAs**

Add above the `return`:

```tsx
  /**
   * Where each intelligence area sends the reader. The areas are questions,
   * not destinations, so each maps onto the view that already answers it —
   * rather than a new page that would only restate the card.
   */
  const openArea = useCallback((id: AreaId) => {
    if (id === 'progression' || id === 'retention' || id === 'mobility') goTab('people');
    else if (id === 'succession' || id === 'structure') goTab('orgchart');
    else goTab('timeline');
  }, [goTab]);
```

- [ ] **Step 3: Render the view**

Replace the `tab === 'overview' ? (<OverviewView ... />)` branch with:

```tsx
              ) : tab === 'workforce' ? (
                <WorkforceView
                  model={model}
                  metrics={metrics!}
                  preset={preset}
                  onPresetChange={setPreset}
                  onOpenDept={openDept}
                  onOpenPerson={openPerson}
                  onOpenPosition={openPosition}
                  onOpenArea={openArea}
                />
```

- [ ] **Step 4: Delete the retired view**

Run: `git rm src/components/views/OverviewView.tsx`

- [ ] **Step 5: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: PASS. If anything still references `OverviewView` or `'overview'`, fix it now.

- [ ] **Step 6: Look at it**

Run: `npm run dev`

Open the URL printed. Confirm, at 1440px:
- The page opens on Workforce Intelligence
- Four KPI cards in one row, four insight cards below
- Changing the period control changes the figures
- Expanding an insight lists named records; clicking one opens that person or seat
- No horizontal scrollbar

Stop the server when done.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: make Workforce Intelligence the landing page

Replaces the Company Overview, whose department grid it absorbs. One
front door rather than two competing dashboards."
```

---

## Task 14: Extend the department page

**Files:**
- Modify: `src/components/views/DeptView.tsx`

**Interfaces:**
- Consumes: `turnoverByDivision`, `vacancies` from `workforce.ts`; `criticalRoles` from `structure.ts`; `moves` from `mobility.ts`; `rangeFor` from `window.ts`; `ChangeLog`
- Produces: no new exports; `DeptView` gains four sections

- [ ] **Step 1: Add the imports and computations**

In `src/components/views/DeptView.tsx`, add:

```tsx
import { rangeFor } from '../../domain/window.ts';
import { turnoverByDivision, vacancies } from '../../domain/workforce.ts';
import { criticalRoles } from '../../domain/structure.ts';
import { moves } from '../../domain/mobility.ts';
import { ChangeLog } from './wi/ChangeLog.tsx';
```

Inside the component, after the existing `useMemo` calls:

```tsx
  /** The department page always reads the full history; a filter here would
   *  silently disagree with the landing page the reader arrived from. */
  const range = useMemo(() => rangeFor(model, 'all'), [model]);

  const churn = useMemo(
    () => turnoverByDivision(model, range).find((d) => d.division === division) ?? null,
    [model, range, division],
  );
  const critical = useMemo(
    () => criticalRoles(model, range.to).filter((c) => c.division === division),
    [model, range, division],
  );
  const open = useMemo(
    () => vacancies(model, range.to).filter((v) => v.division === division),
    [model, range, division],
  );
  const movement = useMemo(
    () => moves(model, range).filter(
      (mv) => mv.fromDivision === division || mv.toDivision === division,
    ),
    [model, range, division],
  );
```

- [ ] **Step 2: Add the four sections**

Insert before the closing `</div>` of the returned `stack`, after the People table:

```tsx
      {/* ---- Turnover ---------------------------------------------------- */}
      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 700 }}>Turnover</div>
        {churn && churn.departures.length > 0 ? (
          <>
            <div className="wi-metric" style={{ marginTop: 'var(--s3)' }}>
              <span>Departures on record</span>
              <b>{churn.departures.length} of {churn.people} people</b>
            </div>
            <div className="wi-metric">
              <span>Rate</span>
              <b>
                {churn.rate === null ? 'not calculable' : `${churn.rate.toFixed(1)}%`}
                {churn.thin ? ' (thin data)' : ''}
              </b>
            </div>
            <ul className="wi-records" style={{ borderTop: '1px solid var(--line-faint)' }}>
              {churn.departures.map((d) => (
                <li key={d.personId}>
                  <button onClick={() => onOpenPerson(d.personId)}>
                    {d.name} &mdash; {d.lastTitle}, left {d.date}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <div className="wi-unknown">No departures are recorded for this department.</div>
        )}
      </div>

      {/* ---- Succession coverage ----------------------------------------- */}
      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 700 }}>Succession coverage</div>
        {critical.length === 0 ? (
          <div className="wi-unknown">
            No critical roles were identified in this department.
          </div>
        ) : (
          <>
            {critical.map((c) => (
              <div className="wi-metric" key={c.positionId}>
                <span>
                  {c.title}
                  <span className="micro faint"> &mdash; {c.reason}</span>
                </span>
                <b style={{ color: c.covered ? 'var(--ok-fg)' : 'var(--wr-fg)' }}>
                  {c.covered
                    ? `covered by ${c.successors[0].name}`
                    : 'no evident successor'}
                </b>
              </div>
            ))}
            <p className="wi-basis">
              Derived: live seats carrying direct reports, or graded 6 and above.
              Covered when a direct report sits within two grades and has two years&rsquo; service.
            </p>
          </>
        )}
      </div>

      {/* ---- Open seats and mobility -------------------------------------- */}
      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 700 }}>Open seats and movement</div>
        <div className="wi-metric" style={{ marginTop: 'var(--s3)' }}>
          <span>Seats with no current holder</span>
          <b>{open.length}</b>
        </div>
        {open.map((v) => (
          <div className="wi-metric" key={v.positionId}>
            <span className="micro faint">{v.title}</span>
            <b className="micro">open {v.quartersOpen} quarters</b>
          </div>
        ))}
        <div className="wi-metric" style={{ marginTop: 'var(--s3)' }}>
          <span>People who moved in or out</span>
          <b>{movement.length}</b>
        </div>
        {movement.map((mv) => (
          <div className="wi-metric" key={`${mv.personId}-${mv.toPositionId}`}>
            <span className="micro faint">
              {mv.fromDivision === division
                ? `${mv.name} left for ${mv.toDivision}`
                : `${mv.name} arrived from ${mv.fromDivision}`}
            </span>
            <b className="micro">{mv.date}</b>
          </div>
        ))}
      </div>

      {/* ---- Organisational changes --------------------------------------- */}
      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 'var(--s3)' }}>
          Organisational changes
        </div>
        <ChangeLog
          model={model}
          range={range}
          onOpenPerson={onOpenPerson}
          onOpenPosition={() => undefined}
          limit={8}
        />
      </div>
```

- [ ] **Step 3: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/views/DeptView.tsx
git commit -m "feat: show turnover, succession and movement on the department page

An insight card that sends a reader to a page without the supporting
evidence has not explained anything."
```

---

## Task 15: Add the progression signal to the person page

**Files:**
- Modify: `src/components/views/PersonDetail.tsx`

**Interfaces:**
- Consumes: `progressionFor`, `PROGRESSION_BASIS` from `progression.ts`
- Produces: no new exports; `PersonDetail` gains a career-snapshot row and a signal block

- [ ] **Step 1: Add the imports and computation**

In `src/components/views/PersonDetail.tsx`, add:

```tsx
import { PROGRESSION_BASIS, progressionFor } from '../../domain/progression.ts';
import { tenureYears } from '../../domain/workforce.ts';
```

After `const stillHere = ...`:

```tsx
  const progression = progressionFor(model, personId);
  const years = tenureYears(model, personId);
  const transfers = (() => {
    let n = 0;
    for (let i = 1; i < assignments.length; i++) {
      const from = model.positions.get(assignments[i - 1].positionId);
      const to = model.positions.get(assignments[i].positionId);
      if (from && to && from.division !== to.division) n++;
    }
    return n;
  })();
```

- [ ] **Step 2: Add the career snapshot**

Insert immediately after the profile header card (`</div>` closing the first `card`):

```tsx
      {/* ---- Career snapshot --------------------------------------------- */}
      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 700 }}>Career snapshot</div>
        <div className="wi-kpis" style={{ marginTop: 'var(--s4)' }}>
          <div className="wi-kpi" style={{ cursor: 'default' }}>
            <span className="wi-kpi-label">Years with the organisation</span>
            <span className="wi-kpi-value tnum">{years === null ? '—' : years.toFixed(1)}</span>
          </div>
          <div className="wi-kpi" style={{ cursor: 'default' }}>
            <span className="wi-kpi-label">Time in current role</span>
            <span className="wi-kpi-value tnum">
              {progression ? progression.yearsInRole.toFixed(1) : '—'}
            </span>
          </div>
          <div className="wi-kpi" style={{ cursor: 'default' }}>
            <span className="wi-kpi-label">Role transitions</span>
            <span className="wi-kpi-value tnum">{Math.max(0, assignments.length - 1)}</span>
          </div>
          <div className="wi-kpi" style={{ cursor: 'default' }}>
            <span className="wi-kpi-label">Department transfers</span>
            <span className="wi-kpi-value tnum">{transfers}</span>
          </div>
        </div>
      </div>
```

- [ ] **Step 3: Add the signal block**

Insert directly after the career snapshot card:

```tsx
      {/* ---- The progression signal ---------------------------------------
       *
       * Deliberately never says this person should be promoted. It reports
       * three checks against the record and shows which ones hold, so the
       * reader can disagree with any of them. That is the difference between
       * evidence for a review and a decision taken on someone's behalf.
       */}
      {progression ? (
        <div className={`wi-signal ${progression.signal ? 'wi-signal--positive' : 'wi-signal--review'}`}>
          <span className="wi-sev">{progression.signal ? 'Signal' : 'No signal'}</span>
          <h4>
            {progression.signal
              ? 'Potentially ready for progression review'
              : 'No progression signal from the record'}
          </h4>
          <p className="wi-statement">
            {progression.signal
              ? 'Every check below is met by this person’s recorded history. This is a prompt for a human review, not a recommendation.'
              : 'One or more checks are not met. This says nothing about their performance — only what the records show.'}
          </p>

          <div className="wi-area-label" style={{ marginTop: 'var(--s4)' }}>
            Why this signal appears
          </div>
          <ul className="wi-ev">
            {progression.checks.map((c) => (
              <li key={c.label} style={{ alignItems: 'flex-start' }}>
                <span style={{ color: c.met ? 'var(--ok-bar)' : 'var(--ink-4)', fontWeight: 700 }}>
                  {c.met ? '✓' : '–'}
                </span>
                <span>
                  <b style={{ color: 'var(--ink)' }}>{c.label}</b>
                  <div className="micro faint">{c.detail}</div>
                </span>
              </li>
            ))}
          </ul>

          <p className="wi-basis">{PROGRESSION_BASIS}</p>
          <p className="wi-basis" style={{ borderTop: 0, paddingTop: 0 }}>
            Performance evidence unavailable. This signal rests on role history and
            tenure alone.
          </p>
        </div>
      ) : null}
```

The `.wi-ev li::before` bullet must not appear here. Add to `src/styles/app.css`:

```css
.wi-signal .wi-ev li:has(> span:first-child)::before { content: none; }
```

- [ ] **Step 4: Typecheck and build**

Run: `npm run typecheck && npm run build`
Expected: PASS

- [ ] **Step 5: Check it in the browser**

Run: `npm run dev`

Open a person from the People tab. Confirm the career snapshot and the signal block render, that ticks and dashes match the detail text, and that nobody is told they should be promoted. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add src/components/views/PersonDetail.tsx src/styles/app.css
git commit -m "feat: show the progression signal and its evidence on a person

Three checks, each shown as met or not, with the rule beneath them. It
never says the person should be promoted."
```

---

## Task 16: Final verification and documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/BRIEF-MAPPING.md`

- [ ] **Step 1: Run everything**

Run: `npm run verify && npm run typecheck && npm run build && npm run smoke`
Expected: all PASS, all checks `ok`

- [ ] **Step 2: Read the signals one last time**

Run: `npm run verify`

Read the `=== SIGNALS ===` output. Confirm every statement is true of the data, and that none of them contains a probability, a prediction about a named person, or a claim that a department needs a specific number of staff. Fix any wording that does.

- [ ] **Step 3: Check both target widths**

Run: `npm run dev`

At 1440px and 1920px confirm: four KPIs in a row, four insight cards in a row, areas 2×2, no horizontal scrollbar on the body. Stop the server.

- [ ] **Step 4: Update the README**

In `README.md`, add a row to the table under "What Silsilah does":

```markdown
| Turn that history into HR signals | **Workforce Intelligence** — the landing page: retention, succession, span and role-proliferation signals, each with the rule that produced it |
```

And add this after that table:

```markdown
### Workforce Intelligence

The landing page reads the reconstructed history and surfaces what an HR reader
would otherwise have to assemble by hand. Every figure is derived from the
loaded file; nothing is typed in. Where the records cannot answer — workload,
performance, required capacity — the page says so rather than estimating.

It surfaces signals for review. It does not predict, score anyone, or make an
employment decision. The rule behind every derived figure is printed next to it.
```

- [ ] **Step 5: Update the brief mapping**

Append to `docs/BRIEF-MAPPING.md`:

```markdown
## Workforce Intelligence

| Requirement | Where it lives |
| --- | --- |
| Workforce snapshot | `WorkforceView` — four KPIs, each derived and each a link |
| What should HR know? | `insights.ts` — eight detectors, top four shown, each expandable to its records |
| Developing the right people | `progression.ts`, `structure.ts` |
| Right workforce structure | `structure.ts`, `workforce.ts` — capacity flagged as requiring planning data |
| Retaining our people | `workforce.ts` — departures, division turnover, retention signals |
| How the organisation is evolving | `RoleTrend`, `mobility.ts` |
| Department drill-down | `DeptView` — turnover, succession, movement, changes |
| Person drill-down | `PersonDetail` — career snapshot, progression signal, evidence |
```

- [ ] **Step 6: Commit**

```bash
git add README.md docs/BRIEF-MAPPING.md
git commit -m "docs: record the Workforce Intelligence layer"
```

---

## Self-Review Notes

**Spec coverage:** §1 hierarchy → Tasks 8, 10. §2 decisions → Tasks 2, 13. §3 rules → Tasks 4–7 (proxy basis strings exported and rendered). §4 small numbers → `THIN_DENOMINATOR`, `thin` flag, Task 10 KPI copy. §5 window → Task 3. §6 A–F → Tasks 10, 11, 12. §7 demo case → the retention detector selects it by magnitude. §8 files → all created. §9 visual → Task 9. §10 testing → Tasks 1–8. §11 acceptance → Task 16.

**Known follow-up:** `metrics.ts` still computes `headcountByQuarter` independently of `workforce.headcountAt`. Both agree today (asserted in Task 4). Consolidating them is worthwhile but out of scope here.
