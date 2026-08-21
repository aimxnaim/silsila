/** Date helpers. Everything in the app is quantised to quarters. */

import type { ISODate } from './types.ts';

/** The window the interface covers. Every record is clamped into it. */
export const WINDOW_START_YEAR = 2021;
export const WINDOW_START_QUARTER = 0; // Q1
export const WINDOW_QUARTERS = 22;     // Q1 2021 .. Q2 2026

export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Convert a date to an index in the window.
 * Dates before the window clamp to 0; dates after clamp to the last quarter.
 */
export function toQuarterIndex(value: ISODate | null | undefined): number | null {
  const d = parseDate(value ?? null);
  if (!d) return null;
  const raw =
    (d.getUTCFullYear() - WINDOW_START_YEAR) * 4 +
    Math.floor(d.getUTCMonth() / 3) -
    WINDOW_START_QUARTER;
  return Math.max(0, Math.min(WINDOW_QUARTERS - 1, raw));
}

export function quarterLabel(index: number): string {
  const total = WINDOW_START_QUARTER + index;
  const year = WINDOW_START_YEAR + Math.floor(total / 4);
  return `Q${(total % 4) + 1} ${year}`;
}

export function quarterLabelShort(index: number): string {
  const total = WINDOW_START_QUARTER + index;
  const year = WINDOW_START_YEAR + Math.floor(total / 4);
  return `Q${(total % 4) + 1}'${String(year).slice(2)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatDate(value: ISODate | null | undefined): string {
  const d = parseDate(value ?? null);
  if (!d) return 'unknown';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatMonthYear(value: ISODate | null | undefined): string {
  const d = parseDate(value ?? null);
  if (!d) return 'unknown';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function daysBetween(a: ISODate | null, b: ISODate | null): number | null {
  const da = parseDate(a);
  const db = parseDate(b);
  if (!da || !db) return null;
  return Math.abs(db.getTime() - da.getTime()) / 86_400_000;
}
