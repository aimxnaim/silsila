/**
 * Requirement 1: accept organisational data from at least one structured source.
 *
 * Two things this view takes seriously.
 *
 * First, the loop is closed: you can download the sample, edit it in a
 * spreadsheet, and drop it back in. A demonstration you cannot feed your own
 * data into is a video, not a tool.
 *
 * Second, failure is designed. A file missing a column produces a sentence
 * naming the column, not a blank screen. Someone will inevitably drop in a
 * spreadsheet of their own, and what happens in that moment is the whole
 * credibility of the thing.
 */

import { useRef, useState } from 'react';
import { OPTIONAL_COLUMNS, REQUIRED_COLUMNS } from '../../domain/csv.ts';
import { DEMO_DATASET_CSV } from '../../data/demoDataset.ts';
import { Button, Card, CardHead, Eyebrow, Notice } from '../ui/primitives.tsx';
import type { LoadError } from '../../hooks/useOrgModel.ts';

export function LoadDataView({
  error, onLoad, onLoadDemo, onClearError, onLoaded,
}: {
  error: LoadError | null;
  onLoad: (text: string, label: string) => boolean;
  onLoadDemo: () => boolean;
  onClearError: () => void;
  onLoaded: () => void;
}) {
  const [hot, setHot] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    onClearError();
    const reader = new FileReader();
    reader.onload = () => {
      const ok = onLoad(String(reader.result ?? ''), file.name);
      if (ok) onLoaded();
    };
    reader.onerror = () => onLoad('', file.name); // surfaces as a designed error
    reader.readAsText(file);
  };

  const downloadSample = () => {
    const blob = new Blob([DEMO_DATASET_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'silsilah-sample.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="stack gap-5">
      <div className="page-head">
        <Eyebrow>Requirement 1 · structured source</Eyebrow>
        <h2 style={{ marginTop: 'var(--s3)' }}>Load your own records</h2>
        <p className="measure muted" style={{ marginTop: 'var(--s3)' }}>
          Export people and positions from whatever HR system you already run — every
          one of them can produce a CSV — and drop it here. Parsing happens in your
          browser. Nothing is uploaded, and there is no server to upload it to.
        </p>
      </div>

      {error ? (
        <Notice tone="error">
          <div>
            <strong>{error.message}</strong>
            {error.hint ? <div className="small muted" style={{ marginTop: 4 }}>{error.hint}</div> : null}
          </div>
        </Notice>
      ) : null}

      <div
        className={`drop ${hot ? 'is-hot' : ''}`}
        onDragEnter={(e) => { e.preventDefault(); setHot(true); }}
        onDragOver={(e) => { e.preventDefault(); setHot(true); }}
        onDragLeave={(e) => { e.preventDefault(); setHot(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setHot(false);
          const file = e.dataTransfer.files?.[0];
          if (file) readFile(file);
        }}
      >
        <h3>Drop a CSV here</h3>
        <p className="small muted" style={{ marginTop: 'var(--s2)' }}>
          or choose a file from your machine
        </p>
        <div className="row gap-3" style={{ justifyContent: 'center', marginTop: 'var(--s5)' }}>
          <Button variant="primary" onClick={() => fileInput.current?.click()}>Choose a file</Button>
          <Button onClick={downloadSample}>Download the sample</Button>
          <Button variant="quiet" onClick={() => { if (onLoadDemo()) onLoaded(); }}>
            Reload the demonstration
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) readFile(file);
            e.target.value = '';
          }}
        />
      </div>

      <div className="grid-2">
        <Card flush>
          <CardHead title="Required columns" meta="without these there is no timeline" />
          <table>
            <tbody>
              {REQUIRED_COLUMNS.map((c) => (
                <tr key={c}>
                  <td className="mono small">{c}</td>
                  <td className="small muted">{DESCRIPTIONS[c]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card flush>
          <CardHead title="Optional columns" meta="used when present" />
          <div className="scroll-y" style={{ maxHeight: 420 }}>
            <table>
              <tbody>
                {OPTIONAL_COLUMNS.map((c) => (
                  <tr key={c}>
                    <td className="mono small">{c}</td>
                    <td className="small muted">{DESCRIPTIONS[c]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card>
        <Eyebrow>Why there is no upload</Eyebrow>
        <p className="measure muted" style={{ marginTop: 'var(--s3)' }}>
          Employment history is personal data under Malaysia's Personal Data Protection
          Act. Parsing in the browser means employee records never leave the machine
          they are already on: no upload, no vendor holding HR data, no cross-border
          transfer to reason about, and no breach surface. The architectural constraint
          and the privacy position are the same decision.
        </p>
      </Card>
    </div>
  );
}

const DESCRIPTIONS: Record<string, string> = {
  person_id: 'Stable identifier for a human. Any string.',
  person_name: 'Display name.',
  position_id: 'Stable identifier for a seat, independent of who sits in it.',
  position_title: 'The job title as recorded at the time.',
  start_date: 'When this person took this seat. YYYY-MM-DD.',
  org_unit: 'Team or department.',
  division: 'The larger grouping the unit sits in. Used to filter the timeline.',
  level: 'Job grade as a number. Higher is more senior. A lineage signal.',
  location: 'Where the seat sits.',
  employment_type: 'Permanent, contract, and so on.',
  position_created: 'When the seat came into existence. Derived if absent, and flagged.',
  position_closed: 'When the seat ceased to exist.',
  end_date: 'When this person left this seat. Blank means current.',
  reports_to_position: 'The position_id this seat reported into. Never guessed if absent.',
  predecessor_positions: 'Semicolon-separated position_ids. This is what drives lineage.',
  change_reason: 'Free text from the record, shown verbatim.',
  source: 'Where this row came from. Shown beside every claim.',
  confidence: 'high, medium or low, as declared by whoever produced the record.',
};
