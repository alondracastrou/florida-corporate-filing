# FL Corp Filing Leads

A CLI tool that downloads daily corporate filing data from the Florida Division of Corporations public SFTP server, parses the fixed-width records, and exports clean, filtered lead data to Excel, CSV, or JSON.

## What It Does

1. Connects to the FL Division of Corporations public SFTP server (`sftp.floridados.gov`)
2. Downloads daily filing files for your selected date range
3. Parses the fixed-width text records (corp info, addresses, officers, registered agents)
4. Normalizes the data (date formatting, address cleanup, name parsing, zip code formatting)
5. Filters to only **brand-new incorporations** — annual reports, amendments, reinstatements, and registered agent changes are excluded
6. Excludes records where the primary officer is another company or is missing entirely — only businesses with a real person as Officer 1 are included
7. Filters by entity type (LLC, Domestic Profit, Foreign Corp, etc.) and active/inactive status
8. Sorts results by file date (newest first)
9. Exports to Excel (.xlsx), CSV, or JSON
10. Automatically opens the output file when done

## Filtering Logic

Records must pass all of the following to be included in the output:

- **New formations only**: Records with a populated Last Transaction Date or Annual Report Year are skipped. Per the FL Division of Corporations data definitions, the File Date field is the "file date of the formation filing" — it reflects the original incorporation date, not subsequent filings.
- **Person as primary officer**: Officer 1 must have a type of `P` (Person). Records where Officer 1 is a corporation (`C`) or has no officer listed are excluded.
- **Entity type**: Must match one of the selected entity types (e.g., DOMP, FLAL).
- **Active status**: When active-only mode is on (default), only records with status `A` are included.

## Requirements

- [Bun](https://bun.sh/) v1.0 or later
- macOS, Linux, or Windows
- Internet connection (to reach the FL SFTP server)

## Installation

```bash
# Clone the repository
git clone https://github.com/alondracastrou/florida-corporate-filing.git
cd florida-corporate-filing

# Install dependencies
bun install
```

## Usage

### Interactive Mode

Run without any flags to get guided prompts:

```bash
bun start
```

You'll be asked to select:

- Business types (DOMP, FLAL, FORP, etc.)
- Date range (last 7/14/30 days or custom)
- Whether to skip inactive/dissolved companies
- Which data fields to include
- Output format (Excel, CSV, JSON)

### Non-Interactive Mode

Pass flags directly for scripted or one-off usage:

```bash
# Last 7 days with defaults (DOMP + FLAL, Excel, active only)
bun start -- --days 7

# Last 30 days, domestic profit corps only
bun start -- -d 30 -t DOMP

# Custom date range
bun start -- --start-date 2026-03-01 --end-date 2026-03-31

# Export as CSV
bun start -- --days 7 --format csv

# Include inactive/dissolved companies
bun start -- --days 7 --no-active-only

# Select specific field groups
bun start -- --days 14 --fields filingInfo,officer1,principalAddress

# Preview without downloading
bun start -- --dry-run --days 30
```

### Flags

| Flag                                 | Description                           | Default                                |
| ------------------------------------ | ------------------------------------- | -------------------------------------- |
| `-d, --days <n>`                     | Number of days to look back           | `7`                                    |
| `--start-date <YYYY-MM-DD>`          | Start date (overrides --days)         | —                                      |
| `--end-date <YYYY-MM-DD>`            | End date (use with --start-date)      | today                                  |
| `-t, --type <types>`                 | Comma-separated entity types          | `DOMP,FLAL`                            |
| `--fields <groups>`                  | Comma-separated field groups          | `filingInfo,principalAddress,officer1` |
| `-f, --format <format>`              | Output format: `excel`, `csv`, `json` | `excel`                                |
| `--active-only` / `--no-active-only` | Filter by active status               | active only                            |
| `-o, --output-dir <path>`            | Output directory                      | `./output`                             |
| `--dry-run`                          | Preview settings without downloading  | —                                      |

### Entity Types

| Code    | Description                       |
| ------- | --------------------------------- |
| `DOMP`  | Domestic Profit Corporation       |
| `FLAL`  | Florida Limited Liability Company |
| `FORP`  | Foreign Profit Corporation        |
| `DOMNP` | Domestic Non-Profit Corporation   |
| `DOMLP` | Domestic Limited Partnership      |
| `FORNP` | Foreign Non-Profit Corporation    |
| `FORLP` | Foreign Limited Partnership       |

### Field Groups

| Group                | Included Fields                                       |
| -------------------- | ----------------------------------------------------- |
| `filingInfo`         | Entity type, status, filing type, file date           |
| `feiNumber`          | FEI / EIN                                             |
| `principalAddress`   | Principal address, city, state, zip                   |
| `mailAddress`        | Mailing address, city, state, zip                     |
| `registeredAgent`    | RA name, address, city, state, zip                    |
| `officer1`           | Primary officer title, name, first/last name, address |
| `additionalOfficers` | All other officers (combined into one field)          |

## Data Source

Records are sourced from the FL Division of Corporations public SFTP server. The daily Corporate Data Files use a fixed-width format (1440 characters per record) as defined in the [Corporate File Definitions](https://dos.sunbiz.org/data-definitions/cor.html). Each officer entry includes a Type field — `P` for Person, `C` for Corporation — which is used to filter out company-managed entities.

## Output

Files are saved to the `./output` directory by default. The filename includes the date range and entity types, e.g.:

```
fl-leads_2026-03-29_to_2026-04-04_DOMP-FLAL.xlsx
```

The output file opens automatically after generation.
