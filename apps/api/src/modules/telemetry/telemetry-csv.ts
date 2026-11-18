/**
 * CSV serialisation for telemetry exports.
 *
 * Metric keys are device-defined, so the header is the union of every key
 * seen in the exported rows. Cells that start with a formula character are
 * prefixed with an apostrophe so spreadsheets do not execute them.
 */

export interface TelemetryRow {
  timestamp: Date | string;
  metrics: Record<string, unknown> | null;
}

const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) return '""';
  let s = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export function buildTelemetryCsv(rows: TelemetryRow[]): string {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row.metrics ?? {})) {
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
  }

  const header = ['timestamp', ...keys].map(csvCell).join(',');
  const lines = rows.map((row) =>
    [new Date(row.timestamp).toISOString(), ...keys.map((k) => (row.metrics ?? {})[k])]
      .map(csvCell)
      .join(','),
  );
  return [header, ...lines].join('\r\n');
}

export const MAX_EXPORT_ROWS = 50_000;
