/**
 * The picture of a finding.
 *
 * Two shapes only, because two are all the findings need. Bars answer "how
 * does this compare to the others?" — the question a reader asks when told
 * one department lost two people. A line answers "is this getting worse?" —
 * the question they ask about vacancies and job titles, where a single number
 * has no meaning without the period around it.
 *
 * Colour does exactly one job here, the same job it does everywhere else in
 * this interface: the bar the finding is ABOUT is drawn in the severity
 * colour, and every other bar is neutral grey. A chart where all the bars are
 * coloured has told the reader nothing about which one to look at.
 *
 * There is no charting library because there is no charting problem: bars are
 * divs with a width, and a line is one polyline. A dependency here would cost
 * more to load than the whole page.
 */

import type { Severity, SignalChart as Spec } from '../../../domain/insights.ts';

/** Series beyond the first are comparisons, and read as context, not subject. */
const COMPARISON = 'var(--nu-bar)';

const SEVERITY_INK: Record<Severity, string> = {
  attention: 'var(--brand)',
  review: 'var(--wr-bar)',
  positive: 'var(--ok-bar)',
};

/** The plot box a line is drawn into. Stroke width is kept true by CSS. */
const VIEW = { w: 320, h: 96, pad: 4 };

function Bars({ spec, ink }: { spec: Spec; ink: string }) {
  const points = spec.series[0]?.points ?? [];
  const ceiling = Math.max(...points.map((p) => p.value), spec.reference?.value ?? 0, 1);

  return (
    <div className="ch-bars">
      {points.map((p, i) => (
        <div className="ch-row" key={`${p.label}-${i}`}>
          <span className="ch-label" title={p.label}>{p.label}</span>
          <span className="ch-track">
            <i
              className="ch-fill"
              style={{
                width: `${Math.max((p.value / ceiling) * 100, p.value > 0 ? 1.5 : 0)}%`,
                background: p.emphasis ? ink : COMPARISON,
              }}
            />
            {spec.reference ? (
              <i
                className="ch-ref"
                style={{ left: `${(spec.reference.value / ceiling) * 100}%` }}
                aria-hidden="true"
              />
            ) : null}
          </span>
          <span className="ch-value tnum">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function Line({ spec, ink }: { spec: Spec; ink: string }) {
  const all = spec.series.flatMap((s) => s.points.map((p) => p.value));
  const ceiling = Math.max(...all, 1);
  const span = Math.max(spec.series[0]?.points.length ?? 1, 2) - 1;

  const path = (values: number[]) =>
    values
      .map((v, i) => {
        const x = VIEW.pad + (i / span) * (VIEW.w - VIEW.pad * 2);
        const y = VIEW.h - VIEW.pad - (v / ceiling) * (VIEW.h - VIEW.pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');

  const ticks = spec.series[0]?.points ?? [];
  const first = ticks[0]?.label;
  const last = ticks[ticks.length - 1]?.label;

  return (
    <div className="ch-line">
      {spec.series.length > 1 ? (
        <div className="ch-legend">
          {spec.series.map((s, i) => (
            <span key={s.label}>
              <i style={{ background: i === 0 ? ink : COMPARISON }} aria-hidden="true" />
              {s.label}
            </span>
          ))}
        </div>
      ) : null}

      <svg
        viewBox={`0 0 ${VIEW.w} ${VIEW.h}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${spec.caption} Peaking at ${ceiling} ${spec.unit}.`}
      >
        {spec.series.map((s, i) => (
          <polyline
            key={s.label}
            points={path(s.points.map((p) => p.value))}
            fill="none"
            stroke={i === 0 ? ink : COMPARISON}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={i === 0 ? undefined : '4 3'}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      <div className="ch-axis">
        <span>{first}</span>
        <span className="ch-axis-peak">peak {ceiling} {spec.unit}</span>
        <span>{last}</span>
      </div>
    </div>
  );
}

export function SignalChart({ spec, severity }: { spec: Spec; severity: Severity }) {
  const ink = SEVERITY_INK[severity];
  const empty = spec.series.every((s) => s.points.every((p) => p.value === 0));

  // A chart of nothing is worse than no chart: it implies a shape that is not
  // there. The caption still runs, so the reader knows what was looked for.
  if (empty) {
    return <div className="wi-unknown">{spec.caption} Nothing recorded in this period.</div>;
  }

  return (
    <figure className="ch">
      {spec.kind === 'bar' ? <Bars spec={spec} ink={ink} /> : <Line spec={spec} ink={ink} />}
      <figcaption className="ch-caption">
        {spec.caption}
        {spec.reference ? (
          <>
            {' '}
            <span className="ch-ref-key">
              <i aria-hidden="true" /> {spec.reference.label} ({spec.reference.value.toFixed(1)})
            </span>
          </>
        ) : null}
      </figcaption>
    </figure>
  );
}
