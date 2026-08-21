# Build specification — Silsilah

> **How to use this document.** Paste it whole into Claude, ChatGPT, Cursor,
> Lovable, v0 or any coding agent. It is written to be sufficient on its own:
> a competent engineer or agent should be able to produce the application from
> this text without asking questions. Nothing is left to taste except where the
> document explicitly says so.

---

## 1. What you are building

Build **Silsilah** — a web application that reconstructs how an organisation's
structure changed over time, and shows how individual people's careers relate
to those structural changes.

It is a **read-only history layer** that sits on top of whatever HR system a
company already runs. It never writes back. The user exports a CSV from their
HR system, drops it in, and the application rebuilds a history the HR system
itself has destroyed.

Everything runs in the browser. **There is no backend, no database, no
authentication and no server-side code of any kind.**

## 2. The thesis — read this before writing any code

Every HR system on the market is a **state** system, not an **event** system.
It stores what is true *now*. When a role is renamed, the previous title is
overwritten. When someone is promoted, the previous row is replaced. History is
not lost by accident — it is destroyed as the normal consequence of an `UPDATE`
statement.

That creates two questions that no HR product can currently answer:

1. *"Has this department actually grown over three years, or have we just been
   renaming things?"*
2. *"How does this person's career relate to the structural changes around
   them?"*

The central insight, and the thing that makes this a product rather than a
chart: **every tool records THAT a job title changed; none of them decides
WHETHER it was still the same job.**

So the application treats a **position as a versioned object with lineage**.
Given predecessor links in the data, it classifies each transition as a rename,
a redesignation, a split, a merge, a genuinely new seat, or an unclear
succession. Organisations make budget, redundancy and pay-equity decisions on
the assumption that they know which of those happened. Mostly, they do not.

An accurate shorthand for the pitch: **version control for organisational
structure.** The formal term for the data model is **bitemporal** — every fact
has a *valid time* (when it was true in the world) and a *record time* (when the
system was told about it).

## 3. Technology and hard constraints

| Decision | Value |
| --- | --- |
| Framework | React 18 with TypeScript, `strict: true` |
| Build tool | Vite 5 |
| Styling | **Plain CSS with custom properties.** No Tailwind, no CSS-in-JS, no component library |
| Runtime dependencies | **`react` and `react-dom` only.** Nothing else |
| Backend | None. None at all |
| Persistence | None. Refreshing clears state, and the UI says so |
| Deployment target | Static hosting (Vercel / Netlify / GitHub Pages) |

**Write the CSV parser, the date handling, the classifier and the charts
yourself.** Do not install `papaparse`, `date-fns`, `recharts`, `d3` or
similar. This is not asceticism: the product's entire claim is that its
reasoning is legible, and an opaque dependency in the middle of that reasoning
undermines the argument. Each of these is 40–80 lines by hand.

### Why no backend — this is a feature, state it in the UI

Employment history is personal data under Malaysia's Personal Data Protection
Act 2010 (and GDPR elsewhere). Parsing in the browser means employee records
never leave the machine they are already on: no upload, no vendor holding HR
data, no cross-border transfer to assess, no breach surface. **The
architectural constraint and the privacy position are the same decision.**

## 4. Project structure

Create exactly this layout.

```
silsilah/
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json
├── index.html
├── public/
│   └── favicon.svg
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DATA-MODEL.md
│   ├── DESIGN.md
│   └── BRIEF-MAPPING.md
├── scripts/
│   ├── generate-dataset.mjs      writes the demo dataset
│   ├── verify-domain.mjs         runs the pipeline headless, prints findings
│   └── smoke-test.mjs            server-renders every view, fails on any throw
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── styles/
    │   ├── tokens.css            palette, type, spacing scale
    │   ├── base.css              reset, typography, shared primitives
    │   └── app.css               named components
    ├── domain/                   ← PURE TYPESCRIPT. NO REACT IMPORTS.
    │   ├── types.ts              the data model
    │   ├── dates.ts              quarter quantisation
    │   ├── csv.ts                parser + required-column contract
    │   ├── ingest.ts             builds the model, collects data issues
    │   ├── lineage.ts            THE CLASSIFIER — the product is this file
    │   ├── metrics.ts            headline figures, snapshots, the connection
    │   └── narrate.ts            verdicts → plain English sentences
    ├── data/
    │   └── demoDataset.ts        generated; do not hand-edit
    ├── hooks/
    │   └── useOrgModel.ts        the single piece of application state
    └── components/
        ├── Landing.tsx
        ├── ui/
        │   ├── primitives.tsx    Card, Badge, Button, Eyebrow, Notice, SignalBar
        │   ├── Drawer.tsx
        │   └── vocabulary.tsx    relation labels and colours, in one place
        └── views/
            ├── TimelineView.tsx
            ├── RolesView.tsx
            ├── PeopleView.tsx
            ├── QualityView.tsx
            ├── LoadDataView.tsx
            ├── RoleDetail.tsx
            └── PersonDetail.tsx
```

**The `src/domain/` folder must not import React anywhere.** That boundary is
what makes the verification scripts possible and lets the same logic drive a
CLI, a scheduled report, or an embedded widget later.

Use explicit `.ts` / `.tsx` extensions on every relative import, and set
`"allowImportingTsExtensions": true` in `tsconfig.json`. This lets Node run the
domain files directly with no build step.

## 5. The data model

Three objects and one relationship. Put this in `src/domain/types.ts` with the
explanatory comments intact.

```ts
export type ISODate = string;                       // "YYYY-MM-DD"
export type SourceConfidence = 'high' | 'medium' | 'low';

export interface Person {
  id: string;
  name: string;
  assignmentIds: string[];        // ordered by start date
}

export interface Position {       // a SEAT, existing independently of any human
  id: string;
  title: string;
  orgUnit: string;
  division: string;
  level: number | null;           // job grade; higher is more senior
  location: string | null;
  createdAt: ISODate | null;
  closedAt: ISODate | null;
  predecessorIds: string[];       // what this seat descends from
  assignmentIds: string[];
}

export interface Assignment {     // THE JOIN. person × position × time
  id: string;
  personId: string;
  positionId: string;
  startDate: ISODate;
  endDate: ISODate | null;
  reportsToPositionId: string | null;
  employmentType: string | null;
  changeReason: string | null;
  source: string;                 // shown next to every claim
  confidence: SourceConfidence;
  startDateInferred: boolean;     // true when WE derived it, not the record
}

export type LineageRelation =
  | 'rename'        // same job, new wording. Headcount did not grow.
  | 'redesignated'  // same job, new wording AND a changed grade.
  | 'split'         // one position divided into several.
  | 'merge'         // several positions consolidated into one.
  | 'created'       // genuinely new. No predecessor.
  | 'succeeded';    // predecessor exists but titles barely overlap.

export interface LineageSignals {
  titleSimilarity: number;        // 0..1
  dateAdjacency: number;          // 0..1
  reportingContinuity: number;    // 0 or 1
  structuralCertainty: number;    // 0..1
}

export interface LineageVerdict {
  positionId: string;
  relation: LineageRelation;
  predecessorIds: string[];
  confidence: number;             // 0..1, the weighted blend
  signals: LineageSignals;        // rendered on screen beside the verdict
  reasoning: string;              // plain English
  needsReview: boolean;
}

export type IssueKind = 'conflict' | 'missing' | 'inferred' | 'inconsistent';

export interface DataIssue {
  id: string;
  kind: IssueKind;
  title: string;
  detail: string;
  subjectId: string;
  subjectKind: 'position' | 'person';
  options?: Array<{               // for conflicts: the competing records
    label: string;
    source: string;
    reportsToPositionId: string | null;
    confidence: SourceConfidence;
  }>;
  resolution?: {                  // set when a human chooses; originals untouched
    chosenLabel: string;
    reportsToPositionId: string | null;
    resolvedAt: string;
  };
}

export interface OrgModel {
  people: Map<string, Person>;
  positions: Map<string, Position>;
  assignments: Map<string, Assignment>;
  lineage: Map<string, LineageVerdict>;
  issues: DataIssue[];
  window: { startYear: number; startQuarter: number; quarterCount: number };
  datasetLabel: string;
  stats: { rowsRead: number; rowsUsed: number; rowsSkipped: number };
}
```

**Why this shape.** A conventional HR row stores `employee.job_title` as a
string on the person. Overwriting it destroys three facts at once: what the
title used to be, whether the new title is the same job, and that a specific
human was sitting there while it changed. Splitting into Person / Position /
Assignment preserves all three. `Assignment` is the join that makes the
connection view possible; `LineageVerdict` is the part nobody else models.

## 6. Input format

### Required columns — without these there is no timeline

```
person_id, person_name, position_id, position_title, start_date
```

### Optional columns — used when present, absent gracefully

```
org_unit, division, level, location, employment_type,
position_created, position_closed, end_date,
reports_to_position, predecessor_positions, change_reason,
source, confidence
```

`predecessor_positions` is **semicolon-separated** and is what drives lineage.
`source` and `confidence` are what make a finding auditable.

### Parser requirements

- Quote-aware: handle `"Smith, John"` and doubled `""` escapes.
- Normalise headers to lowercase with underscores.
- **On a missing required column, throw a typed `CSVError` carrying a message
  that names the missing column and a hint listing what was actually found.**
  Never white-screen. Someone will drop in their own spreadsheet, and what
  happens in that moment is the credibility of the whole product.
- Skip rows lacking `person_id`, `position_id` or a parseable `start_date`, and
  report the count as `stats.rowsSkipped`.

## 7. The classifier — `src/domain/lineage.ts`

This is the product. Implement it exactly.

### 7.1 Title tokenisation

Lowercase, strip non-alphanumerics, split on whitespace, drop tokens of length
≤ 1, drop these stopwords:

```
of, and, the, for, to, a, an, in, at, on,
group, senior, junior, assistant, associate, i, ii, iii, iv
```

### 7.2 Title similarity — overlap coefficient, NOT Jaccard

```
similarity = |A ∩ B| / min(|A|, |B|)
```

**This is a real engineering decision and you must be able to defend it.** Job
titles are two or three meaningful words long. Jaccard divides by the size of
the union, so changing one word out of three collapses the score:

```
"Branch Operations Executive"  →  "Branch Operations Specialist"

Jaccard:  1 shared / 3 union   = 0.33  →  classified as a NEW ROLE.  Wrong.
Overlap:  1 shared / 2 smaller = 0.50  →  classified as a RENAME.    Correct.
```

Overlap divides by the smaller set, which is correct when comparing short
phrases where one is often a near-subset of the other. Put this comparison in a
code comment.

### 7.3 Date adjacency

```
gap = |successor.createdAt − predecessor.closedAt| in days
adjacency = max(0, 1 − gap / 180)
adjacency = 0.3 when either date is missing   // don't reward, don't punish hard
```

### 7.4 Reporting continuity

`1` if the predecessor and successor share the same *dominant* manager (the
`reportsToPositionId` appearing most often across that position's assignments),
otherwise `0`.

### 7.5 Structural certainty

`1` when both `predecessor.closedAt` and `successor.createdAt` exist, else `0.5`.

### 7.6 The blend

```
confidence = 0.45 × titleSimilarity
           + 0.30 × dateAdjacency
           + 0.15 × reportingContinuity
           + 0.10 × structuralCertainty
```

### 7.7 The decision tree

```
if predecessors.length === 0            → 'created',      confidence 0.9
if predecessors.length  >  1            → 'merge',        confidence max(0.7, blend)
if the predecessor has >1 successor     → 'split'
else if similarity ≥ 0.5 && grade changed → 'redesignated'
else if similarity ≥ 0.5                → 'rename'
else                                    → 'succeeded'

needsReview = (relation === 'succeeded') || (confidence < 0.5)
```

### 7.8 Non-negotiable presentation rule

**Every one of the four signals must be rendered on screen next to the
verdict**, as a labelled bar with its percentage.

A confidence score on its own is an assertion. A confidence score with its
inputs beside it is an argument, and an argument can be disagreed with. That
difference is the only reason a finding here could be taken to an audit
committee. There is no model and no training data — say so in the interface.

## 8. Data-quality detection — `src/domain/ingest.ts`

Detect exactly four classes. **Never fill a gap to make the picture tidy.**

| Kind | Rule |
| --- | --- |
| `inferred` | Position has no `position_created`. Derive it from the earliest assignment, mark `startDateInferred = true`, and raise an issue saying the seat may be older than shown. |
| `missing` | Position has no manager on any assignment **AND** no other position reports into it. |
| `inconsistent` | An assignment's `end_date` is later than its position's `position_closed`. |
| `conflict` | Two or more assignment rows share the same `(personId, positionId)` but name different `reportsToPositionId`. Surface both sources and let a human choose. |

### The false-positive rule — implement this, it matters

For `missing`, the second condition is essential. A position with no manager
**but with subordinates** is simply the top of the tree, not a defect. Flagging
the chief executive as a data problem is exactly the kind of false positive that
teaches people to ignore warnings. **False positives are how warning systems
die.**

### Resolution semantics

Resolving a conflict **must not modify any record.** Attach a `resolution`
object — chosen source, resulting reporting line, ISO timestamp — to the issue.
Both competing records stay in the model. Display the sentence:
*"Silsilah reads; it never writes back."*

## 9. Metrics — `src/domain/metrics.ts`

- `headcountByQuarter[q]` = count of distinct people holding any position at the
  end of quarter `q`.
- `renameCount` = `rename` + `redesignated`.
- **`genuinelyNewCount` = `created` positions whose `createdAt` is AFTER the
  first quarter of the window.** A position that already existed on day one is
  not growth; it is simply where the records begin. Counting those as growth
  inflates the headline by an order of magnitude — which is precisely the error
  this product exists to correct. Report the remainder as `preExistingCount`.
- `snapshotAt(model, quarter)` → who held which position at that moment.
- `structuralChangesFor(model, personId)` → **the connection.** The structural
  events that happened to the seats a person occupied.
- `lineageChain(model, positionId)` → `{ ancestors, self, successors }`, with a
  visited-set guard against cycles.

## 10. Plain English — `src/domain/narrate.ts`

The classifier says `succeeded` at 0.55 confidence. That is precise and useless
to a first-time reader, who should not have to learn a vocabulary before the
chart means anything.

Provide a translation layer in the **domain**, not in a component, so that the
terminal verification output and the interface say the same words.

**Pill labels** (four words maximum):

| Relation | Label |
| --- | --- |
| `rename` | Renamed |
| `redesignated` | Renamed + regraded |
| `split` | Split |
| `merge` | Merged |
| `created` | Brand new |
| `succeeded` | Needs a check |

**One-line meanings:**

| Relation | Meaning |
| --- | --- |
| `rename` | Same job, new title. Nobody was hired. |
| `redesignated` | Same job, new title and a new grade. Nobody was hired. |
| `split` | One job became two. Real growth, from an existing seat. |
| `merge` | Several jobs became one. Headcount fell. |
| `created` | A brand new job that did not exist before. Real growth. |
| `succeeded` | Replaced an older job, but the work looks different. A person should check. |

**`narratePosition(model, position)`** returns a full sentence naming the actual
predecessor and the actual date. For example:

> *"This is the same job as 'Branch Operations Executive', given a new title in
> Jul 2022. Nobody was hired — the headcount did not change. Existed Jul 2022 to
> Dec 2023."*

**`featuredPerson(model)`** returns whoever has the most rename/redesignation
events under them with at least two distinct titles. Used to open the Timeline
with a named human story rather than an abstract chart.

## 11. Design system

The direction is **Swiss editorial**: paper, ink, vermillion, saffron, stone.
Large type, hard colour blocks, flat fills, **no gradients and no shadows**.

It is deliberately neither of the two things most products choose — the grey
enterprise dashboard, or the purple-gradient "AI startup" look.

### 11.1 The governing rule

**Colour always does a job. The same hue never means two things.**

| Colour | Meaning |
| --- | --- |
| Vermillion | A role — and the present moment |
| Ink | A person |
| Saffron | A structural event, or something needing a human |
| Stone | A reporting line, and every neutral surface |
| Hatch | We do not know |

### 11.2 The move that lets the rest be bold

**Uncertainty is drawn as a diagonal hatch with a dashed border and no hue at
all.**

An amber "gap" colour would consume one of only two accents, and a colour always
looks like it might be a category. A pattern does not. It also survives
greyscale printing and colour-blindness — both matter, because this output gets
printed and handed to committees. It is the convention statistical charting
already uses.

```css
--hatch: repeating-linear-gradient(
  45deg,
  var(--stone), var(--stone) 5px,
  var(--paper) 5px, var(--paper) 10px
);
```

### 11.3 Tokens

```css
:root {
  --paper:     #FAF9F5;   /* warm white, never clinical white */
  --paper-2:   #F2F0E9;
  --ink:       #111110;
  --ink-2:     #5C5A54;
  --ink-3:     #8A877E;
  --stone:     #EAE8E1;
  --hairline:  #DCD9D0;

  --vermillion:      #E03A17;
  --vermillion-tint: #FBE2DB;
  --vermillion-deep: #8F2308;
  --saffron:         #FFC300;
  --saffron-deep:    #3D2E00;
  --saffron-mid:     #5C4700;

  --sans:   'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --arabic: 'IBM Plex Sans Arabic', var(--sans);
  --mono:   'IBM Plex Mono', ui-monospace, monospace;

  --s1:4px; --s2:8px; --s3:12px; --s4:16px;
  --s5:24px; --s6:32px; --s7:48px; --s8:64px; --s9:96px;

  --radius: 6px;
  --maxw: 1180px;
}
```

**Two accents only.** The moment a third appears it is a rainbow and the
discipline collapses.

### 11.4 The rules that stop it looking like a student project

Bold design fails when it is *almost* bold. Each of these is a commitment:

- **Type gets big.** Hero is `clamp(40px, 7vw, 76px)`. Timid type is what makes
  a colourful design look amateur.
- **Never a gradient.** Flat fills only.
- **No shadows.** Hairline borders instead.
- **Whitespace stays generous.** Bold colour needs room.
- **An 8px grid.** Every gap is 8/16/24/32/48/64/96. No exceptions except 4px
  for tight optical work.
- **`font-variant-numeric: tabular-nums`** on every number in a table or beside
  a label, so columns align and a moving slider does not make the layout twitch.

### 11.5 Type

| Family | Job |
| --- | --- |
| Inter 400/500 | Everything |
| IBM Plex Sans Arabic | The wordmark سلسلة. Inter has no Arabic coverage — without this the mark silently falls back to something ugly |
| IBM Plex Mono | Dates, identifiers, the slider readout |

### 11.6 Light only

Commit to light and declare `color-scheme: light`. HR records are read in
offices and printed for committees; a dark theme is a consumer signal working
against the whole direction. Include a **print stylesheet** so `Ctrl/Cmd+P`
produces a clean review pack — chrome hidden, colour blocks converted to
outlines. That printed artefact is what an HR lead actually hands upward.

### 11.7 Two layout bugs to avoid — these are easy to hit

1. **A flex item defaults to `min-width: auto`,** so a horizontally scrolling
   tab strip inside a flex row will push its container past the viewport and
   make the whole page scroll sideways. Set `min-width: 0` on it.
2. **`grid-template-columns: repeat(auto-fit, minmax(300px, 1fr))` overflows**
   on a narrow screen, because a 300px minimum cannot fit a 264px content box.
   Always write `minmax(min(300px, 100%), 1fr)`.

Every page must share one centred `max-width: 1180px` shell. The body must never
scroll horizontally; wide content scrolls inside its own container.

### 11.8 Accessibility

- Arrow keys move the time slider; `Escape` closes the detail panel.
- Style `:focus-visible` in vermillion; never suppress it.
- Honour `prefers-reduced-motion`.
- **Uncertainty is encoded as pattern, not hue** — no meaning carried by colour
  alone.

## 12. Screens

### 12.1 Landing

Full height. Top strip: two small uppercase labels — "Organisational memory"
left, "Prototype · synthetic data" right.

Centre block:
- Wordmark: `SILSILAH` │ vertical hairline │ `سلسلة` (RTL, Arabic font)
- Hero, 76px: **"Every change,"** newline **"in order."** with *in order.* in
  vermillion
- Subheading, ~52ch: *"Roles get renamed. Teams split. People move. Your HR
  system overwrites all of it. Silsilah puts the history back — and shows where
  a person's story meets the structure's."*
- Two buttons: "Use demo dataset" (ink fill), "How it decides" (outline)
- **Three colour blocks, 16px apart**, no radius, no shadow:

| Block | Fill | Content |
| --- | --- | --- |
| 1 | Vermillion, white text | *N* roles renamed, split or merged — not created |
| 2 | Saffron, dark text | *N* genuinely new seats in five years |
| 3 | Ink, paper text | *N* findings we can't confirm |

**Those three numbers must be COMPUTED from the demo dataset at page load,
never typed.** Drop in a different file and the headline changes. Wrap the
computation in `try/catch` so a broken statistic can never take down the front
door. Print a line underneath saying how many people and positions they were
derived from.

Then a short "The idea" section — *"A rename is not a new role"* — with four
cards naming the four signals.

### 12.2 Application shell

Sticky top bar: wordmark (clicking returns to landing), a pill showing the
loaded dataset's name, and five tabs underlined in vermillion when active:

**Timeline · Roles · People · Data quality · Load data**

### 12.3 Timeline — the most important screen

This is the requirement most implementations fail, by shipping two separate
trackers side by side. It must be **one shared time axis**.

Arrange the page in this exact order, because a first-time reader needs to get
their bearings without being told anything:

**(a) The question, in plain words.** Headline: *"Did we grow, or did we just
rename things?"* Then the answer in a sentence with real numbers, then five
number cards: renamed / split / merged / brand new / cannot confirm.

**(b) One named person, as a way in.** A callout with a 4px vermillion left
border:

> **Start here**
> **[Name]**
> Her HR record shows **3 different job titles** since 2021. Read on its own,
> that looks like someone who keeps moving around.
> ***She never changed jobs.*** The organisation renamed her seat underneath her.

With a button opening her record. **This is the single highest-value element on
the page** — it makes an abstract chart concrete before the reader reaches it.

**(c) Controls:** a division picker and the time slider with a monospace
readout.

**(d) "How to read this" — directly ABOVE the chart, not in a legend below it.**
Four keys, each a swatch plus a bold phrase plus a plain sentence:

| Swatch | Bold | Sentence |
| --- | --- | --- |
| Vermillion | Red bar = a job | One seat in the org chart. Starts when created, ends when closed. |
| Ink | Black bar = a person | The human sitting in that job, for exactly the period they sat in it. |
| Stone | Grey bar = their manager | Which job this one reported into at the time. |
| Hatch | Stripes = we don't know | The records never said. We leave the gap rather than guessing. |

Follow with one sentence: *"Time runs left to right, 2021 on the left to 2026 on
the right. The red vertical line is the moment you selected — drag the slider
and it moves. Click any bar to see where the information came from."*

**(e) The chart.** For each position in the chosen division, a group containing:

- **A group header stating the story as a sentence** — the `narratePosition()`
  output — plus the classification pill and grade. Not a bare pill. A pill
  reading "Succeeded" tells a first-time reader nothing; a sentence does.
- **Lane 1 — "The job"**: a vermillion bar spanning created→closed, labelled
  with its date range.
- **Lane 2 — "Sat in it"**: one ink bar per assignment, labelled with its date
  range. One row per human.
- **Lane 3 — "Reported to"**: stone bars, or **hatched bars where no manager was
  recorded**.

Requirements for the chart:
- **Year columns with vertical gridlines**, labelled `2021 2022 2023…` — not
  `Q3'23` ticks. A reader looking for 2023 should find a column labelled 2023.
- A **vermillion playhead**, 1px with a dot at its head, that animates as the
  slider moves.
- Row labels carry a small coloured square, an uppercase kind ("THE JOB", "SAT
  IN IT", "REPORTED TO") and the actual name.
- Bars carry their own date ranges as text.
- Clicking a job bar opens the position panel; clicking a person bar opens the
  person panel.
- Horizontal scroll inside the chart container only; the page must not scroll.

**(f) Below:** a snapshot table — *"Who was where in Q2 2024"* — that follows
the slider, and a headcount column chart with the current quarter in vermillion.

### 12.4 Roles

Headline: *"Which of these jobs are actually new?"* Filter chips per relation.
Grouped tables, columns: **The job · Part of · Existed from — to · How sure we
are**. Rows below the confidence threshold show *"a person should check"* in
saffron. Rows open the position panel.

### 12.5 People

Headline: *"Who had their job change around them?"* **Sorted by how many
structural changes happened underneath each person, not alphabetically.** Search
by name. Columns: **Person · In the records · Jobs held · Different titles ·
Times their job changed around them**.

### 12.6 Data quality

Headline: *"What we refuse to guess."* Four count cards, then a section per
kind. Conflicts render the competing sources side by side with a "Trust this
source" button on each. Once resolved, state who chose what and when, and repeat
that the original records are untouched.

### 12.7 Load data

Headline: *"Try it on your organisation."* A large dashed dropzone that turns
vermillion-tinted on hover. Buttons: choose a file, download the sample, reload
the demo. Two tables documenting required and optional columns with a plain
description of each. A closing panel explaining why there is no upload.

### 12.8 Detail panels

A right-hand drawer, 560px, slide-in, with a scrim. `Escape` closes it.

**Position panel:** classification pill and dates; the verdict sentence; **the
four signal bars with percentages**; the weighting line `0.45 / 0.30 / 0.15 /
0.10`; the overall confidence; a warning when it needs review; the lineage chain
(ancestors → this → successors, each clickable, current one outlined in
vermillion); every human who sat in it with dates, manager, reason and **source
document**; a button to show it on the timeline.

**Person panel:** badges for jobs held / distinct titles / structural changes. If
the person has multiple titles *and* at least one rename, show a callout:

> **What the raw record would suggest**
> An HR export shows [Name] under **N different job titles**. On paper that reads
> as someone who has moved around.
> *The lineage says otherwise: at least one of those changes was the same seat
> being relabelled. The organisation moved; the person did not.*

Then the trajectory, then **"What moved around them"** — the structural events
computed for the seats they occupied. That section is the connection made
visible, and it is the reason the product exists.

## 13. Demo dataset

Write `scripts/generate-dataset.mjs`, which emits `src/data/demoDataset.ts`
exporting a CSV string and a label.

**Keep it as a generator, not a hand-typed blob**, so that every planted case is
visible as intent rather than buried in 200 lines of CSV.

Scale: **~67 people, ~78 positions, ~80 assignment rows, Q1 2021 → Q2 2026 (22
quarters).** Six to eight divisions. Shape it like a large regional bank so it
reads as familiar.

**Plant one clean example of each lineage relation:**

| # | Story |
| --- | --- |
| A | A rename that later becomes a redesignation — **one person, one job, three titles.** This is your demo protagonist. |
| B | One manager role splitting into two |
| C | Two leads merging into one, with the displaced person redeployed elsewhere |
| D | A succession where titles barely overlap (e.g. "Regional Sales Manager, Northern" → "Territory Growth Lead") so `succeeded` fires |
| E | A second split, in engineering |
| F | A redesignation with a grade change |
| G | A second merge, in HR |
| H | A cohort of genuinely new seats (e.g. three AI roles created in 2025) |

**Plant exactly one of each data-quality defect:**

- a `conflict` (org chart vs transfer letter naming different managers)
- a `missing` (a seat with no manager and no subordinates)
- an `inferred` (a position with no `position_created`)
- an `inconsistent` (an assignment running past its position's close date)

Give `source` values that read like real documents: *"HRIS export, row 214"*,
*"Redesignation letter dated 14 Jun 2022"*, *"Org chart 2023 (PowerPoint)"*,
*"Headcount spreadsheet 2022 (undated)"*.

### Labelling requirement — non-negotiable

The data is synthetic. **Say so prominently**, in the generator's header
comment, in the generated file, in the landing-page footer, and in the dataset
pill in the app bar. If you shape it like a real company, state explicitly that
every person, position, date and document reference was invented for this
project and that it is not affiliated with or endorsed by that company.

## 14. Verification — build both of these

### `npm run verify` — `scripts/verify-domain.mjs`

Runs the whole domain pipeline in Node and prints: ingest counts, a tally per
relation, every non-trivial verdict with its similarity and confidence, every
data issue, and the headline figures.

This is only possible because the domain layer has no React import. **It is how
you catch classification bugs**, which are invisible in the interface — a
misclassified rename looks like a perfectly normal row.

### `npm run smoke` — `scripts/smoke-test.mjs`

Bundle a server-render entry with esbuild (already present as a Vite
dependency), then render **every view and every single position and person
detail panel** through `react-dom/server`. Fail the process on any throw or any
suspiciously empty output.

A production build succeeding only proves the code compiles. This proves it
runs. With ~78 positions and ~67 people that is ~150 renders, and it will find
the one lineage chain that breaks the renderer before a user clicks it.

Put the bundle inside `node_modules/` so Node resolves `react` correctly.

## 15. Voice

Write interface copy the way a careful colleague explains something — direct,
specific, never salesy.

- Prefer **"Nobody was hired"** to "headcount neutral".
- Prefer **"we worked it out ourselves"** to "inferred".
- Prefer **"a person should check"** to "low confidence".
- Name real things: *"This is the same job as 'Branch Operations Executive'"*
  beats *"Renamed from predecessor"*.
- **State limitations before anyone finds them.** A README section headed
  *Limitations* that says plainly: no persistence, synthetic data, lineage is
  declared rather than discovered, one division at a time, quarterly resolution.
  A prototype that overclaims is worse than one that does not.

## 16. Do NOT build

Every one of these is hours of work with no return, and each converts a finished
product into a half-built one:

authentication · any backend or database · drag-to-edit org charting · a chat
interface over the data · future scenario planning · multi-tenancy · a mobile
app · a theme switcher · CSV writing or export back to the source system.

## 17. Definition of done

- [ ] `npx tsc --noEmit` passes with `strict: true`
- [ ] `npm run build` succeeds
- [ ] `npm run verify` prints a correct classification for all eight planted stories
- [ ] `npm run smoke` renders every view and panel with no throw
- [ ] `src/domain/` contains **zero** React imports
- [ ] Runtime dependencies are exactly `react` and `react-dom`
- [ ] The landing page's three numbers are computed, not typed
- [ ] All four signal bars appear beside every non-trivial verdict
- [ ] Unknown periods render as hatch, never as a colour
- [ ] Resolving a conflict does not modify any record
- [ ] The page never scrolls horizontally at any viewport width
- [ ] Every page shares one centred 1180px shell
- [ ] `Ctrl+P` produces a clean printed review pack
- [ ] Arrow keys move the slider; `Escape` closes the drawer
- [ ] The README states limitations plainly

---

## Appendix — the sentences worth keeping

Use these verbatim; each of them does real work.

> Every HR system stores what's true now. We store what happened.

> A rename is not a new role — and no system on earth can tell the difference.

> We'd rather show you a gap than guess.

> Their HR system is the system of record. This is the system of memory.

> Silsilah reads; it never writes back.

*Silsilah* (سلسلة) is Arabic for *chain*, and the root of the Malay *salasilah*,
lineage. A chain of role changes, a chain of career moves, and a chain of
custody for the evidence behind both.
