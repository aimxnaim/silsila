/**
 * One department, as a page.
 *
 * The drill-down target from the departments index, and — now that the
 * all-people list has gone — the only route to a person. So it has to answer
 * both questions a reader arrives with: what jobs exist here, and who is in
 * them. Roles first, because a role outlives whoever is sitting in it, and the
 * seat is the thing this product models.
 *
 * Those are two questions, so they get two panes rather than two stacked
 * lists. Stacked, the page was a long scroll whose second half repeated the
 * first from the other end — the same seats, keyed by person instead of by
 * job. The reader arrives with one of the two questions, not both.
 *
 * Both panes are tables. A card grid was tried and dropped: it led with the
 * holder's face and name, which buried the job title the roles pane exists to
 * list, and it made counting harder than it needs to be. Columns of the sort
 * you would export are the right dress for both questions here.
 */

import { useMemo, useState } from 'react';
import type { OrgModel } from '../../domain/types.ts';
import { formatMonthYear, tenure } from '../../domain/dates.ts';
import { structuralChangesFor } from '../../domain/metrics.ts';
import { departments, peopleIn, rolesIn, type DepartmentRole } from '../../domain/overview.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { Badge } from '../ui/primitives.tsx';
import { deptAbbr, deptColor } from '../ui/vocabulary.tsx';

type Pane = 'roles' | 'people';

function roleStatus(role: DepartmentRole) {
  if (role.closed) return <Badge>Closed</Badge>;
  if (!role.filled) return <Badge tone="warn">Vacant</Badge>;
  return <Badge tone="ok">Filled</Badge>;
}

export function DeptView({
  model, division, onBack, onOpenPerson, onOpenPosition,
  defaultPane = 'roles',
}: {
  model: OrgModel;
  division: string;
  onBack: () => void;
  onOpenPerson: (id: string) => void;
  onOpenPosition: (id: string) => void;
  /** Which list opens first. Exists so the smoke test can render both panes. */
  defaultPane?: Pane;
}) {
  const [pane, setPane] = useState<Pane>(defaultPane);

  const summary = useMemo(
    () => departments(model).find((d) => d.division === division),
    [model, division],
  );
  const staff = useMemo(() => peopleIn(model, division), [model, division]);
  const roles = useMemo(() => rolesIn(model, division), [model, division]);

  /** Grade bands, counted. The ladder behind the roles listed beneath it. */
  const grades = useMemo(() => {
    const counts = new Map<string, number>();
    for (const pos of model.positions.values()) {
      if (pos.division !== division) continue;
      const key = pos.level === null ? 'Grade not recorded' : `Grade ${pos.level}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [model, division]);

  /** Whoever sits highest in the department is the closest thing to its lead. */
  const lead = useMemo(() => {
    let best: { name: string; level: number } | null = null;
    for (const pos of model.positions.values()) {
      if (pos.division !== division || pos.level === null) continue;
      for (const id of pos.assignmentIds) {
        const a = model.assignments.get(id)!;
        if (a.endDate) continue;
        const person = model.people.get(a.personId);
        if (person && (!best || pos.level > best.level)) best = { name: person.name, level: pos.level };
      }
    }
    return best?.name ?? null;
  }, [model, division]);

  if (!summary) return null;

  const firmHeadcount = departments(model).reduce((n, d) => n + d.headcount, 0);
  const share = Math.round((summary.headcount / Math.max(firmHeadcount, 1)) * 100);
  const vacant = roles.filter((r) => !r.closed && !r.filled).length;

  const tenureOf = (personId: string) => {
    const person = model.people.get(personId);
    if (!person) return 'unknown';
    const list = person.assignmentIds.map((id) => model.assignments.get(id)!);
    return tenure(list[0]?.startDate, list[list.length - 1]?.endDate ?? null);
  };

  return (
    <div className="stack gap-5">
      <button className="backlink no-print" onClick={onBack}>&lsaquo; All departments</button>

      <div className="card row gap-6 wrap" style={{ alignItems: 'center' }}>
        <div className="row gap-4">
          <span
            className="dept-tile"
            style={{ background: deptColor(division), width: 48, height: 48, borderRadius: 11, fontSize: 16 }}
          >
            {deptAbbr(division)}
          </span>
          <div>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em' }}>{division}</div>
            <div className="small muted" style={{ marginTop: 2 }}>
              {lead ? `Led by ${lead} · ` : ''}{share}% of the firm
            </div>
          </div>
        </div>

        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line-soft)' }} />

        {[
          { label: 'Headcount', value: summary.headcount },
          { label: 'Jobs tracked', value: summary.positions },
          { label: 'Structural changes', value: summary.changes },
        ].map((s) => (
          <div key={s.label}>
            <div className="eyebrow">{s.label}</div>
            <div className="tnum" style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ---- Which list ---------------------------------------------------- */}
      <div className="row gap-4 wrap no-print">
        <div className="segmented" role="group" aria-label="Which list to show">
          <button aria-pressed={pane === 'roles'} onClick={() => setPane('roles')}>Roles</button>
          <button aria-pressed={pane === 'people'} onClick={() => setPane('people')}>People</button>
        </div>
      </div>

      {/* The grade ladder belongs to the seats, so it goes when they do. */}
      {pane === 'roles' && (
        <div className="row gap-3 wrap no-print">
          {grades.map(([label, n]) => (
            <span className="gradepill" key={label}>
              <b className="tnum">{n}</b> {label}
            </span>
          ))}
        </div>
      )}

      {/* ---- Roles ------------------------------------------------------- */}
      {pane === 'roles' && (
        <div className="card card-flush">
          <div className="card-head">
            <h3>Roles in this department</h3>
            <span className="micro faint">
              {roles.length} seat{roles.length === 1 ? '' : 's'} tracked
              {vacant > 0 ? ` · ${vacant} vacant` : ''} · click one for its full history
            </span>
          </div>

          {roles.length === 0 ? (
            <p className="small faint" style={{ padding: 'var(--s5)' }}>
              No seats are recorded against this department.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Role</th>
                  <th style={{ width: 200 }}>Held by</th>
                  <th style={{ width: 90 }}>Grade</th>
                  <th style={{ width: 170 }}>Team</th>
                  <th style={{ width: 180 }}>Existed from — to</th>
                  <th style={{ width: 100 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((r) => (
                  <tr key={r.positionId} className="clickable" onClick={() => onOpenPosition(r.positionId)}>
                    <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.title}</td>
                    <td>
                      {r.holder ? (
                        <span className={r.filled ? '' : 'muted'}>{r.holder.name}</span>
                      ) : (
                        <span className="faint">&mdash;</span>
                      )}
                    </td>
                    <td className="tnum">{r.level === null ? <span className="faint">&mdash;</span> : r.level}</td>
                    <td className="small muted">{r.orgUnit}</td>
                    <td className="small muted tnum">
                      {r.createdAt ? formatMonthYear(r.createdAt) : '—'} —{' '}
                      {r.closedAt ? formatMonthYear(r.closedAt) : 'now'}
                    </td>
                    <td>{roleStatus(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ---- People ------------------------------------------------------ */}
      {pane === 'people' && (
        <div className="card card-flush">
          <div className="card-head">
            <h3>People</h3>
            <span className="micro faint">
              {staff.length} {staff.length === 1 ? 'person has' : 'people have'} worked here ·
              click one for the full record
            </span>
          </div>

          {staff.length === 0 ? (
            <p className="small faint" style={{ padding: 'var(--s5)' }}>
              Nobody is recorded against this department.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Job</th>
                  <th>Team</th>
                  <th style={{ width: 140 }}>Years of service</th>
                  <th style={{ width: 120 }}>Status</th>
                  <th style={{ width: 150 }}>Job changed</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((p) => {
                  const structural = structuralChangesFor(model, p.personId).length;
                  return (
                    <tr key={p.personId} className="clickable" onClick={() => onOpenPerson(p.personId)}>
                      <td>
                        <div className="row gap-3" style={{ minWidth: 0 }}>
                          <Avatar name={p.name} />
                          <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.name}</span>
                        </div>
                      </td>
                      <td>{p.title}</td>
                      <td>{p.orgUnit}</td>
                      <td className="tnum">{tenureOf(p.personId)}</td>
                      <td>{p.current ? <Badge tone="ok">Current</Badge> : <Badge>Moved on</Badge>}</td>
                      <td>
                        {structural > 0
                          ? <Badge tone="accent">{structural}&times; around them</Badge>
                          : <span className="faint">&mdash;</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
