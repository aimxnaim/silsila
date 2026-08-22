# Design

## The direction

An enterprise HR console. Cool grey canvas, white cards, one red accent, dense
type. Left icon rail, breadcrumb, tab strip, tables that scroll under fixed
chrome.

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
rail is where their rail is, the breadcrumb reads the same way, a status pill
looks like a status pill. **Familiarity is the feature.** The argument this
product makes is contrarian enough on its own; the chrome around it should not
also be asking for attention.

What survived the change is the part that was always load-bearing: colour does a
job, and uncertainty is drawn as pattern rather than hue.

## The rule that makes it work

**Colour always does a job. The same hue never means two things.**

| Colour | Meaning |
| --- | --- |
| Brand red `#C8202F` | The present moment, the active thing, the one primary action |
| Ink `#16202E` | A person, and every heading |
| Green `#1F8A70` | Settled — a change we are confident about |
| Amber `#D99A2B` | Unsettled — needs a human |
| Grey `#98A1AD` | Structure, and everything neutral |
| Hatch | We do not know |

That last row is the move that lets the rest stay calm.

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

Six further hues (`--cat-1` … `--cat-6`) identify people and departments —
assigned by hashing the name, so a person keeps the same coloured disc in every
view they appear in. They are deliberately desaturated. An avatar identifies; it
does not rank, so none of them may out-shout the brand red.

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
- **Colour is never decorative.** If a fill cannot name what it means, it is
  removed.

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

Four fixed pieces around one scrolling one, defined in `App.tsx` and the
`.frame*` rules in `app.css`:

| Piece | Why |
| --- | --- |
| Rail, 68px | Six views is too many for a tab strip alone at small widths, and a hamburger hides the shape of the product from a first-time reader. A permanent rail costs nothing horizontally and keeps every destination on screen |
| Breadcrumb, 52px | Says where you are and which records are loaded |
| Tab strip | The same six destinations, named, for readers who want words |
| Canvas | The only thing that scrolls. Chrome never moves out from under the reader |

Below 860px the rail is the first thing removed: the tab strip already lists
every destination, so on a phone the rail is pure duplication in 68px the table
badly needs.

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

A print stylesheet is included: `Ctrl/Cmd+P` — or the printer button at the foot
of the rail — produces a clean review pack with the rail, breadcrumb and tabs
removed and the cards flattened to outlines. That is the artefact an HR lead
actually has to hand upward.

## Accessibility

- Keyboard: the scrubber takes arrow keys, `Escape` closes the detail panel,
  focus order follows the document.
- `:focus-visible` is styled explicitly in brand red rather than suppressed.
- Every rail button carries both `title` and `aria-label`, because an icon with
  no text label is unreadable to a screen reader and to a first-time user alike.
- `prefers-reduced-motion` collapses every transition.
- Uncertainty is encoded as **pattern, not hue**, so no meaning is carried by
  colour alone.
- Wide content scrolls inside its own container; the page body never scrolls
  sideways.
