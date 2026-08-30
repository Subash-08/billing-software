/**
 * Helper utility to derive Indian Financial Year string (e.g. "2024-25") from a Date.
 * Indian Financial Year runs from April 1 to March 31.
 */
export function getFinancialYear(date: Date | string): string {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date provided for financial year resolution: ${date}`);
  }
  const month = d.getUTCMonth(); // 0-indexed (0 = Jan, 3 = April)
  const year = d.getUTCFullYear();
  const startYear = month >= 3 ? year : year - 1;
  const endYearShort = String(startYear + 1).slice(-2);
  return `${startYear}-${endYearShort}`;
}
