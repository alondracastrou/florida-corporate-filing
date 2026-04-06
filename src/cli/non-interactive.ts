import { Command } from "commander";
import pc from "picocolors";
import type { CliOptions, EntityType, FieldGroupKey, OutputFormat } from "../types";
import {
  REQUIRED_FIELDS,
  DEFAULT_ENTITY_TYPES,
  DEFAULT_FIELD_GROUPS,
  VALID_ENTITY_TYPES,
  FIELD_GROUPS,
  FILING_TYPES,
} from "../constants";
import { runPipeline } from "../pipeline";
import { resolveDateRange, formatDateRange } from "../utils/date-range";

export async function runNonInteractive(): Promise<void> {
  const program = new Command();

  program
    .name("fl-leads")
    .version("1.0.0")
    .description("Download and process FL corporate filings into GTM-ready lead data")
    .option("-d, --days <n>", "Number of days to look back", "7")
    .option("--start-date <YYYY-MM-DD>", "Start date (overrides --days)")
    .option("--end-date <YYYY-MM-DD>", "End date (defaults to today)")
    .option(
      "-t, --type <types>",
      `Comma-separated entity types: ${[...VALID_ENTITY_TYPES].join(", ")}`,
      DEFAULT_ENTITY_TYPES.join(",")
    )
    .option(
      "--fields <groups>",
      `Comma-separated field groups: ${Object.keys(FIELD_GROUPS).join(", ")}`,
      DEFAULT_FIELD_GROUPS.join(",")
    )
    .option("-f, --format <format>", "Output format: excel, csv, json", "excel")
    .option("--active-only", "Only include active businesses (default)", true)
    .option("--no-active-only", "Include inactive businesses")
    .option("-o, --output-dir <path>", "Output directory", "./output")
    .option("--dry-run", "Show what would be downloaded without writing output", false)
    .addHelpText(
      "after",
      `
Examples:
  fl-leads                                      Interactive mode
  fl-leads --days 7                             Last 7 days, all defaults
  fl-leads -d 30 -t DOMP                        Last 30 days, domestic profit only
  fl-leads --start-date 2026-03-01 --end-date 2026-03-31
  fl-leads --days 7 --format csv                Export as CSV
  fl-leads --days 14 --fields filingInfo,officer1
  fl-leads --days 7 --no-active-only            Include dissolved companies
  fl-leads --dry-run --days 30                  Preview without downloading
`
    );

  program.parse();
  const opts = program.opts();

  // Validate mutual exclusivity: --days vs --start-date
  const daysExplicit = program.getOptionValueSource("days") === "cli";
  if (opts.startDate && daysExplicit) {
    console.error(
      pc.red("Error: Use either --days or --start-date/--end-date, not both.")
    );
    process.exit(1);
  }

  // Validate --end-date requires --start-date
  if (opts.endDate && !opts.startDate) {
    console.error(
      pc.red("Error: --end-date requires --start-date. Use both together for a custom range.")
    );
    process.exit(1);
  }

  // Validate --days is a positive integer (strict: reject "7d", "3.5", etc.)
  const days = Number(opts.days);
  if (!Number.isInteger(days) || days < 1) {
    console.error(pc.red("Error: --days must be a positive whole number (e.g. 7, 14, 30)."));
    process.exit(1);
  }

  // Validate --start-date / --end-date format
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  if (opts.startDate) {
    if (!datePattern.test(opts.startDate) || isNaN(Date.parse(opts.startDate))) {
      console.error(pc.red("Error: --start-date must be a valid date in YYYY-MM-DD format."));
      process.exit(1);
    }
  }
  if (opts.endDate) {
    if (!datePattern.test(opts.endDate) || isNaN(Date.parse(opts.endDate))) {
      console.error(pc.red("Error: --end-date must be a valid date in YYYY-MM-DD format."));
      process.exit(1);
    }
  }

  // Validate start < end for custom range
  if (opts.startDate && opts.endDate) {
    if (new Date(opts.startDate) >= new Date(opts.endDate)) {
      console.error(pc.red("Error: --start-date must be before --end-date."));
      process.exit(1);
    }
  }

  // Validate format
  if (!["excel", "csv", "json"].includes(opts.format)) {
    console.error(pc.red(`Error: Invalid format "${opts.format}". Use excel, csv, or json.`));
    process.exit(1);
  }

  // Parse and validate entity types
  const entityTypes = opts.type.split(",").map((t: string) => t.trim()).filter(Boolean) as EntityType[];
  if (entityTypes.length === 0) {
    console.error(pc.red("Error: At least one entity type is required."));
    process.exit(1);
  }
  for (const t of entityTypes) {
    if (!VALID_ENTITY_TYPES.has(t as EntityType)) {
      console.error(
        pc.red(`Error: Unknown entity type "${t}". Available: ${[...VALID_ENTITY_TYPES].join(", ")}`)
      );
      process.exit(1);
    }
  }

  // Parse and validate field groups
  const fieldGroups = opts.fields.split(",").map((f: string) => f.trim()).filter(Boolean) as FieldGroupKey[];
  if (fieldGroups.length === 0) {
    console.error(pc.red("Error: At least one field group is required."));
    process.exit(1);
  }
  for (const f of fieldGroups) {
    if (!(f in FIELD_GROUPS)) {
      console.error(
        pc.red(
          `Error: Unknown field group "${f}". Available: ${Object.keys(FIELD_GROUPS).join(", ")}`
        )
      );
      process.exit(1);
    }
  }

  const options: CliOptions = {
    dateRange: opts.startDate
      ? {
          kind: "custom",
          startDate: opts.startDate,
          endDate: opts.endDate ?? new Date().toISOString().slice(0, 10),
        }
      : { kind: "days", days },
    entityTypes,
    outputFormat: opts.format as OutputFormat,
    activeOnly: opts.activeOnly,
    selectedFields: {
      required: REQUIRED_FIELDS,
      selectedGroups: fieldGroups,
    },
    outputDir: opts.outputDir,
    dryRun: opts.dryRun,
  };

  if (options.dryRun) {
    const { start, end } = resolveDateRange(options.dateRange);
    console.log(pc.bold("\nDry run — no files will be written.\n"));
    const entityLabels = entityTypes
      .map((t) => FILING_TYPES[t as keyof typeof FILING_TYPES] ?? t)
      .join(", ");
    const fieldLabels = fieldGroups
      .map((g) => FIELD_GROUPS[g]?.label ?? g)
      .join(", ");
    console.log(`Entity types: ${entityLabels}`);
    console.log(`Date range:   ${formatDateRange(start, end)}`);
    console.log(`Active only:  ${options.activeOnly ? "Yes" : "No"}`);
    console.log(`Format:       ${options.outputFormat}`);
    console.log(`Fields:       ${fieldLabels}`);
    console.log();
    return;
  }

  console.log(pc.dim("Downloading filings from FL Division of Corporations..."));

  try {
    const result = await runPipeline(options, {
      onDownloadProgress: (completed, total, currentFile) => {
        if (currentFile !== "done") {
          process.stdout.write(
            `\r${pc.dim(`Downloading [${completed + 1}/${total}] ${currentFile}`)}`
          );
        }
      },
      onParseProgress: () => {},
      onFilterComplete: (total, filtered) => {
        console.log(`\nParsed ${total} records, filtered to ${filtered} leads.`);
      },
    });

    if (result.totalDownloaded === 0) {
      console.log(pc.yellow("No files found for the selected date range."));
      process.exit(0);
    }

    if (result.totalFiltered === 0) {
      console.log(
        pc.yellow("No records matched your filters. Try more entity types or a wider range.")
      );
      process.exit(0);
    }

    if (result.skippedFiles.length > 0) {
      console.log(pc.yellow(`Skipped files: ${result.skippedFiles.join(", ")}`));
    }

    console.log(
      pc.green(`\nWrote ${result.totalFiltered} leads to ${result.outputPath}`)
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(pc.red(`\nError: ${message}`));
    process.exit(1);
  }
}
