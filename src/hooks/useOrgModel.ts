/**
 * The one piece of application state.
 *
 * Loading data is a four-stage pipeline and nothing else in the app is allowed
 * to touch a stage directly:
 *
 *     CSV text -> parseCSV -> ingest -> classifyLineage -> metrics
 *
 * Nothing here writes back to the source. Silsilah reads records and derives
 * from them; the CSV a reader loads is never modified.
 */

import { useCallback, useMemo, useState } from 'react';
import { parseCSV, CSVError } from '../domain/csv.ts';
import { ingest } from '../domain/ingest.ts';
import { classifyLineage } from '../domain/lineage.ts';
import { metrics as computeMetrics } from '../domain/metrics.ts';
import type { OrgModel } from '../domain/types.ts';
import { DEMO_DATASET_CSV, DEMO_DATASET_LABEL } from '../data/demoDataset.ts';

export interface LoadError {
  message: string;
  hint?: string;
}

export function useOrgModel() {
  const [model, setModel] = useState<OrgModel | null>(null);
  const [error, setError] = useState<LoadError | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback((text: string, label: string) => {
    setLoading(true);
    setError(null);
    try {
      const parsed = parseCSV(text);
      const built = ingest(parsed, label);
      built.lineage = classifyLineage(built);
      setModel(built);
      setLoading(false);
      return true;
    } catch (err) {
      setModel(null);
      setLoading(false);
      if (err instanceof CSVError) {
        setError({ message: err.message, hint: err.hint });
      } else {
        setError({
          message: 'That file could not be read.',
          hint: err instanceof Error ? err.message : String(err),
        });
      }
      return false;
    }
  }, []);

  const loadDemo = useCallback(
    () => load(DEMO_DATASET_CSV, DEMO_DATASET_LABEL),
    [load],
  );

  const metrics = useMemo(() => (model ? computeMetrics(model) : null), [model]);

  return { model, metrics, error, loading, load, loadDemo, clearError: () => setError(null) };
}
