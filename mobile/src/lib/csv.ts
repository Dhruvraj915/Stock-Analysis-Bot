/** Minimal CSV parser for the backtest export — no quoted/escaped fields (see src/backtest.ts writeCsv). */
export function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const header = lines[0].split(',');
  return lines.slice(1).map((line) => {
    const cells = line.split(',');
    const row: Record<string, string> = {};
    header.forEach((key, i) => {
      row[key] = cells[i];
    });
    return row;
  });
}
