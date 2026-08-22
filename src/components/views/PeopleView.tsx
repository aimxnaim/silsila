/**
 * All people.
 *
 * The last column is the one that matters. "Three titles, one job" is not a
 * curiosity — it is why a manager reading this person's record concludes they
 * have moved around a lot, when in fact the organisation moved around them.
 */

import { useMemo, useState } from 'react';
import type { OrgModel } from '../../domain/types.ts';
import { tenure } from '../../domain/dates.ts';
import { structuralChangesFor } from '../../domain/metrics.ts';
import { departments } from '../../domain/overview.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { DeptChip } from '../ui/vocabulary.tsx';
import { Badge } from '../ui/primitives.tsx';

export function PeopleView({
  model, onOpenPerson,
}: { model: OrgModel; onOpenPerson: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const depts = useMemo(() => departments(model), [model]);

  const all = useMemo(() => {
    return [...model.people.values()].map((person) => {
      const assignments = person.assignmentIds.map((id) => model.assignments.get(id)!);
      const latest = assignments[assignments.length - 1];
      const position = latest ? model.positions.get(latest.positionId) : null;
      const titles = new Set(
        assignments.map((a) => model.positions.get(a.positionId)?.title).filter(Boolean),
      );
      return {
        id: person.id,
        name: person.name,
        role: position?.title ?? '—',
        division: position?.division ?? '—',
        years: tenure(assignments[0]?.startDate, latest?.endDate ?? null),
        current: Boolean(latest && !latest.endDate),
        titleCount: titles.size,
        structural: structuralChangesFor(model, person.id).length,
      };
    });
  }, [model]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((r) => filter === 'all' || r.division === filter)
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.role.toLowerCase().includes(q))
      .sort((a, b) => b.structural - a.structural || a.name.localeCompare(b.name));
  }, [all, query, filter]);

  const chips = [{ id: 'all', label: `All (${all.length})` }]
    .concat(depts.map((d) => ({ id: d.division, label: d.division })));

  return (
    <div className="stack gap-5">
      <div>
        <div className="page-title">All people</div>
        <div className="page-sub">
          {rows.length} of {all.length} people listed. Click a row for the full record.
        </div>
      </div>

      <div className="toolbar no-print">
        <input
          className="search"
          placeholder="Search by name or job…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search people"
        />
        {chips.map((c) => (
          <button
            key={c.id}
            className="chip"
            aria-pressed={filter === c.id}
            onClick={() => setFilter(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="card card-flush">
        <div className="scroll-y" style={{ maxHeight: 660 }}>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th style={{ width: 210 }}>Role</th>
                <th style={{ width: 200 }}>Department</th>
                <th style={{ width: 140 }}>Years of service</th>
                <th style={{ width: 120 }}>Status</th>
                <th style={{ width: 130 }}>Job changed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => onOpenPerson(r.id)}>
                  <td>
                    <div className="row gap-3" style={{ minWidth: 0 }}>
                      <Avatar name={r.name} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.name}</div>
                        <div className="micro faint mono">{r.id}</div>
                      </div>
                    </div>
                  </td>
                  <td>{r.role}</td>
                  <td><DeptChip name={r.division} /></td>
                  <td className="tnum">{r.years}</td>
                  <td>{r.current ? <Badge tone="ok">Current</Badge> : <Badge>Moved on</Badge>}</td>
                  <td>
                    {r.structural > 0
                      ? <Badge tone="accent">{r.structural}&times; around them</Badge>
                      : <span className="faint">&mdash;</span>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr><td colSpan={6} className="faint">Nobody matches that.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
