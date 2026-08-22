/**
 * One department, as a page.
 *
 * The drill-down target from the overview. Header, the roles inside it, then
 * everyone who has worked here — the same three-part shape the person page
 * uses, so moving between them costs the reader nothing.
 */

import { useMemo } from 'react';
import type { OrgModel } from '../../domain/types.ts';
import { tenure } from '../../domain/dates.ts';
import { departments, peopleIn } from '../../domain/overview.ts';
import { Avatar } from '../ui/Avatar.tsx';
import { Badge } from '../ui/primitives.tsx';
import { deptAbbr, deptColor } from '../ui/vocabulary.tsx';

export function DeptView({
  model, division, onBack, onOpenPerson,
}: {
  model: OrgModel;
  division: string;
  onBack: () => void;
  onOpenPerson: (id: string) => void;
}) {
  const summary = useMemo(
    () => departments(model).find((d) => d.division === division),
    [model, division],
  );
  const staff = useMemo(() => peopleIn(model, division), [model, division]);

  /** Grade bands, counted. The nearest honest equivalent of a role ladder. */
  const roles = useMemo(() => {
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

      <div className="card">
        <div style={{ fontSize: 15, fontWeight: 700 }}>Grades in this department</div>
        <div className="row gap-3 wrap" style={{ marginTop: 'var(--s4)' }}>
          {roles.map(([label, n]) => (
            <div className="rolebox" key={label}>
              <b className="tnum">{n}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card card-flush">
        <div style={{ padding: '18px 22px 14px', fontSize: 15, fontWeight: 700 }}>
          People &mdash; click for the full record
        </div>
        <table>
          <thead>
            <tr><th>Name</th><th>Job</th><th>Team</th><th>Years of service</th><th>Status</th></tr>
          </thead>
          <tbody>
            {staff.map((p) => (
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
