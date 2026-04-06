import type { DateRange } from "../types";

/** Generate array of Dates between start and end (inclusive) */
export function getDateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setHours(0, 0, 0, 0);

  while (current <= endNorm) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/** Calculate a Date N days ago from today */
export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Resolve a DateRange to concrete start/end Dates (both normalized to midnight) */
export function resolveDateRange(dateRange: DateRange): { start: Date; end: Date } {
  if (dateRange.kind === "days") {
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    return {
      start: daysAgo(dateRange.days),
      end,
    };
  }
  const start = new Date(dateRange.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(dateRange.endDate);
  end.setHours(0, 0, 0, 0);
  return { start, end };
}

/** Format a date range as human-readable string */
export function formatDateRange(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return `${fmt(start)} – ${fmt(end)} (${diffDays} days)`;
}
