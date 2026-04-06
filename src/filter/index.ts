import type { CorpRecord, CliOptions } from "../types";

export function filterRecords(records: CorpRecord[], options: CliOptions): CorpRecord[] {
  const allowedTypes = new Set<string>(options.entityTypes);

  return records.filter((r) => {
    if (!allowedTypes.has(r.filingType)) return false;
    if (options.activeOnly && r.status !== "Active") return false;
    return true;
  });
}
