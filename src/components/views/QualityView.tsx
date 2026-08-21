/**
 * Requirement 6: handle incomplete or inconsistent records gracefully.
 *
 * "Gracefully" is usually read as "do not crash". We read it as "do not lie".
 * Most tools silently interpolate across a missing value, which produces a
 * clean-looking chart that nobody who owns the data believes. Every gap found
 * here is surfaced, none is filled, and a conflict can only be settled by a
 * human choosing a source — a choice that is recorded alongside the records
 * rather than written over them.
 */

import { useMemo } from 'react';
import type { DataIssue, IssueKind, OrgModel } from '../../domain/types.ts';
import { Badge, Button, Card, CardHead, Empty, Eyebrow } from '../ui/primitives.tsx';
import { ISSUE_LABEL, ISSUE_MEANING } from '../ui/vocabulary.tsx';

const KINDS: IssueKind[] = ['conflict', 'missing', 'inferred', 'inconsistent'];

export function QualityView({
  model, onResolve, onOpenPosition, onOpenPerson,
}: {
  model: OrgModel;
  onResolve: (issueId: string, chosenLabel: string, reportsToPositionId: string | null) => void;
  onOpenPosition: (id: string) => void;
  onOpenPerson: (id: string) => void;
}) {
  const byKind = useMemo(() => {
    const out = new Map<IssueKind, DataIssue[]>();
    for (const k of KINDS) out.set(k, []);
    for (const issue of model.issues) out.get(issue.kind)?.push(issue);
    return out;
  }, [model]);

  const open = (issue: DataIssue) =>
    issue.subjectKind === 'position' ? onOpenPosition(issue.subjectId) : onOpenPerson(issue.subjectId);

  return (
    <div className="stack gap-5">
      <div className="page-head">
        <Eyebrow>Requirement 6 · incomplete records</Eyebrow>
        <h2 style={{ marginTop: 'var(--s3)' }}>What these records cannot tell us</h2>
        <p className="measure muted" style={{ marginTop: 'var(--s3)' }}>
          {model.stats.rowsRead} rows were read and {model.stats.rowsUsed} were usable.
          Below is everything the data does not settle. None of it has been filled in.
          On the timeline these periods are drawn as a diagonal hatch rather than a
          colour, because a gap is not a category.
        </p>
      </div>

      <div className="grid-3">
        {KINDS.map((kind) => (
          <Card tight key={kind}>
            <div className="row spread" style={{ alignItems: 'baseline' }}>
              <strong>{ISSUE_LABEL[kind]}</strong>
              <span className="tnum" style={{ fontSize: 22 }}>{byKind.get(kind)!.length}</span>
            </div>
            <p className="micro muted" style={{ marginTop: 'var(--s2)' }}>{ISSUE_MEANING[kind]}</p>
          </Card>
        ))}
      </div>

      {model.issues.length === 0 ? (
        <Card>
          <Empty title="Nothing unresolved">
            Every record in this file is complete, internally consistent and agreed
            between its sources. That is unusual.
          </Empty>
        </Card>
      ) : null}

      {KINDS.map((kind) => {
        const issues = byKind.get(kind)!;
        if (issues.length === 0) return null;
        return (
          <Card flush key={kind}>
            <CardHead title={ISSUE_LABEL[kind]} meta={ISSUE_MEANING[kind]} />
            <div className="stack">
              {issues.map((issue) => (
                <div
                  key={issue.id}
                  style={{ padding: 'var(--s5)', borderBottom: '1px solid var(--line)' }}
                >
                  <div className="row gap-3 wrap" style={{ alignItems: 'baseline' }}>
                    <Badge tone={issue.resolution ? 'ink' : 'warn'}>
                      {issue.resolution ? 'Resolved in session' : ISSUE_LABEL[kind]}
                    </Badge>
                    <strong>{issue.title}</strong>
                  </div>
                  <p className="small muted measure" style={{ marginTop: 'var(--s2)' }}>
                    {issue.detail}
                  </p>

                  {issue.options && !issue.resolution ? (
                    <div className="grid-2" style={{ marginTop: 'var(--s4)' }}>
                      {issue.options.map((option, i) => (
                        <div className="card card-tight" key={`${issue.id}-${i}`}>
                          <div className="micro faint">Source</div>
                          <div style={{ fontWeight: 500, marginTop: 2 }}>{option.source}</div>
                          <div className="small muted" style={{ marginTop: 'var(--s2)' }}>
                            Reports to{' '}
                            {option.reportsToPositionId
                              ? (model.positions.get(option.reportsToPositionId)?.title ?? option.reportsToPositionId)
                              : 'nobody recorded'}
                          </div>
                          <div className="micro faint" style={{ marginTop: 2 }}>
                            Declared confidence: {option.confidence}
                          </div>
                          <div style={{ marginTop: 'var(--s3)' }} className="no-print">
                            <Button
                              small
                              onClick={() => onResolve(issue.id, option.label, option.reportsToPositionId)}
                            >
                              Trust this source
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {issue.resolution ? (
                    <p className="small" style={{ marginTop: 'var(--s3)' }}>
                      A reader chose to trust <strong>{issue.resolution.chosenLabel}</strong> at{' '}
                      <span className="tnum">
                        {new Date(issue.resolution.resolvedAt).toLocaleString()}
                      </span>
                      . The competing record is still in the file — Silsilah reads, it
                      never writes back.
                    </p>
                  ) : null}

                  <div style={{ marginTop: 'var(--s3)' }} className="no-print">
                    <Button small variant="quiet" onClick={() => open(issue)}>
                      Open the {issue.subjectKind === 'position' ? 'position' : 'person'} →
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
