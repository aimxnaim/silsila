/**
 * Requirement 3: reconstruct and present the journey of a person over time.
 *
 * The column that matters here is the last one. "Three titles, one job" is not
 * a curiosity — it is the reason a manager looking at this person's record
 * concludes they have moved around a lot, when in fact the organisation moved
 * around them.
 */

import { useMemo, useState } from 'react';
import type { OrgModel } from '../../domain/types.ts';
import { formatMonthYear } from '../../domain/dates.ts';
import { structuralChangesFor } from '../../domain/metrics.ts';
import { Badge, Card, CardHead, Eyebrow } from '../ui/primitives.tsx';

export function PeopleView({
  model, onOpenPerson,
}: { model: OrgModel; onOpenPerson: (id: string) => void }) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...model.people.values()]
      .map((person) => {
        const assignments = person.assignmentIds.map((id) => model.assignments.get(id)!);
        const titles = new Set(
          assignments.map((a) => model.positions.get(a.positionId)?.title).filter(Boolean),
        );
        return {
          person,
          first: assignments[0],
          last: assignments[assignments.length - 1],
          titleCount: titles.size,
          moves: assignments.length,
          structural: structuralChangesFor(model, person.id).length,
        };
      })
      .filter((r) => !q || r.person.name.toLowerCase().includes(q))
      .sort((a, b) => b.structural - a.structural || b.moves - a.moves || a.person.name.localeCompare(b.person.name));
  }, [model, query]);

  return (
    <div className="stack gap-5">
      <div className="page-head">
        <Eyebrow>Requirement 3 · person journeys</Eyebrow>
        <h2 style={{ marginTop: 'var(--s3)' }}>Everyone in the records, most-affected first</h2>
        <p className="measure muted" style={{ marginTop: 'var(--s3)' }}>
          Sorted by how many structural changes happened underneath each person —
          renames, splits and merges of the seat they were sitting in. The people at
          the top of this list did not necessarily change jobs. Their jobs changed
          around them.
        </p>
      </div>

      <Card flush>
        <CardHead
          title="People"
          meta={`${rows.length} of ${model.people.size}`}
        />
        <div style={{ padding: 'var(--s4) var(--s5)', borderBottom: '1px solid var(--line)' }} className="no-print">
          <input
            className="select"
            style={{ width: '100%', maxWidth: 320, cursor: 'text' }}
            placeholder="Search by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search people by name"
          />
        </div>
        <div className="scroll-y" style={{ maxHeight: 620 }}>
          <table>
            <thead>
              <tr>
                <th>Person</th>
                <th>In the records</th>
                <th>Seats held</th>
                <th>Distinct titles</th>
                <th>Structural changes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ person, first, last, titleCount, moves, structural }) => (
                <tr key={person.id} className="clickable" onClick={() => onOpenPerson(person.id)}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{person.name}</div>
                    <div className="micro faint mono">{person.id}</div>
                  </td>
                  <td className="small muted tnum">
                    {formatMonthYear(first?.startDate)} —{' '}
                    {last?.endDate ? formatMonthYear(last.endDate) : 'present'}
                  </td>
                  <td className="small tnum">{moves}</td>
                  <td className="small tnum">
                    {titleCount}
                    {titleCount > moves - 1 && moves > 1 ? null : null}
                  </td>
                  <td className="small">
                    {structural > 0 ? <Badge tone="accent">{structural}</Badge> : <span className="faint">—</span>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="faint small">No one matches “{query}”.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
