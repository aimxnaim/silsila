# Design

## The direction

Restrained editorial software. A warm near-white ground, hairline-outlined
rectangles, and typography doing the work that colour usually does.

It is deliberately not a dashboard. Dashboards signal "we have a lot of data";
this product's claim is the opposite — that it has *found* something in the data
and can show you why it believes it. That argument is better made in the visual
language of a document than a control panel.

## The two rules

**1. Colour never fills a container.**

Colour appears in text, in a 1px rule, or in a 2px marker. Nowhere else. Every
panel in the application is white on warm grey with a hairline border. What
separates one thing from another is weight, size and space.

There is exactly one filled element in the interface — the primary button — and
it is filled with ink, not with colour.

**2. Unknown is drawn as a hatch, never as a colour.**

A diagonal hatch with a dashed border, and no hue at all.

This is better than an amber "gap" state in three ways. It keeps the accent free
to mean one thing only. It reads as *"no data here"* more immediately than any
colour can, because a colour always looks like it might be a category. And it is
the convention statistical charting already uses, which means it survives
greyscale printing and colour-blindness alike — both of which matter, because
this output gets printed and handed to committees.

## Tokens

Defined in `src/styles/tokens.css`.

| Role | Value | Where it goes |
| --- | --- | --- |
| Canvas | `#F7F6F3` | The page. Warm, not clinical |
| Surface | `#FFFFFF` | Every card, panel and table |
| Ink | `#1A1917` | Headings, primary text, the one filled button |
| Ink 2 | `#6B6862` | Secondary text and labels |
| Ink 3 | `#9C9891` | Metadata and axis ticks |
| Line | `#E6E3DD` | The default hairline |
| Line strong | `#D2CEC6` | Emphasis borders, active outlines |
| Accent | `#B4471F` | Terracotta. **Text and rules only** |
| Warn | `#8A6A16` | "Needs a human". Also text only |
| Unknown | `#B9B4AB` | The hatch stroke |

Two accents at most. A third makes it a rainbow and the discipline collapses.

## Type

One family — Inter, with a system fallback stack — in three weights and a fixed
scale. Arabic gets its own stack (`Noto Naskh Arabic`), because Inter has no
coverage and the wordmark would silently fall back to something ugly.

Numbers are set with `font-variant-numeric: tabular-nums` everywhere they appear
in a table or beside a label, so figures line up column-wise and a changing
scrubber value does not make the layout twitch.

## Space

An 8px grid: every gap is 8, 16, 24, 32, 48, 64 or 96. A 4px step exists for
tight optical work only.

This single rule does more for perceived quality than any amount of colour work.
Inconsistent spacing is the most reliable tell of an interface built in a hurry.

## The three lanes

The timeline distinguishes its lanes by **border treatment**, not by fill,
because filling them would break rule 1.

| Lane | Treatment |
| --- | --- |
| Position | 3px ink left border, white fill |
| Person | 3px terracotta left border, sunk fill |
| Reporting line | Dashed border, muted text |
| Unknown | Dashed border **and** diagonal hatch |

## Light only

HR records are read in offices and printed for committees. A dark theme is a
consumer-application signal that would work against everything else here, so the
interface commits to light and declares `color-scheme: light` rather than
half-supporting a mode it was not designed for.

A print stylesheet is included: `Ctrl/Cmd+P` produces a clean review pack with
interface chrome removed, which is the artefact an HR lead actually has to hand
upward.

## Accessibility

- Keyboard: the scrubber takes arrow keys, `Escape` closes the detail panel,
  focus order follows the document.
- `:focus-visible` is styled explicitly rather than suppressed.
- `prefers-reduced-motion` collapses every transition.
- Uncertainty is encoded as pattern, not hue, so no meaning is carried by colour
  alone.
- Wide content scrolls inside its own container; the page body never scrolls
  sideways.
