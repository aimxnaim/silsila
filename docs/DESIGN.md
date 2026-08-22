# Design

## The direction

An enterprise HR console. Cool grey canvas, white cards, one red accent, dense
type. Breadcrumb, tab strip, tables that scroll under fixed chrome.

This replaces an earlier Swiss-editorial build — warm paper, vermillion and
saffron, 76px headlines — and the swap is worth explaining, because the old
direction was chosen on purpose and abandoned on purpose.

The editorial version optimised for being **memorable from three metres away**.
It was a good poster. But the thing being demonstrated is a tool an HR lead
would open next to their existing portal, and read for twenty minutes at a
stretch: 78 positions, 67 people, a change feed, a data-quality queue. At that
job the poster fought us. 15px body copy and 76px headlines meant every screen
had to choose between the argument and the table. Two accent colours meant a
status system — settled, unsettled, unknown — had nowhere to live.

The reference now is the HR portal itself. A reader who uses that system daily
should be able to enter this one without being taught where anything is: the
tabs are where their tabs are, the breadcrumb reads the same way, a status pill
looks like a status pill. **Familiarity is the feature.** The argument this
product makes is contrarian enough on its own; the chrome around it should not
also be asking for attention.

What survived the change is the part that was always load-bearing: every colour
names something, and uncertainty is drawn as pattern rather than hue.

## The rule that makes it work

**Hue identifies. Weight emphasises. Status is reserved.**

This is a revision. The first version of this document said *colour always does
a job*, and the interface kept that promise so strictly that almost nothing was
coloured: every section arrived as another white card on grey, and a reader had
nothing to navigate by but headings. Restraint had stopped being legibility and
become uniformity — which is a legibility failure of its own, just a quieter
one. Told directly that the interface was hard to differentiate, we widened the
palette rather than defending the rule.

| Channel | Job |
| --- | --- |
| **Hue** (`--cat-1` … `--cat-10`) | IDENTITY — which department, which category. A department owns its hue in every view it appears in |
| Brand red `#C8202F` | Attention, the present moment, the one primary action |
| Green `#1F7A4D` | Settled — a change we are confident about |
| Amber `#D99A2B` | Unsettled — needs a human |
| **Weight** | EMPHASIS — solid against tint, 4px edge against hairline. This is how one thing now outranks another |
| Hatch | We do not know |

Splitting identity (hue) from emphasis (weight) is what allows the wider
palette. Previously colour had to carry both, so any second coloured element
competed with the first and the only safe answer was to colour almost nothing.
Now a chart can give every bar its department's hue and still say which one the
finding is about, by drawing that one at full strength and stepping the rest
back.

Two consequences worth stating, because both were mistakes made and corrected
while implementing this:

- **Department hues are assigned, not hashed.** Hashing put three of the nine
  demonstration departments on the same colour, which is worse than no colour:
  it asserts that unrelated things are related. Divisions are sorted and dealt
  hues in order, which is collision-free up to ten. Names outside that set —
  a person on an avatar — still hash, where a collision costs nothing.
- **Nothing dims unless something is emphasised.** A chart with no subject
  draws every bar at full strength. Stepping all of them back would imply a
  subject that is not there.

The hatch row is still the move that lets the rest work.

**Uncertainty is drawn as a diagonal hatch with a dashed border and no hue at
all.** A grey "gap" state would collide with the neutral surfaces, and any
colour always looks like it might be a category. A pattern does not.

It is better in three ways: it frees every colour above for category use, it
reads as *"no data here"* more immediately than any colour can, and it is the
convention statistical charting already uses — so it survives greyscale printing
and colour-blindness alike. Both matter, because this output gets printed and
handed to committees.

## The palette

Defined in `src/styles/tokens.css`.

| Role | Hex | Where it goes |
| --- | --- | --- |
| Canvas | `#F4F6F9` | The page itself. Cards float on it |
| Surface | `#FFFFFF` | Every card and panel, and all the chrome |
| Surface 2 | `#FAFBFC` | Table headers, row hover |
| Surface 3 | `#EEF1F5` | Inset tracks, progress rails, the reporting lane |
| Line | `#E4E8EE` | Card borders and dividers that should be seen |
| Line faint | `#F4F6F9` | Row separators inside a dense table |
| Ink | `#16202E` | Headings, values, the person lane, the primary button |
| Ink 2 | `#3C4653` | Body copy inside dense rows |
| Ink 3 | `#6B7684` | Secondary text and captions |
| Ink 4 | `#8B949F` | Field labels and uppercase eyebrows |
| Brand | `#C8202F` | Role lane, playhead, active tab, focus ring |

Status is defined as three foreground/background/bar triples rather than three
loose hues, so the quiet pill inside a table row and the saturated block on the
timeline are provably the same idea at two densities:

| State | Pill | Bar |
| --- | --- | --- |
| Settled | `#0F5C4A` on `#E3F3EF` | `#1F8A70` |
| Unsettled | `#8A5C07` on `#FDF1DE` | `#D99A2B` |
| Neutral | `#454E5B` on `#F0F2F5` | `#98A1AD` |

Ten identity hues (`--cat-1` … `--cat-10`) carry departments, categories and
people. Each is a triple — a fill for bars and tiles, a tint for a panel behind
text, and a line for that panel's border — so one hue can dress a whole card
without a second colour being invented for it.

They are levelled to a similar lightness on purpose. They identify one thing
from another and must never imply a ranking between them; weight does that.

## The rules that keep it from looking generic

A grey-and-white dashboard fails in a specific way: everything ends up the same
weight, and the screen turns into wallpaper. Each of these is a commitment
against that:

- **One accent, spent carefully.** Red marks the active tab, the playhead, the
  role lane and nothing else. The primary button is ink, not red, because in the
  reference system red is reserved for the irreversible action — spending that
  signal on "open the demo" would waste it.
- **Weight does the work type size used to do.** Body is 13–14px, but labels are
  700 and uppercase, values are 700, and captions are grey. Hierarchy comes from
  weight and colour, not from scale.
- **A resting card is a hairline.** Shadows appear on hover only. A page of
  drop-shadowed cards reads as decoration.
- **Table rows separate on the faintest line in the system.** At this density a
  full-strength rule between every row turns the table into a grid of boxes and
  the eye stops tracking across it.
- **Colour is never decorative.** If a fill cannot name what it means — an
  identity, a status — it is removed. A wider palette raised the stakes on this
  rule rather than relaxing it.

## Type

Three families, each with a job:

| Family | Job |
| --- | --- |
| Public Sans, 400/500/600/700 | Everything |
| IBM Plex Sans Arabic | The wordmark, سلسلة. Public Sans has no Arabic coverage, so without this the mark silently falls back to something ugly |
| IBM Plex Mono | Dates, identifiers, the scrubber readout |

Numbers are set with `font-variant-numeric: tabular-nums` wherever they appear in
a table or beside a label, so columns line up and a moving scrubber does not make
the layout twitch.

## Space

An 8px grid: every gap is 8, 16, 24, 32, 48, 64 or 96, with 4px reserved for
tight optical work.

This single rule does more for perceived quality than any amount of colour work.
Inconsistent spacing is the most reliable tell of an interface built in a hurry.

## The frame

Two fixed pieces stacked above one scrolling one, defined in `App.tsx` and the
`.frame*` rules in `app.css`:

| Piece | Why |
| --- | --- |
| Breadcrumb, 52px | Says where you are and which records are loaded. Carries the brand mark, and the two controls that are not destinations: Analysis and print |
| Tab strip | Every destination, named and glyphed. Icon for recognition at a glance, word so nothing depends on decoding a 17px mark |
| Canvas | The only thing that scrolls. Chrome never moves out from under the reader |

Navigation is entirely horizontal. An earlier build carried a permanent 68px
icon rail down the left as well, on the argument that a first-time reader should
see every destination at once — but with four tabs the strip already does that,
and the org chart and the wider tables want the horizontal room more than the
product wants a second copy of its own menu. The rail's glyphs moved into the
tabs rather than being thrown away; the rail's two non-destinations moved into
the breadcrumb bar.

Below 860px the top bar sheds in order of redundancy: the dataset chip first,
then the word beside the Analysis glyph. Every destination survives.

## The three lanes

The timeline is where the palette earns its keep, and the lanes are **filled**:

| Lane | Treatment |
| --- | --- |
| Position | Brand red fill, white text |
| Person | Ink fill, white text |
| Reporting line | Surface-3 fill, muted text |
| Unknown | Diagonal hatch, dashed border, no hue |

The playhead is a 2px red rule with a dot at its head — the same red as the role
lane, because both mean "this, now".

## The profile

`PersonDetail` is laid out the way the reference portal lays out an employee
record: portrait on the left behind a rule, name and role top-right, then a grid
of label-over-value fields. The reader already knows this format, and the
argument the panel makes — *the titles changed because the organisation was
reorganised, not because this person kept moving* — only lands if they recognise
what they are looking at before they start reading it.

The red disc on the portrait is where that system puts its edit affordance. Here
it is inert, and the mono caption under it says `no photo on record`, because
Silsilah reads records and never writes them.

## Light only

HR records are read in offices and printed for committees. A dark theme is a
consumer-application signal that would work against the whole direction, so the
interface commits to light and declares `color-scheme: light` rather than
half-supporting a mode it was not designed for.

A print stylesheet is included: `Ctrl/Cmd+P` — or the printer button in the top
bar — produces a clean review pack with the breadcrumb and tabs removed and the
cards flattened to outlines. That is the artefact an HR lead actually has to
hand upward.

## Accessibility

- Keyboard: the scrubber takes arrow keys, `Escape` closes the detail panel,
  focus order follows the document.
- `:focus-visible` is styled explicitly in brand red rather than suppressed.
- Every icon-only button carries both `title` and `aria-label`, because an icon
  with no text label is unreadable to a screen reader and to a first-time user
  alike. Analysis names itself that way too, since its word drops out below
  860px.
- `prefers-reduced-motion` collapses every transition.
- Uncertainty is encoded as **pattern, not hue**, so no meaning is carried by
  colour alone.
- Wide content scrolls inside its own container; the page body never scrolls
  sideways.
