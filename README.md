# Silsilah · سلسلة

**A history engine for organisational structure.**

Drop in one spreadsheet. Silsilah rebuilds how a role evolved, how a person
moved, and where the two histories meet.

**Lab 2 — People-Centric Tech & Collaboration** · powered by Setel

| | |
| --- | --- |
| **Live demo** | `ADD DEPLOYMENT URL HERE` |
| **Repository** | `ADD REPOSITORY URL HERE` |
| **Stack** | React · TypeScript · Vite. No backend. |
| **Run it** | `npm install && npm run dev` |

> **Prototype.** All data is synthetic. No backend, no database, no accounts.
> Every file is parsed in the browser.

---

## The problem

HR systems store what is true **now**. Rename a role and the old title is
overwritten. Promote someone and the previous row is replaced. History is
destroyed by a normal `UPDATE`.

So two questions become hard or impossible:

- *Has this department actually grown, or have we just been renaming things?*
- *How does this person's career relate to the structural changes around them?*

## What it does

| Brief requirement | Where it lives |
| --- | --- |
| Accept structured org data | **Load data** — client-side CSV parsing, drag-and-drop |
| History of a role over time | **Roles** → detail panel: change history + lineage chain |
| Journey of a person over time | **People** → detail panel: trajectory, dates, manager changes |
| Connect the two views | **Overview** → headcount and structural change on one quarterly axis |
| Present it clearly | Hover a quarter for figures, click for its ledger |
| Handle incomplete records | Flagged at ingest, shown in place — never auto-filled |

Line-by-line audit: [docs/BRIEF-MAPPING.md](docs/BRIEF-MAPPING.md).

---

## The core idea: roles have lineage

Other tools record **that** a title changed. Silsilah decides **whether it was
still the same job**. Every transition is classified:

| Relation | Meaning |
| --- | --- |
| `rename` | Same job, new wording. Headcount did not grow. |
| `redesignated` | Same job, new wording **and** a changed grade. |
| `split` | One position divided into several. |
| `merge` | Several positions consolidated into one. |
| `created` | Genuinely new — no predecessor. |
| `succeeded` | Successor exists but titles barely overlap. Check by hand. |

That distinction drives the headline on the overview:

> **Headcount went from 44 to 64. 9 of those positions were relabelled, not created.**

### How it decides

Four signals, all shown in the interface:

| Signal | Measured by |
| --- | --- |
| Title similarity | Overlap coefficient over normalised title tokens |
| Date adjacency | Gap between predecessor closing and successor opening, decaying over 180 days |
| Reporting continuity | Whether the manager survived the handover |
| Structural certainty | Whether the declared dates exist at all |

`confidence = 0.45 × similarity + 0.30 × adjacency + 0.15 × reporting + 0.10 × structural`

**No model, no training data.** The reasoning is fully legible, so a reader can
disagree with the verdict.

<details>
<summary>Why overlap coefficient, not Jaccard</summary>

Job titles are two or three words long, so Jaccard punishes one changed word too
heavily:

```
"Branch Operations Executive"  →  "Branch Operations Specialist"

Jaccard:  1 shared / 3 union   = 0.33  →  NEW ROLE.  Wrong.
Overlap:  1 shared / 2 smaller = 0.50  →  RENAME.    Correct.
```

A real bug, caught by running the classifier headless. See
[src/domain/lineage.ts](src/domain/lineage.ts).
</details>

---

## Honest gaps

Silsilah detects four kinds of problem and refuses to guess past any of them:

- **Conflict** — two sources give different reporting lines for the same period
- **Missing** — no manager ever recorded against a position
- **Inferred** — a date is derived, not read from a record, and says so
- **Inconsistent** — an assignment runs past the life of its position

Unknown periods render as a **diagonal hatch**, never a colour — colour means
category, pattern means uncertainty. Survives greyscale and colour-blindness.

Conflicts can be settled in-session by choosing a source. **Silsilah reads; it
never writes back.**

A position with no manager *but* with subordinates is the top of the tree, not a
defect. Flagging the CEO as a data error is how warning systems die.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Typecheck, then production build into `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | TypeScript, no emit |
| `npm run verify` | Run the domain pipeline headless, print findings |
| `npm run smoke` | Render every view and panel; fail if any throws |
| `npm run generate:data` | Regenerate the demo dataset |

Static output — deploy with `npx vercel --prod`, `npx netlify deploy --prod --dir dist`,
or GitHub Pages against `dist/`.

---

## Using it

1. **Open the demonstration** — synthetic records for a fictional Malaysian bank:
   67 people, 84 positions, five and a half years.
2. **Overview** — hover a quarter for its figures, click to select it and the
   ledger follows. Switch to *Job by job* for one row per seat.
3. **Departments** — every division side by side. Open one for its people and grades.
4. Click any row or bar for its detail panel.
5. **Feature Analysis** — *General* reads the whole org; *By person* runs the
   same rules against one record. Every finding states the rule behind it.
6. **Load data** → *Download the sample*, edit it, drop it back in.

### Data format

Five required columns:

```
person_id, person_name, position_id, position_title, start_date
```

Thirteen optional columns, used when present:

```
org_unit, division, level, location, employment_type, position_created,
position_closed, end_date, reports_to_position, predecessor_positions,
change_reason, source, confidence
```

`predecessor_positions` is semicolon-separated — that is what drives lineage.
A missing required column produces a sentence naming it, not a blank screen.

---

## Architecture

```
CSV text
   ├─ parseCSV()          quote-aware reader, no dependency       domain/csv.ts
   ├─ ingest()            people · positions · assignments        domain/ingest.ts
   │                      collects every gap and conflict
   ├─ classifyLineage()   rename / split / merge / …              domain/lineage.ts
   ├─ metrics()           headline stats, headcount               domain/metrics.ts
   └─ React views         overview · roles · people · departments components/
```

```
src/
├── domain/        Pure TypeScript. No React. Runs headless in Node.
│   ├── types.ts       The data model
│   ├── dates.ts       Quarter quantisation
│   ├── csv.ts         Parser and required-column contract
│   ├── ingest.ts      Builds the model; collects data-quality issues
│   ├── lineage.ts     THE CLASSIFIER. The product is this file.
│   └── metrics.ts     Headline figures, snapshots, the connection
├── data/          Generated demo dataset
├── hooks/         The single piece of application state
├── components/    ui/ primitives · views/ one file per tab
└── styles/        tokens.css · base.css · app.css
```

The domain layer has **no React import anywhere** — which is what lets
`npm run verify` run the whole pipeline in Node. Every number in this README was
produced that way, not read off the screen.

More: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ·
[docs/DATA-MODEL.md](docs/DATA-MODEL.md) · [docs/DESIGN.md](docs/DESIGN.md)

**Why no backend.** Employment history is personal data under Malaysia's PDPA
2010. Parsing in the browser means records never leave the machine they are
already on: no upload, no vendor holding HR data, no breach surface.

---

## Verification

```
$ npm run verify

=== LINEAGE ===
created  68    merge  2    redesignated  2    rename  1    split  4    succeeded  1

rename         85%  sim 0.67  Branch Operations Executive  →  Branch Operations Specialist
merge         100%  sim 1.00  Cards Ops Lead + Payments Ops Lead → Payments & Cards Ops Lead
succeeded      55%  sim 0.00  Regional Sales Manager, Northern → Territory Growth Lead  [needs review]

=== DATA QUALITY ===
inferred      Start of Digital Onboarding Specialist is derived, not recorded
missing       No reporting line recorded for Sustainability Reporting Officer
inconsistent  Low Wai Kit is recorded in a closed position
conflict      Two sources disagree on who Vincent Chua Boon Hock reported to
```

```
$ npm run smoke
rendered 151 views and panels, 401 kB of markup
all clear
```

`smoke` renders every view **and all 78 position and 67 person panels** through
`react-dom/server`, so a chain that would break the renderer is found here rather
than when someone clicks it.

---

## Limitations

- **No persistence.** Refreshing clears loaded data and settled conflicts.
- **Synthetic data.** Shaped like a large Malaysian bank so it reads as familiar,
  but every record was written for this project. Not affiliated with any bank.
- **Lineage is declared, not discovered.** Predecessor links come from the file.
- **Whole organisation at once** in the history chart. Per-division history lives
  on the department pages.
- **Quarterly resolution.** A restructure lands in the right quarter, not the
  right day.

## What is next

- Infer predecessor links from redesignation letters instead of requiring them
- Restructuring impact: who was affected, and where they were six months later —
  as temporal association, never causation
- Precedent for employees: who held this seat before you, and where did they go
- Scheduled read-only sync against an HRIS export, then an embeddable widget

---

## Team

Eya Hia · Cheah Wan Xin · Muhammad Aiman Naim bin Mohd Faizul · Joanne Ngai Shi Ying

Built for DevLeague 2026, Xsolla Curine Academy, Kuala Lumpur.

*Silsilah* (سلسلة) is Arabic for *chain* — and the root of the Malay *salasilah*,
lineage. A chain of role changes, a chain of career moves, and a chain of custody
for the evidence behind both.
