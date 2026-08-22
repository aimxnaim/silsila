# Silsilah · سلسلة

**A history engine for organisational structure.**

Silsilah reconstructs how an organisation actually changed — how a role evolved,
how a person moved, and where those two histories meet.

**Lab 2 — People-Centric Tech & Collaboration**
*Mapping How Roles and People Evolve Over Time · powered by Setel*

| | |
| --- | --- |
| **Live demonstration** | `ADD DEPLOYMENT URL HERE` |
| **Repository** | `ADD REPOSITORY URL HERE` |
| **Stack** | React · TypeScript · Vite. No backend. |
| **Run it** | `npm install && npm run dev` |

> **Prototype.** All data in this build is synthetic. There is no backend, no
> database and no account system. Every file is parsed in the browser.

---

## The problem

Every HR system on earth is a **state** system, not an **event** system. It
stores what is true *now*.

Rename a role and the old title is overwritten. Promote someone and the previous
row is replaced. History is not lost by accident — it is destroyed as the normal
consequence of an `UPDATE` statement.

What survives is scattered: an HRIS export, a headcount spreadsheet, a
redesignation letter in a shared drive, an org chart that was out of date the day
it was drawn.

So a simple question becomes a day of work:

> *"Has this department actually grown over three years, or have we just been
> renaming things?"*

And a second question cannot be answered at all:

> *"How does this person's career relate to the structural changes around them?"*

## What Silsilah does

Drop in one spreadsheet. It rebuilds the history and answers both.

| The brief asks for | Where it lives |
| --- | --- |
| Accept organisational data from at least one structured source | **Load data** — real client-side CSV parsing, drag-and-drop, designed errors |
| Reconstruct and present the history of a role over time | **Roles** → detail panel: ordered change history and lineage chain |
| Reconstruct and present the journey of a person over time | **People** → detail panel: full trajectory with dates and manager changes |
| Show how the two views connect | **Timeline** — position lane, person lane and reporting lane on one axis |
| Present the history clearly and intuitively | Time scrubber, org snapshot at any quarter, headcount chart |
| Handle incomplete or inconsistent records gracefully | Detected at ingest and shown in place — "not recorded", hatched unknowns, never auto-filled |

A line-by-line audit against the brief is in
[docs/BRIEF-MAPPING.md](docs/BRIEF-MAPPING.md).

---

## The idea worth stealing: roles have lineage

Every product on the market records **that** a title changed. None of them
decides **whether it was still the same job**.

Silsilah treats a position as a versioned object. Given the declared predecessor
links in the data, it classifies every transition:

| Relation | Meaning |
| --- | --- |
| `rename` | Same job, new wording. Headcount did not grow. |
| `redesignated` | Same job, new wording **and** a changed grade. |
| `split` | One position divided into several. |
| `merge` | Several positions consolidated into one. |
| `created` | Genuinely new — no predecessor. |
| `succeeded` | A successor exists but the titles barely overlap. Check by hand. |

That distinction is the product. It is what lets the interface open with a
headline a non-specialist can act on, computed from the data at load time:

> **Headcount went from 44 to 64. 9 of those positions were relabelled, not created.**

Organisations make budget, redundancy and pay-equity decisions on the assumption
that they know which of those two things happened. Mostly, they do not.

### How the classifier decides

Four signals, all derived from the records, all shown in the interface:

| Signal | How it is measured |
| --- | --- |
| Title similarity | Overlap coefficient over normalised title tokens, stopwords removed |
| Date adjacency | Days between predecessor closing and successor opening, decaying over 180 days |
| Reporting continuity | Whether the manager survived the handover |
| Structural certainty | Whether the declared dates exist at all |

Confidence is a weighted blend:
`0.45 × similarity + 0.30 × adjacency + 0.15 × reporting + 0.10 × structural`.

Every input is displayed next to the verdict, so a reader can disagree with the
machine. **There is no model and no training data.** The reasoning is fully
legible, which is the only reason a finding here could be taken to an audit
committee.

**Why overlap coefficient rather than Jaccard.** Job titles are two or three
meaningful words long, so Jaccard — which divides by the size of the union —
punishes a single changed word far too heavily:

```
"Branch Operations Executive"  →  "Branch Operations Specialist"

Jaccard:  1 shared / 3 union   = 0.33  →  classified as a NEW ROLE.  Wrong.
Overlap:  1 shared / 2 smaller = 0.50  →  classified as a RENAME.    Correct.
```

This was a real bug, caught by running the classifier headless against the
dataset. It is documented in [src/domain/lineage.ts](src/domain/lineage.ts).

---

## Honest gaps

The brief asks for solutions that flag gaps rather than break. Most tools
silently interpolate across missing data, which is exactly why the people who
own that data do not trust them.

Silsilah detects four kinds of problem and refuses to guess past any of them:

- **Conflict** — two sources describe the same period with different reporting lines
- **Missing** — no manager was ever recorded against a position
- **Inferred** — a date shown is derived, not read from a record, and says so
- **Inconsistent** — an assignment runs past the life of the position it belongs to

On the timeline, unknown periods render as a **diagonal hatch**, never as a
colour. That keeps colour free to mean category and uses pattern for
uncertainty — a convention borrowed from statistical charting, and one that
survives greyscale printing and colour-blindness alike.

Conflicts can be settled in-session by choosing a source. The original records
are never modified. **Silsilah reads; it never writes back.**

One detail worth noting, because it is the difference between a warning system
people use and one they learn to ignore: a position with no manager *and* no
subordinates is flagged as orphaned, but a position with no manager that has
people reporting into it is simply the top of the tree. Flagging the chief
executive as a data defect would be a false positive, and false positives are
how warning systems die.

---

## Running it

```bash
npm install
npm run dev          # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Typecheck, then production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | TypeScript, no emit |
| `npm run verify` | Run the domain pipeline headless and print what it found |
| `npm run smoke` | Render every view and detail panel; fail if any throws |
| `npm run generate:data` | Regenerate the demonstration dataset |

### Deploying

Static output, so any of these work with no configuration:

```bash
npx vercel --prod
npx netlify deploy --prod --dir dist
```

Or push to GitHub and enable Pages against the `dist/` output.

---

## Using it

1. **Open the demonstration** — loads synthetic records for a fictional Malaysian
   bank: 67 people, 78 positions, five and a half years.
2. **Timeline** — the connection view. Drag the scrubber to move through time;
   the snapshot table and headcount chart follow. Pick a division to focus on.
3. Click any bar to open its detail panel.
4. **Feature Analysis** — from the button on the overview. *General* reads the
   whole organisation; *By person* runs the same rules against one record.
   Every finding is drawn as a chart and states the rule behind it.
5. **Load data** → *Download the sample*, edit it, drop it back in.

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
`source` and `confidence` are what make a finding auditable.

A file missing a required column produces a sentence naming the column, not a
blank screen.

---

## Architecture

```
CSV text
   │
   ├─ parseCSV()          quote-aware reader, no dependency          domain/csv.ts
   │
   ├─ ingest()            people · positions · assignments           domain/ingest.ts
   │                      collects every gap, conflict, inconsistency
   │
   ├─ classifyLineage()   rename / redesignated / split / merge      domain/lineage.ts
   │                      four signals, weighted confidence
   │
   ├─ metrics()           headline stats, headcount, the connection  domain/metrics.ts
   │
   └─ React views         timeline · roles · people · quality · load components/
```

```
src/
├── domain/        Pure TypeScript. No React. Runs headless in Node.
│   ├── types.ts       The data model, and why it is shaped this way
│   ├── dates.ts       Quarter quantisation
│   ├── csv.ts         Quote-aware parser and required-column contract
│   ├── ingest.ts      Builds the model; collects data-quality issues
│   ├── lineage.ts     THE CLASSIFIER. The product is this file.
│   └── metrics.ts     Headline figures, snapshots, the connection
├── data/          Generated demonstration dataset
├── hooks/         The single piece of application state
├── components/
│   ├── ui/            Card, Badge, Button, Drawer, SignalBar, vocabulary
│   └── views/         One file per tab, plus the two detail panels
└── styles/        tokens.css · base.css · app.css
```

The domain layer has **no React import anywhere**. That is what lets
`npm run verify` execute the entire pipeline in Node and print its findings —
the numbers in this README were produced that way, not read off the screen.

Longer notes: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) ·
[docs/DATA-MODEL.md](docs/DATA-MODEL.md) · [docs/DESIGN.md](docs/DESIGN.md)

**Why no backend.** Employment history is personal data under Malaysia's
Personal Data Protection Act 2010. Parsing in the browser means employee records
never leave the machine they are already on: no upload, no vendor holding HR
data, no cross-border transfer to reason about, no breach surface. The
architectural constraint and the privacy position are the same decision.

---

## Verification

Both of these run in CI-friendly fashion and both are committed:

```
$ npm run verify

=== LINEAGE ===
created         68     merge            2     redesignated     2
rename           1     split            4     succeeded        1

rename         85%  sim 0.67  Branch Operations Executive  →  Branch Operations Specialist
redesignated   85%  sim 0.67  Branch Operations Specialist →  Branch Experience Specialist
split          70%  sim 0.67  Digital Channels Manager     →  Web Channels Manager
merge         100%  sim 1.00  Cards Ops Lead + Payments Ops Lead → Payments & Cards Ops Lead
succeeded      55%  sim 0.00  Regional Sales Manager, Northern → Territory Growth Lead  [needs review]

=== DATA QUALITY ===
inferred      Start of Digital Onboarding Specialist is derived, not recorded
missing       No reporting line was ever recorded for Sustainability Reporting Officer
inconsistent  Low Wai Kit is recorded in a closed position
conflict      Two sources disagree on who Vincent Chua Boon Hock reported to
```

```
$ npm run smoke
rendered 151 views and panels, 401 kB of markup
all clear
```

`smoke` renders every view **and every one of the 78 position panels and 67
person panels** through `react-dom/server`. A lineage chain that would break the
renderer is found here rather than when someone clicks it.

---

## Limitations

Stated plainly, because a prototype that overclaims is worse than one that does not:

- **No persistence.** Refreshing clears loaded data and any settled conflicts.
- **Synthetic data.** The demonstration dataset is shaped like a large Malaysian
  bank so it reads as familiar, but every person, position, date and document
  reference in it was written for this project. It is not affiliated with or
  endorsed by any bank.
- **Lineage is declared, not discovered.** Predecessor links come from the file.
  Inferring them from unstructured redesignation letters is the obvious next step.
- **One division at a time** on the timeline. Designed for a readable scale.
- **Quarterly resolution.** A restructure lands in the right quarter, not on the
  right day.

## What is next

- Infer predecessor links from redesignation letters instead of requiring them
- Restructuring impact: who was affected, and where they were six months later —
  reported as temporal association, never as causation
- Precedent for employees: who held this seat before you, and where did they go
- A scheduled read-only sync against an HRIS export, then an embeddable widget

---

## Team

Eya Hia · Cheah Wan Xin · Muhammad Aiman Naim bin Mohd Faizul · Joanne Ngai Shi Ying

Built for DevLeague 2026, Xsolla Curine Academy, Kuala Lumpur.

---

*Silsilah* (سلسلة) is Arabic for *chain* — and the root of the Malay *salasilah*,
lineage. A chain of role changes, a chain of career moves, and a chain of custody
for the evidence behind both.
