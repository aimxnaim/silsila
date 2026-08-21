# Design

## The direction

Swiss editorial. Paper, ink, vermillion, saffron, stone. Large type, hard colour
blocks, flat fills, no gradients and no shadows.

It is the language of Pentagram and of a *Bloomberg Businessweek* cover, and it
is deliberately neither of the two things most of the room will ship: the grey
enterprise dashboard, or the purple-gradient "AI startup" look. It is bold and
colourful, and it is memorable from three metres away — which matters, because
Best UX/UI is voted on by people walking past a screen.

## The rule that makes it work

**Colour always does a job. The same hue never means two things.**

| Colour | Meaning |
| --- | --- |
| Vermillion `#E03A17` | A role — and the present moment |
| Ink `#111110` | A person |
| Saffron `#FFC300` | A structural event, or something needing a human |
| Stone `#EAE8E1` | A reporting line, and every neutral surface |
| Hatch | We do not know |

That last row is the move that lets the rest be bold.

**Uncertainty is drawn as a diagonal hatch with a dashed border and no hue at
all.** An amber "gap" state would have consumed one of only two accents, and a
colour always looks like it might be a category. A pattern does not.

It is better in three ways: it frees red and yellow entirely for category use,
it reads as *"no data here"* more immediately than any colour can, and it is the
convention statistical charting already uses — so it survives greyscale printing
and colour-blindness alike. Both matter, because this output gets printed and
handed to committees.

## The palette

Defined in `src/styles/tokens.css`.

| Role | Hex | Where it goes |
| --- | --- | --- |
| Paper | `#FAF9F5` | Background everywhere — warm white, not clinical |
| Paper 2 | `#F2F0E9` | Inset surfaces, table headers, hover |
| Ink | `#111110` | Text, the person lane, the primary button |
| Ink 2 | `#5C5A54` | Secondary text |
| Ink 3 | `#8A877E` | Metadata, axis ticks, eyebrows |
| Stone | `#EAE8E1` | Reporting lane, neutral pills |
| Hairline | `#DCD9D0` | Every 1px rule |
| Vermillion | `#E03A17` | Role lane, playhead, the one highlighted word |
| Saffron | `#FFC300` | Second stat block, structural events |

Two accents. The moment a third appears it is a rainbow and the discipline
collapses.

## The rules that keep it from looking like a student project

Bold design fails when it is *almost* bold. Each of these is a commitment:

- **Type gets big.** The hero is `clamp(40px, 7vw, 76px)`. Timid type is what
  makes a colourful design look amateur.
- **Colour blocks touch.** The three statistics sit 2px apart, not 16px, with no
  radius and no shadow. Blocks that almost touch look like a mistake; blocks that
  touch look like a decision.
- **Never a gradient.** Flat fills only. Gradients are what make bold design look
  like 2019.
- **Whitespace stays generous.** Bold colour needs room around it.
- **Colour is never decorative.** If a fill cannot name what it means, it is
  removed.

## Type

Three families, each with a job:

| Family | Job |
| --- | --- |
| Inter, 400/500 | Everything |
| IBM Plex Sans Arabic | The wordmark, سلسلة. Inter has no Arabic coverage, so without this the mark silently falls back to something ugly |
| IBM Plex Mono | Dates, identifiers, the scrubber readout |

Numbers are set with `font-variant-numeric: tabular-nums` wherever they appear in
a table or beside a label, so columns line up and a moving scrubber does not make
the layout twitch.

## Space

An 8px grid: every gap is 8, 16, 24, 32, 48, 64 or 96. Two exceptions, both
deliberate — 4px for tight optical work, and **2px between touching colour
blocks**.

This single rule does more for perceived quality than any amount of colour work.
Inconsistent spacing is the most reliable tell of an interface built in a hurry.

## The three lanes

The timeline is where the palette earns its keep, and the lanes are **filled**:

| Lane | Treatment |
| --- | --- |
| Position | Vermillion fill, white text |
| Person | Ink fill, paper text |
| Reporting line | Stone fill, muted text |
| Unknown | Diagonal hatch, dashed border, no hue |

The playhead is a 1px vermillion rule with a dot at its head — the same
vermillion as the role lane, because both mean "this, now".

## Light only

HR records are read in offices and printed for committees. A dark theme is a
consumer-application signal that would work against the whole direction, so the
interface commits to light and declares `color-scheme: light` rather than
half-supporting a mode it was not designed for.

A print stylesheet is included: `Ctrl/Cmd+P` produces a clean review pack with
interface chrome removed and the colour blocks converted to outlines — the
artefact an HR lead actually has to hand upward.

## Accessibility

- Keyboard: the scrubber takes arrow keys, `Escape` closes the detail panel,
  focus order follows the document.
- `:focus-visible` is styled explicitly in vermillion rather than suppressed.
- `prefers-reduced-motion` collapses every transition.
- Uncertainty is encoded as **pattern, not hue**, so no meaning is carried by
  colour alone.
- Wide content scrolls inside its own container; the page body never scrolls
  sideways.
