import { buildTelemetryCsv } from '../telemetry-csv';

describe('buildTelemetryCsv', () => {
  it('builds a header from the union of metric keys, in first-seen order', () => {
    const csv = buildTelemetryCsv([
      { timestamp: '2025-01-01T00:00:00.000Z', metrics: { temperature: 21.5 } },
      { timestamp: '2025-01-01T00:01:00.000Z', metrics: { temperature: 22, humidity: 40 } },
    ]);
    const [header, first, second] = csv.split('\r\n');

    expect(header).toBe('"timestamp","temperature","humidity"');
    expect(first).toBe('"2025-01-01T00:00:00.000Z","21.5",""');
    expect(second).toBe('"2025-01-01T00:01:00.000Z","22","40"');
  });

  it('escapes quotes and neutralises spreadsheet formulas', () => {
    const csv = buildTelemetryCsv([
      { timestamp: '2025-01-01T00:00:00.000Z', metrics: { note: 'say "hi"', evil: '=cmd|calc' } },
    ]);
    const row = csv.split('\r\n')[1];

    expect(row).toContain('"say ""hi"""');
    expect(row).toContain(`"'=cmd|calc"`);
  });

  it('serialises nested metric values as JSON', () => {
    const csv = buildTelemetryCsv([
      { timestamp: '2025-01-01T00:00:00.000Z', metrics: { gps: { lat: 1, lng: 2 } } },
    ]);
    expect(csv.split('\r\n')[1]).toContain('"{""lat"":1,""lng"":2}"');
  });

  it('returns just the header for no rows and tolerates null metrics', () => {
    expect(buildTelemetryCsv([])).toBe('"timestamp"');
    expect(
      buildTelemetryCsv([{ timestamp: '2025-01-01T00:00:00.000Z', metrics: null }]).split('\r\n')[1],
    ).toBe('"2025-01-01T00:00:00.000Z"');
  });
});
