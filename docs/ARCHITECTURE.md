# Architecture

## The one decision everything follows from

The domain layer contains **no React import anywhere**.

```
src/domain/     pure TypeScript — the entire product logic
src/components/ React — how it is displayed
```

That boundary is not decoration. It buys three things:

1. **`npm run verify` runs the whole pipeline in Node** and prints its findings.
   The figures quoted in the README were produced that way rather than read off
   a screen, which means they can be re-derived by anyone with the repository.
2. **The classifier can be reviewed on its own.** A reader who wants to
   interrogate `lineage.ts` never has to read a component.
3. **The rendering layer is replaceable.** The same domain code would drive a
   CLI, a scheduled report, or an embedded widget inside an existing HRIS —
   which is the actual adoption path for a product like this.

## The pipeline

```
CSV text
   │
   ▼
parseCSV(text)                                          domain/csv.ts
   │  quote-aware; throws CSVError naming any missing required column
   ▼
ingest(parsed, label)  ->  OrgModel                     domain/ingest.ts
   │  Pass 1  build Person, Position, Assignment
   │  Pass 2  wire the join in both directions, sort by date
   │  Pass 3  derive what is safe, flag what is not
   ▼
classifyLineage(model)  ->  Map<id, LineageVerdict>     domain/lineage.ts
   │  four measured signals, weighted blend, plain-English reasoning
   ▼
metrics(model)  ->  Metrics                             domain/metrics.ts
   │  headline figures, headcount per quarter, snapshots, the connection
   ▼
React views                                             components/views/
```

Each stage is a pure function of its input. There is no hidden state, no cache
to invalidate and no order-of-operations trap: given the same CSV, the same
model comes out every time.

## State

One hook, `useOrgModel`, owns everything. It exposes `model`, `metrics`,
`error`, `loading`, and three actions: `load`, `loadDemo`, `resolveIssue`.

`resolveIssue` is the only mutation in the application, and it does **not**
modify a record. It attaches a `resolution` — chosen source, resulting reporting
line, timestamp — to the issue. Both competing records stay in the model.
Silsilah reads; it never writes back.

Everything else in the component tree is either derived with `useMemo` or is
local view state (which tab, which quarter, which panel is open).

## Testing

Two committed checks, both runnable in one command each.

**`npm run verify`** executes the domain pipeline headless and prints every
lineage verdict with its signals, plus every data-quality issue. This is how the
Jaccard bug was caught: the classifier was calling *Branch Operations
Executive → Branch Operations Specialist* a brand-new role, which is visible in
the output and invisible in the interface.

**`npm run smoke`** bundles a server-render entry with esbuild and renders every
view **and all 145 detail panels** through `react-dom/server`, failing on any
throw or empty output. A build succeeding proves the code compiles; this proves
it runs.

## Dependencies

`react`, `react-dom`. That is the entire runtime dependency list.

The CSV parser, the date handling, the classifier, the charts and the layout are
all first-party. For a project whose central claim is that its reasoning is
legible, a chart library that renders an opaque SVG would be working against the
argument.

## Deployment

Static output. `npm run build` emits `dist/` — one HTML file, one CSS bundle,
one JS bundle. No server, no environment variables, no secrets, nothing to
configure. `vercel.json` is committed so a Vercel import needs no setup.
