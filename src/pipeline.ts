import * as fs from "node:fs";
import * as path from "node:path";
import { exec } from "node:child_process";
import type { CliOptions, CorpRecord, PipelineCallbacks, PipelineResult } from "./types";
import { downloadFilings } from "./sftp/client";
import { parseFileFromBuffer } from "./parser/parse-record";
import { normalizeRecord } from "./normalize/index";
import { filterRecords } from "./filter/index";
import { writeExcel } from "./output/excel";
import { writeCsv } from "./output/csv";
import { writeJson } from "./output/json";
import { resolveDateRange } from "./utils/date-range";
import { buildOutputFilename } from "./utils/filename";

export async function runPipeline(
  options: CliOptions,
  callbacks?: PipelineCallbacks
): Promise<PipelineResult> {
  const { start, end } = resolveDateRange(options.dateRange);

  // 1. Download
  const { results: downloaded, skippedFiles } = await downloadFilings(start, end, (progress) => {
    callbacks?.onDownloadProgress?.(progress.completed, progress.total, progress.currentFile);
  });

  if (downloaded.length === 0) {
    return {
      totalDownloaded: 0,
      totalParsed: 0,
      totalFiltered: 0,
      outputPath: "",
      skippedFiles,
    };
  }

  // 2. Parse + Normalize
  const allRecords: CorpRecord[] = [];
  let totalParsed = 0;

  for (const file of downloaded) {
    const rawRecords = parseFileFromBuffer(file.buffer);
    totalParsed += rawRecords.length;

    // Pre-filter: only new incorporations with a person as officer 1
    const qualified = rawRecords.filter((r) => {
      // Skip if not a new formation (has prior transactions or annual reports)
      if (r.lastTransDate.trim() || r.reportYear1.trim()) return false;
      // Skip if officer 1 is not a person
      const o1 = r.officers[0];
      if (!o1 || o1.type.trim() !== "P") return false;
      return true;
    });

    const normalized = qualified.map(normalizeRecord);
    allRecords.push(...normalized);

    callbacks?.onParseProgress?.(file.filename, rawRecords.length);
  }

  // 3. Filter
  const filtered = filterRecords(allRecords, options);
  callbacks?.onFilterComplete?.(totalParsed, filtered.length);

  // 4. Sort by file date (newest first)
  filtered.sort((a, b) => b.fileDate.localeCompare(a.fileDate));

  // 5. Output
  if (filtered.length === 0) {
    return {
      totalDownloaded: downloaded.length,
      totalParsed,
      totalFiltered: 0,
      outputPath: "",
      skippedFiles,
    };
  }

  const outputDir = path.resolve(options.outputDir);
  fs.mkdirSync(outputDir, { recursive: true });

  const filename = buildOutputFilename(start, end, options.entityTypes, options.outputFormat);
  const outputPath = path.join(outputDir, filename);

  switch (options.outputFormat) {
    case "excel":
      await writeExcel(filtered, options.selectedFields, outputPath);
      break;
    case "csv":
      writeCsv(filtered, options.selectedFields, outputPath);
      break;
    case "json":
      writeJson(filtered, outputPath);
      break;
    default: {
      const _exhaustive: never = options.outputFormat;
      throw new Error(`Unsupported output format: ${_exhaustive}`);
    }
  }

  // Open the output file
  openFile(outputPath);

  return {
    totalDownloaded: downloaded.length,
    totalParsed,
    totalFiltered: filtered.length,
    outputPath,
    skippedFiles,
  };
}

/** Open a file with the system default application */
function openFile(filePath: string): void {
  const cmd =
    process.platform === "darwin"
      ? "open"
      : process.platform === "win32"
        ? "start"
        : "xdg-open";

  exec(`${cmd} "${filePath}"`, () => {});
}
