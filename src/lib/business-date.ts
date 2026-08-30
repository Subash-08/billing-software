/**
 * Business Date Utilities — src/lib/business-date.ts
 *
 * Rule 26: All business dates (invoiceDate, dueDate, paymentDate, reportDate,
 * financialYear) are stored and compared as YYYY-MM-DD strings in Asia/Kolkata.
 * System timestamps (createdAt, updatedAt) remain UTC Date objects.
 *
 * NEVER use new Date() or Date.now() directly for any business-date logic.
 * Use these utilities exclusively.
 */

const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Returns today's date as a YYYY-MM-DD string in Asia/Kolkata timezone.
 */
export function getTodayBusinessDate(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/**
 * Parses a YYYY-MM-DD business-date string into a JS Date object
 * at IST midnight (00:00:00 +05:30).
 * Throws if the string is not a valid business date.
 */
export function parseBusinessDate(dateStr: string): Date {
  if (!isValidBusinessDate(dateStr)) {
    throw new Error(`Invalid business date: "${dateStr}". Expected YYYY-MM-DD.`);
  }
  // Parse as IST midnight — append IST offset explicitly
  return new Date(`${dateStr}T00:00:00+05:30`);
}

/**
 * Validates that a string conforms to YYYY-MM-DD format and represents a real date.
 */
export function isValidBusinessDate(dateStr: unknown): dateStr is string {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(`${dateStr}T00:00:00+05:30`);
  return !isNaN(d.getTime()) && d.toISOString().startsWith(dateStr.slice(0, 4));
}

/**
 * Compares two business-date strings lexicographically.
 * Returns -1 | 0 | 1.
 */
export function compareBusinessDates(a: string, b: string): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

/**
 * Returns the number of calendar days from `fromDate` to `toDate`
 * (positive if toDate is after fromDate, negative if before).
 * Both arguments must be YYYY-MM-DD strings.
 */
export function daysBetweenBusinessDates(fromDate: string, toDate: string): number {
  const from = parseBusinessDate(fromDate).getTime();
  const to = parseBusinessDate(toDate).getTime();
  return Math.round((to - from) / (1000 * 60 * 60 * 24));
}

/**
 * Derives the Indian Financial Year string (e.g. "2026-27") from a
 * YYYY-MM-DD business date string.
 * FY runs April 1 → March 31.
 */
export function toFinancialYear(dateStr: string): string {
  if (!isValidBusinessDate(dateStr)) {
    throw new Error(`Cannot derive financial year from invalid date: "${dateStr}"`);
  }
  const [yearStr, monthStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-indexed
  const startYear = month >= 4 ? year : year - 1;
  const endYearShort = String(startYear + 1).slice(-2);
  return `${startYear}-${endYearShort}`;
}

/**
 * Converts a JS Date (UTC) to a business date string (YYYY-MM-DD) in IST.
 * Use this when you need to derive a business date from a system timestamp.
 */
export function utcDateToBusinessDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}
