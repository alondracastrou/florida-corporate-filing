import * as p from "@clack/prompts";
import pc from "picocolors";
import type { CliOptions, EntityType, FieldGroupKey, OutputFormat } from "../types";
import {
  ENTITY_TYPE_OPTIONS,
  FIELD_GROUP_OPTIONS,
  DEFAULT_ENTITY_TYPES,
  DEFAULT_FIELD_GROUPS,
  REQUIRED_FIELDS,
  FILING_TYPES,
} from "../constants";
import { runPipeline } from "../pipeline";
import { resolveDateRange, formatDateRange } from "../utils/date-range";

export async function runInteractive(): Promise<void> {
  p.intro(pc.bgCyan(pc.black(" FL Corp Filing Leads ")));

  // Gather options through prompts
  const entityTypes = await p.multiselect({
    message: "What types of businesses?",
    options: ENTITY_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    initialValues: DEFAULT_ENTITY_TYPES as EntityType[],
    required: true,
  });
  if (p.isCancel(entityTypes)) { p.cancel("Cancelled."); process.exit(0); }

  const timeframe = await p.select({
    message: "How far back?",
    options: [
      { value: 7, label: "Last 7 days" },
      { value: 14, label: "Last 14 days" },
      { value: 30, label: "Last 30 days" },
      { value: "custom" as const, label: "Custom date range" },
    ],
    initialValue: 7 as number | "custom",
  });
  if (p.isCancel(timeframe)) { p.cancel("Cancelled."); process.exit(0); }

  let startDate: string | undefined;
  let endDate: string | undefined;

  if (timeframe === "custom") {
    const validateDate = (v: string | undefined): string | undefined => {
      if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return "Use YYYY-MM-DD format";
      if (isNaN(Date.parse(v))) return "That's not a valid date";
      return undefined;
    };

    const start = await p.text({
      message: "Start date (YYYY-MM-DD)",
      placeholder: "e.g. 2026-03-01",
      validate: validateDate,
    });
    if (p.isCancel(start)) { p.cancel("Cancelled."); process.exit(0); }

    const end = await p.text({
      message: "End date (YYYY-MM-DD)",
      placeholder: "e.g. 2026-03-31",
      validate: validateDate,
    });
    if (p.isCancel(end)) { p.cancel("Cancelled."); process.exit(0); }

    if (new Date(start as string) >= new Date(end as string)) {
      p.log.error("Start date must be before end date.");
      process.exit(1);
    }

    startDate = start as string;
    endDate = end as string;
  }

  const activeOnly = await p.confirm({
    message: "Skip inactive or dissolved companies?",
    initialValue: true,
  });
  if (p.isCancel(activeOnly)) { p.cancel("Cancelled."); process.exit(0); }

  // Required fields info
  p.log.info(
    `Required fields (always included): ${pc.bold("Corp Number")}, ${pc.bold("Corp Name")}`
  );

  const selectedGroups = await p.multiselect({
    message: "Select additional data to export:",
    options: FIELD_GROUP_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    initialValues: DEFAULT_FIELD_GROUPS as FieldGroupKey[],
    required: true,
  });
  if (p.isCancel(selectedGroups)) { p.cancel("Cancelled."); process.exit(0); }

  const outputFormat = await p.select({
    message: "Output format?",
    options: [
      { value: "excel" as const, label: "Excel (.xlsx)", hint: "recommended" },
      { value: "csv" as const, label: "CSV" },
      { value: "json" as const, label: "JSON" },
    ],
    initialValue: "excel" as OutputFormat,
  });
  if (p.isCancel(outputFormat)) { p.cancel("Cancelled."); process.exit(0); }

  // Build options
  const options: CliOptions = {
    dateRange:
      timeframe === "custom"
        ? { kind: "custom", startDate: startDate!, endDate: endDate! }
        : { kind: "days", days: timeframe },
    entityTypes: entityTypes as EntityType[],
    outputFormat: outputFormat as OutputFormat,
    activeOnly: activeOnly as boolean,
    selectedFields: {
      required: REQUIRED_FIELDS,
      selectedGroups: selectedGroups as FieldGroupKey[],
    },
    outputDir: "./output",
    dryRun: false,
  };

  // Confirmation summary
  const { start: resolvedStart, end: resolvedEnd } = resolveDateRange(options.dateRange);
  const entityLabels = (entityTypes as EntityType[])
    .map((t) => FILING_TYPES[t as keyof typeof FILING_TYPES] ?? t)
    .join(", ");
  const fieldLabels = (selectedGroups as FieldGroupKey[])
    .map((g) => FIELD_GROUP_OPTIONS.find((o) => o.value === g)?.label ?? g)
    .join(", ");
  const extMap = { excel: "Excel (.xlsx)", csv: "CSV", json: "JSON" };

  p.note(
    [
      `${pc.bold("Businesses:")}  ${entityLabels}`,
      `${pc.bold("Date range:")}  ${formatDateRange(resolvedStart, resolvedEnd)}`,
      `${pc.bold("Active only:")} ${activeOnly ? "Yes" : "No"}`,
      `${pc.bold("Fields:")}      Corp Number, Corp Name, ${fieldLabels}`,
      `${pc.bold("Format:")}      ${extMap[outputFormat as OutputFormat]}`,
    ].join("\n"),
    "Summary"
  );

  const confirm = await p.confirm({
    message: "Look good?",
    initialValue: true,
  });
  if (p.isCancel(confirm) || !confirm) { p.cancel("Cancelled."); process.exit(0); }

  // Run pipeline
  const s = p.spinner();
  s.start("Connecting to FL Division of Corporations SFTP...");

  try {
    const result = await runPipeline(options, {
      onDownloadProgress: (completed, total, currentFile) => {
        if (currentFile === "done") {
          s.message(`Downloaded ${total} file(s)`);
        } else {
          s.message(`Downloading filings... [${completed + 1}/${total}] ${currentFile}`);
        }
      },
      onParseProgress: (file, count) => {
        s.message(`Parsing ${file}... (${count} records)`);
      },
      onFilterComplete: (total, filtered) => {
        s.message(`Filtered ${total} records → ${filtered} leads`);
      },
    });

    if (result.totalDownloaded === 0) {
      s.stop("No files found for the selected date range.");
      p.outro("Try a wider date range. Files may not exist on weekends or holidays.");
      return;
    }

    if (result.totalFiltered === 0) {
      s.stop("No matching records found.");
      p.outro(
        "No records matched your filters. Try including more entity types or a wider date range."
      );
      return;
    }

    s.stop("Processing complete.");

    p.log.info(`${pc.bold("Files downloaded:")}     ${result.totalDownloaded}`);
    p.log.info(`${pc.bold("Records parsed:")}      ${result.totalParsed}`);
    p.log.info(`${pc.bold("Leads after filter:")}  ${result.totalFiltered}`);

    if (result.skippedFiles.length > 0) {
      p.log.warn(`Skipped files: ${result.skippedFiles.join(", ")}`);
    }

    p.outro(
      pc.green(`Wrote ${result.totalFiltered} leads to ${result.outputPath}`)
    );
  } catch (err) {
    s.stop("Error occurred.");
    p.log.error(String(err));
    process.exit(1);
  }
}
