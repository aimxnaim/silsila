/**
 * Requirement 2: reconstruct and present the history of a role over time.
 *
 * Two ways in, because two different questions get asked of this data.
 *
 * "Org chart" is the default, because who-reports-to-whom is the one
 * organisational picture everybody already knows how to read. A list of 78
 * job titles is not navigable; a chain of command from the chief executive
 * downwards is. The thing that makes it more than an ordinary org chart is the
 * date picker: it can be rebuilt for ANY past quarter, which is the entire
 * point of the product. Set it to 2021 and then to 2026 and the shape of the
 * company visibly changes.
 *
 * "By what changed" is the analytical view — every job grouped by whether its
 * arrival meant somebody was hired, or an existing job was renamed.
 *
 * This file owns the switch between those two and the date; how the chart
 * itself is navigated lives in OrgChart.
 */

import { useMemo, useState } from 'react';
import type { LineageRelation, OrgModel } from '../../domain/types.ts';
import { formatMonthYear, quarterLabel } from '../../domain/dates.ts';
import { Badge, Card, CardHead } from '../ui/primitives.tsx';
import { RELATION_LABEL, RELATION_MEANING, RelationBadge } from '../ui/vocabulary.tsx';
import { chains } from '../../domain/chains.ts';
import { StoryStrip } from './StoryStrip.tsx';
import { OrgChart } from './OrgChart.tsx';

const ORDER: LineageRelation[] = ['rename', 'redesignated', 'split', 'merge', 'succeeded', 'created'];

/* ------------------------------------------------------------- The view */

export function RolesView({
  model, onOpenPosition,
}: { model: OrgModel; onOpenPosition: (id: string) => void }) {
  const [mode, setMode] = useState<'chart' | 'changes'>('chart');
  const [quarter, setQuarter] = useState(model.window.quarterCount - 1);
  const [filter, setFilter] = useState<LineageRelation | 'all'>('all');

  const allChains = useMemo(() => chains(model), [model]);

  const grouped = useMemo(() => {
    const out = new Map<LineageRelation, string[]>();
    for (const rel of ORDER) out.set(rel, []);
    for (const v of model.lineage.values()) out.get(v.relation)!.push(v.positionId);
    for (const list of out.values()) {
      list.sort((a, b) =>
        (model.positions.get(a)?.createdAt ?? '').localeCompare(model.positions.get(b)?.createdAt ?? ''));
    }
    return out;
  }, [model]);

  const visible = ORDER.filter((rel) => (filter === 'all' || filter === rel) && grouped.get(rel)!.length > 0);

  return (
    <div className="stack gap-5">
      <div>
        <div className="page-title">Org chart</div>
        <div className="page-sub">
          {model.positions.size} jobs across the whole period. Change the date to rebuild
          the chart as it actually was in that quarter.
        </div>
      </div>

      <div className="row gap-4 wrap spread no-print">
        <div className="segmented">
          <button aria-pressed={mode === 'chart'} onClick={() => setMode('chart')}>Org chart</button>
          <button aria-pressed={mode === 'changes'} onClick={() => setMode('changes')}>By what changed</button>
        </div>

        {mode === 'chart' ? (
          <label className="row gap-2 small muted">
            Showing the company as it was in
            <select
              className="select"
              value={quarter}
              onChange={(e) => setQuarter(Number(e.target.value))}
            >
              {Array.from({ length: model.window.quarterCount }, (_, i) => (
                <option key={i} value={i}>{quarterLabel(i)}</option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      {/* --------------------------------------------------------- Chart */}
      {mode === 'chart' ? (
        <OrgChart model={model} quarter={quarter} onOpenPosition={onOpenPosition} />
      ) : (
        /* ------------------------------------------------- By what changed */
        <>
          <div className="chiprow no-print">
            <button className="tab" aria-selected={filter === 'all'} onClick={() => setFilter('all')}>
              Everything ({model.positions.size})
            </button>
            {ORDER.map((rel) => {
              const n = grouped.get(rel)!.length;
              if (n === 0) return null;
              return (
                <button key={rel} className="tab" aria-selected={filter === rel} onClick={() => setFilter(rel)}>
                  {RELATION_LABEL[rel]} ({n})
                </button>
              );
            })}
          </div>

          {visible.map((rel) => (
            <Card flush key={rel}>
              <CardHead
                title={<span className="row gap-3"><RelationBadge relation={rel} /></span>}
                meta={RELATION_MEANING[rel]}
              />
              <div className="scroll-y" style={{ maxHeight: 460 }}>
                <table>
                  <thead>
                    <tr>
                      <th>The job</th>
                      <th>Part of</th>
                      <th>Existed from — to</th>
                      <th style={{ width: 110 }}>How sure we are</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.get(rel)!.map((id) => {
                      const pos = model.positions.get(id)!;
                      const v = model.lineage.get(id)!;
                      return (
                        <tr key={id} className="clickable" onClick={() => onOpenPosition(id)}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{pos.title}</div>
                            <div className="micro faint">{pos.orgUnit}</div>
                          </td>
                          <td className="small muted">{pos.division}</td>
                          <td className="small muted tnum">
                            {formatMonthYear(pos.createdAt)} — {pos.closedAt ? formatMonthYear(pos.closedAt) : 'now'}
                          </td>
                          <td className="small tnum">
                            {Math.round(v.confidence * 100)}%
                            {v.needsReview ? (
                              <div className="micro" style={{ color: 'var(--wr-fg)' }}>
                                a person should check
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </>
      )}

      {mode === 'changes' ? (
        <div>
          <div className="row gap-3 wrap" style={{ alignItems: 'baseline', marginBottom: 'var(--s3)' }}>
            <div style={{ fontSize: 17, fontWeight: 700 }}>Every job that changed, start to finish</div>
            <div className="small muted">read each row left to right</div>
          </div>
          {allChains.map((chain) => (
            <StoryStrip key={chain.id} model={model} chain={chain} onOpenPosition={onOpenPosition} />
          ))}
        </div>
      ) : (
        <Card tight>
          <p className="small muted">
            <Badge tone="ink">Tip</Badge>{' '}
            Click a card to move the chart to that job. Click <strong>History</strong> to read
            what happened to it. Then set the date above to {quarterLabel(0)}, and to{' '}
            {quarterLabel(model.window.quarterCount - 1)}, and watch the shape change around you.
          </p>
        </Card>
      )}
    </div>
  );
}
