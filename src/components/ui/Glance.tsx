/**
 * The glance block — hero figure, composition bar, footnote.
 *
 * One component, three call sites (the overview, the job drawer, the person
 * drawer), so that the answer arrives in the same shape and the same place
 * every time. A reader who learns to read it once has learned all three.
 *
 * COLOUR. The segments wear steps of one neutral ink ramp, not identity hues.
 * That follows the governing rule in tokens.css — hue identifies, weight
 * emphasises — and this bar is not identifying anything: it is showing which
 * part of a whole outweighs the others. Using the department palette here would
 * assert a kinship between "genuinely new" and whichever division happens to
 * own indigo. The ramp is validated light→dark for monotone lightness, step
 * separation and contrast against the card surface.
 *
 * The bar is decorative to a screen reader — every value in it is repeated as
 * text in the key beneath, which is also the table view the bar owes.
 */

import type { Glance } from '../../domain/glance.ts';
import { glanceTotal } from '../../domain/glance.ts';

/**
 * Four steps of one hue. Bound to the category, never to its size — see the
 * note on GlanceStep. Anything past four folds into the last step rather than
 * generating a fifth, which would be indistinguishable from the fourth.
 */
const STEP_INK = ['#16202E', '#4A5563', '#7A8492', '#A8B0BA'];

/** Below this share a number cannot sit inside its own segment without clipping. */
const LABEL_FITS_AT = 0.12;

export function GlanceBlock({ glance }: { glance: Glance }) {
  const total = glanceTotal(glance);

  // A single segment is a one-bar bar chart: the hero already said it.
  const showBar = glance.segments.length >= 2 && total > 0;

  return (
    <div className="glance">
      <div className="glance-hero">
        <span className="glance-figure">{glance.hero.value}</span>
        <span className="glance-hero-text">
          <b>{glance.hero.label}</b>
          {glance.hero.detail ? <span>{glance.hero.detail}</span> : null}
        </span>
      </div>

      {showBar ? (
        <div className="glance-comp">
          <div className="glance-bar" aria-hidden="true">
            {glance.segments.map((s) => {
              const share = s.value / total;
              return (
                <span
                  key={s.label}
                  className="glance-seg"
                  style={{ flexGrow: s.value, background: STEP_INK[s.step] }}
                >
                  {share >= LABEL_FITS_AT ? <i>{s.value}</i> : null}
                </span>
              );
            })}
          </div>

          {/* The key. Carries every value as text, so the bar never gates a number. */}
          <ul className="glance-key">
            {glance.segments.map((s) => (
              <li key={s.label}>
                <i style={{ background: STEP_INK[s.step] }} aria-hidden="true" />
                <b className="tnum">{s.value}</b>
                <span>{s.label}</span>
              </li>
            ))}
          </ul>

          {glance.whole ? <p className="glance-whole">{glance.whole}</p> : null}
        </div>
      ) : null}

      {glance.footnote ? <p className="glance-foot">{glance.footnote}</p> : null}
    </div>
  );
}
