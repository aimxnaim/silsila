# Workforce Intelligence — design

**Date:** 2026-08-22
**Status:** approved for planning
**Scope:** new landing page + insight engine, plus targeted additions to the
existing department and person views.

---

## 1. What this is

A front door for HR that answers four questions in the order HR asks them:

1. What is happening in the workforce?
2. What may need attention?
3. What can be learned from the organisational data?
4. Where should HR look for evidence?

The page follows one hierarchy throughout:

```
DATA → PATTERN → INSIGHT → EVIDENCE → HR REVIEW
```

It surfaces **signals for review**. It does not make HR decisions. No card ever
says a person will be promoted or will resign; the vocabulary is
"potentially ready for progression review", "retention signal detected",
"management capacity may be stretched", "succession coverage gap".

### What it is not

Not a chart wall. Charts appear only where a shape carries meaning a number
cannot — role counts over time, headcount trend, mobility flows. Three visuals
on the whole page.

---

## 2. Decisions taken

| Decision | Choice | Reason |
|---|---|---|
| Figures | Computed from the loaded CSV | `metrics.ts` already holds this rule: nothing is typed by a human. Load a different file, the page changes. |
| Placement | Replaces Overview as the landing page | The brief calls for one main landing page; two dashboards would compete. |
| Missing fields | Derived by a stated, visible rule | Four headline sections would otherwise be blank. Every proxy prints its rule on screen. |
| Drill-down | Landing + extend `DeptView` and `PersonDetail` | Closes the DATA→ACTION loop end to end. |
| Mobility data | Add cross-division transfers to the generator | The dataset currently has zero; the section would render empty. |
| Backend | None | Every insight is derivable in-browser. A database would relocate rows, not unlock insight, and would break "drop in your own CSV". |

---

## 3. Derivation rules

These rules **are** the product. Each is printed next to the figure it
produces, under a `basis` line. A signal HR cannot interrogate is a signal HR
will not trust.

### Directly recorded

| Concept | Rule |
|---|---|
| Headcount at quarter *q* | Distinct people with a live assignment at *q* |
| Internal move | Consecutive assignments for one person, different position |
| — *transfer* | …and `division` differs |
| — *progression* | …and `level` rises |
| — *lateral* | …and `level` is flat or unknown |
| Management span | Live positions whose current holder's `reportsToPositionId` is this seat |
| Reporting depth | Longest root-to-leaf path in the hierarchy at *q* |
| Role proliferation | Distinct live titles over time, split by lineage verdict |

### Derived, stated on screen

| Concept | Rule |
|---|---|
| Departure | A person's last assignment has an `endDate` and no assignment starts after it |
| Turnover | Departures in range ÷ mean quarterly headcount over range |
| Vacancy | Position live at *q* with no live assignment |
| Tenure | First assignment start → today (or last end, if departed) |

### Proxy — rule shown verbatim in the UI

| Concept | Rule | UI wording |
|---|---|---|
| Critical role | Live seat with ≥1 direct report, **or** grade ≥6, held by one person | "Derived: seats carrying direct reports or grade 6+" |
| Succession covered | ≥1 live direct report within 2 grades whose holder has ≥2 years tenure | "Derived: a direct report within two grades, two years' tenure" |
| Progression signal | Time in current role ≥ org median **and** ≥1 prior grade increase **and** below the division's grade ceiling | "Derived: tenure, prior progression, headroom" |
| Stagnation signal | Tenure ≥3 years with zero position changes | "Derived: tenure without movement" |

### Not derivable — explicit empty states

Rendered with the existing `--hatch` token, which the design system already
reserves for "we do not know".

| Absent | Wording |
|---|---|
| Workload / required capacity | "Capacity assessment requires additional workforce planning data." |
| Staffing sufficiency | "Staffing sufficiency cannot be determined from headcount alone." |
| Performance records | "Performance evidence unavailable." |
| Broken history | "Historical data gap detected." |

---

## 4. Small-number honesty

The dataset carries 67 people (64 currently in seats) and 3 departures. A
percentage on that base is volatile — Group Human Capital reads as roughly 29%
turnover off two people.

Rules:

- **Counts lead, percentages follow.** "2 departures of 7 people", never "29%".
- Any rate computed on a denominator below 10 carries a "thin data" marker.
- No trend arrow is drawn from fewer than two periods of actual movement.

---

## 5. The time filter

Records run 2021 Q1 → 2025 Q2. Presets map to quarter counts: 4 / 8 / 12 / all.
"vs previous period" compares the immediately preceding window of equal length.

The control reads **"Last 12 months of records"**, not "Last 12 months",
because the dataset's present is not today's date. Pretending otherwise is the
class of quiet dishonesty this product exists to correct.

---

## 6. Page structure

### A. Header
`SILSILA / Workforce Intelligence`, the subtitle, the range control, and a
"Records current to <date>" indicator derived from the latest date in the data.

### B. Workforce snapshot
Four KPI cards, each a link to its section: Total employees · Turnover ·
Internal mobility · Critical roles. Numbers and one supporting line each. No
charts inside the cards.

### C. "What should HR know?"
The most important section. Detectors run; the top four signals render as
cards ranked by severity then magnitude. A detector that finds nothing returns
`null` and is absent — no empty scaffolding.

Card anatomy:

```
severity → title → one-sentence statement → evidence bullets
         → basis (the rule) → CTA
```

Clicking the card body **expands the underlying records inline** — the actual
departures, the actual spans, named and dated. The CTA is the separate,
deliberate act of leaving the page. This is what makes an insight explainable
rather than another dashboard hop.

Detector pool:

| Detector | Severity | Fires on |
|---|---|---|
| `departmentTurnover` | attention / review | Departures concentrated in one division |
| `managerSpan` | review | A span ≥1.5× the mean |
| `progressionCandidates` | positive | People meeting the progression rule |
| `roleProliferation` | review | Title growth outpacing headcount growth |
| `successionGap` | attention / review | Critical roles with no covered successor |
| `stagnation` | review | Long tenure without movement |
| `vacancyPersistence` | review | Seats open across multiple quarters |

### D. Four intelligence areas — 2×2

1. **Are we developing the right people?** — career progression · succession coverage
2. **Do we have the right workforce structure?** — capacity · bottlenecks
3. **Are we retaining our people?** — turnover · retention signals
4. **How is our organisation evolving?** — role evolution · career mobility

### E. Departments
Cards showing headcount, leader / manager / member split (derived from grade
band and whether the seat carries reports), turnover, open seats, status.
Clicking opens the existing `DeptView`.

### F. Recent organisational changes
Timeline built from the existing `changeFeed`, extended with promotions,
transfers and reporting-line changes. Every event opens its role or person.

---

## 7. The demo case the data already contains

Group Human Capital: 7 people over the period, 5 now, 2 of the company's 3
departures, and 1 seat still open. It is the clear outlier — every other
division lost at most one person.

Learning & Development Lead was merged into Talent & Development Lead in June
2024. Farah kept the merged seat; Gopal left the same day. Nurin, the Recruiter
reporting into the dissolved seat, left on that same date, and her seat remains
vacant.

A consolidation, two exits, one unfilled vacancy — three records, one story,
visible **only because positions carry lineage**. This is the signal the page
should surface first, and it validates the whole premise.

---

## 8. Files

### New domain modules — pure, no React

| File | Responsibility |
|---|---|
| `src/domain/window.ts` | `Range` type, presets, previous-period arithmetic |
| `src/domain/workforce.ts` | Headcount, departures, turnover, vacancies, tenure |
| `src/domain/structure.ts` | Spans, layers, critical roles, succession coverage |
| `src/domain/mobility.ts` | Moves, division flows, producers and receivers |
| `src/domain/progression.ts` | Per-person progression evidence |
| `src/domain/insights.ts` | Detectors → `Signal[]` |

### The `Signal` contract

```ts
export type Severity = 'attention' | 'review' | 'positive';

export interface Evidence {
  label: string;
  value: string;
  /** Records behind this line, revealed on expand. */
  records?: Array<{ id: string; kind: 'person' | 'position'; label: string }>;
}

export interface Signal {
  id: string;
  severity: Severity;
  title: string;       // "Retention concern"
  statement: string;   // one sentence, plain English
  evidence: Evidence[];
  basis: string;       // the derivation rule, verbatim
  action: { label: string; target: Target };
  magnitude: number;   // ranking only, never displayed
  thin: boolean;       // denominator below 10
}
```

### New components

`src/components/views/WorkforceView.tsx` plus `src/components/views/wi/`:
`InsightCard` · `AreaCard` · `MobilityFlow` · `RoleTrend` · `ChangeLog` ·
`SnapshotRow`

### Edited

| File | Change |
|---|---|
| `src/App.tsx` | Overview → Workforce Intelligence; range state |
| `src/components/views/DeptView.tsx` | + turnover, succession, mobility, changes |
| `src/components/views/PersonDetail.tsx` | + progression signal and "why this signal appears" |
| `src/styles/app.css` | Insight card, area card, flow, snapshot styles |
| `scripts/generate-dataset.mjs` | + ~6 cross-division transfers |

---

## 9. Visual direction

`tokens.css` already specifies exactly what the brief asks for: white cards on
a cool grey canvas, dark ink, hairline borders, one red accent, colour that
always does a job. The new page uses those tokens rather than introducing a
parallel palette.

- **Green** `--ok-*` — healthy
- **Amber** `--wr-*` — review
- **Red** `--brand` — attention, and nothing decorative
- **Hatch** `--hatch` — unknown

Content column stays at `--maxw` 1180px. Intelligence areas 2×2; insight cards
4-up, collapsing to 2-up below ~1100px. Works at 1440px and 1920px with no
horizontal scroll.

---

## 10. Testing

The project has no test runner — it verifies domain logic through
`scripts/verify-domain.mjs` (`npm run verify`). New domain modules follow that
convention rather than introducing vitest.

Assertions to add:

- Turnover on a known fixture equals a hand-computed figure
- A person with no `endDate` never counts as a departure
- A person who moves seats within a division is a move, not a departure
- Span counts only *live* reports at the given quarter
- Critical-role and succession rules match hand-worked examples
- Every detector returns `null` on an empty model rather than throwing
- Progression rule excludes anyone at their division's grade ceiling

Plus `npm run typecheck` and `npm run smoke` clean.

---

## 11. Acceptance

An HR reader opening the page understands within ten seconds:

1. How large the workforce is
2. Whether anything needs attention
3. Whether progression or succession opportunities exist
4. Whether there are retention concerns
5. Whether the structure is changing
6. Where to click next

And every number on the page can be traced to the records that produced it.
