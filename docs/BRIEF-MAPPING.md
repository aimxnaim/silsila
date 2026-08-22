# Lab 2 — requirement-by-requirement audit

**Lab 2: People-Centric Tech & Collaboration — Mapping How Roles and People
Evolve Over Time, powered by Setel.**

This document exists so that the mapping between the brief and the build can be
checked rather than asserted. Each requirement names the file that satisfies it.

---

### 1. Accept organisational data from at least one structured source

**Where:** `src/domain/csv.ts`, `src/components/views/LoadDataView.tsx`

Real client-side CSV parsing — quote-aware, written by hand in about sixty lines
rather than pulled from npm, because a dependency would be a black box in the
one place where the product's honesty claim begins.

Drag-and-drop, file picker, and a downloadable sample so the loop closes: export
the sample, edit it in a spreadsheet, drop it back in.

Five columns are required. A file missing one produces a sentence naming the
column and listing what was actually found, not a blank screen. Someone will
inevitably drop in a spreadsheet of their own; what happens in that moment is
the credibility of the whole thing.

---

### 2. Reconstruct and present the history of a role over time

**Where:** `src/domain/lineage.ts`, `src/components/views/RolesView.tsx`,
`src/components/views/RoleDetail.tsx`

Positions are first-class objects with their own lifespan, independent of whoever
occupies them. Each one carries an ordered change history and a lineage chain
walking backwards through predecessors and forwards through successors.

**This requirement is exceeded rather than met.** The brief asks for the history
of a role. Silsilah additionally classifies what each change *meant* —
`rename`, `redesignated`, `split`, `merge`, `created`, `succeeded` — and shows
the four measurements behind every verdict.

---

### 3. Reconstruct and present the journey of a person over time

**Where:** `src/components/views/PeopleView.tsx`,
`src/components/views/PersonDetail.tsx`

Full trajectory: every seat held, with dates, grades, reporting lines, the reason
recorded for each change, and the source document behind each claim.

The People list is sorted by *how many structural changes happened underneath
each person*, not alphabetically. The people at the top of that list did not
necessarily change jobs; their jobs changed around them, and that is the
interesting population.

---

### 4. Show how the two views connect

**Where:** `src/components/views/TimelineView.tsx`,
`structuralChangesFor()` in `src/domain/metrics.ts`

The brief's own phrasing is *"not two separate trackers, but one view of a
shared history"*. That sentence describes the way most implementations of this
brief will fail, so it is worth being explicit about how this one avoids it.

Three things do the connecting:

1. **The timeline itself.** Each position gets a group of three lanes drawn
   against one shared time axis — *Position*, *Held by*, *Reports to*. Reading
   down a group answers "what happened to this role". Reading across the person
   bars answers "what happened to this human".
2. **"What moved around them"** in the person panel: the structural events that
   happened to the seats a person occupied, computed rather than annotated.
3. **Navigation in both directions.** Every position opens the humans who sat in
   it; every human opens the positions they held; both jump back to the moment
   in time where they sit.

---

### 5. Present the history clearly and intuitively

**Where:** `src/styles/`, and the design of every view

Not a tab — the whole interface. A time scrubber that moves the entire view at
once, an organisation snapshot that follows it, a headcount chart underneath,
keyboard support, and designed empty, loading and error states.

The visual system is documented in [DESIGN.md](DESIGN.md). Its governing rule:
colour never fills a container. Everything is a hairline-outlined rectangle on
warm white, and what separates one thing from another is weight, size and space.

---

### 6. Handle incomplete or inconsistent records gracefully

**Where:** `ingest()` in `src/domain/ingest.ts`, and the empty states of every
view

"Gracefully" is usually read as "do not crash". This build reads it as **"do not
lie"**.

Four defect classes are still detected during ingest — `conflict`, `missing`,
`inferred`, `inconsistent` — and none is filled in. Unknown periods render as a
diagonal hatch, never as a colour, because a gap is not a category, and an
unrecorded field reads "not recorded" rather than blank.

Where two records disagree, nothing is written over either of them:
`occupancy()` in `structure.ts` reads the one with the higher stated confidence
and leaves both in the model, because row order is not evidence.

**Reduced in scope.** The dedicated Data quality tab, which listed every defect
and let a reader settle a conflict by hand, was removed at the client's request
in favour of the analysis page. Detection and honest empty states remain; the
surface for *resolving* a conflict does not. This requirement is now met in the
record views rather than in a view of its own.

---

## Scope discipline

The following were considered and deliberately **not** built:

authentication · a backend or database · drag-to-edit org charting · a chat
interface over the data · future scenario planning · multi-tenancy · a mobile
application · a theme switcher.

Each is hours of work that satisfies no requirement in the brief. Six
requirements finished well is a stronger answer than twelve half-built.
