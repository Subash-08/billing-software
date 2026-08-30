/**
 * Settlement Engine — Aging Calculator
 * src/engine/settlement/settlement.aging.ts
 *
 * Pure function — zero DB/HTTP/session dependencies.
 * reportDate MUST come from getTodayBusinessDate() (Asia/Kolkata).
 * dueDate = null → invoice is always CURRENT (Rule 28 / A5).
 */

import { daysBetweenBusinessDates } from '@/lib/business-date';
import { AgingBucket } from './settlement.types';

/**
 * Classifies a single invoice's outstanding balance into an aging bucket.
 *
 * @param dueDate    YYYY-MM-DD | null. Null → always CURRENT.
 * @param reportDate YYYY-MM-DD (today in IST, from getTodayBusinessDate()).
 */
export function getAgingBucket(
  dueDate: string | null,
  reportDate: string
): AgingBucket {
  // Rule 28 [A5]: null dueDate is always CURRENT
  if (!dueDate) return 'CURRENT';

  // days > 0 means dueDate is in the past (overdue)
  const days = daysBetweenBusinessDates(dueDate, reportDate);

  if (days <= 0)  return 'CURRENT';
  if (days <= 30) return '1_30_DAYS';
  if (days <= 60) return '31_60_DAYS';
  if (days <= 90) return '61_90_DAYS';
  return 'OVER_90_DAYS';
}

/**
 * Returns days overdue (positive) or 0 if CURRENT.
 */
export function getDaysOverdue(
  dueDate: string | null,
  reportDate: string
): number {
  if (!dueDate) return 0;
  const days = daysBetweenBusinessDates(dueDate, reportDate);
  return Math.max(0, days);
}
