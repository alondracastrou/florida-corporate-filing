import { getDateRange } from "./date-range";
import type { EntityType, OutputFormat } from "../types";

/** Format a Date as YYYYMMDDc.txt filename */
export function dateToFilename(d: Date): string {
  const yyyy = d.getFullYear().toString();
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  return `${yyyy}${mm}${dd}c.txt`;
}

/** Generate all expected filenames for a date range */
export function datesToFilenames(start: Date, end: Date): string[] {
  return getDateRange(start, end).map(dateToFilename);
}

/** Extract a Date from a filename like 20260401c.txt */
export function filenameToDate(filename: string): Date | null {
  const match = filename.match(/^(\d{4})(\d{2})(\d{2})c\.txt$/);
  if (!match) return null;
  return new Date(parseInt(match[1], 10), parseInt(match[2], 10) - 1, parseInt(match[3], 10));
}

/** Build a descriptive output filename */
export function buildOutputFilename(
  start: Date,
  end: Date,
  entityTypes: EntityType[],
  format: OutputFormat
): string {
  const fmtDate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = (d.getMonth() + 1).toString().padStart(2, "0");
    const dd = d.getDate().toString().padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const ext = format === "excel" ? "xlsx" : format;
  const types = entityTypes.join("-");
  return `fl-leads-${fmtDate(start)}-to-${fmtDate(end)}-${types}.${ext}`;
}
