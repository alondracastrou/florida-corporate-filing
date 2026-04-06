/** Raw parsed fields before normalization — all strings, never optional */
export interface RawCorpRecord {
  corpNumber: string;
  corpName: string;
  status: string;
  filingType: string;
  principalAddress1: string;
  principalAddress2: string;
  principalCity: string;
  principalState: string;
  principalZip: string;
  principalCountry: string;
  mailAddress1: string;
  mailAddress2: string;
  mailCity: string;
  mailState: string;
  mailZip: string;
  mailCountry: string;
  fileDate: string;
  feiNumber: string;
  moreOfficers: string;
  lastTransDate: string;
  stateOfInc: string;
  reportYear1: string;
  reportDate1: string;
  reportYear2: string;
  reportDate2: string;
  reportYear3: string;
  reportDate3: string;
  raName: string;
  raType: string;
  raAddress: string;
  raCity: string;
  raState: string;
  raZip: string;
  officers: RawOfficer[];
}

export interface RawOfficer {
  title: string;
  type: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

/** Cleaned, normalized record ready for output */
export interface CorpRecord {
  corpNumber: string;
  entityType: string;
  corpName: string;
  status: "Active" | "Inactive";
  filingType: string;
  filingTypeLabel: string;
  principalAddress: string;
  principalCity: string;
  principalState: string;
  principalZip: string;
  principalCountry: string;
  mailAddress: string;
  mailCity: string;
  mailState: string;
  mailZip: string;
  mailCountry: string;
  fileDate: string;
  feiNumber: string;
  stateOfInc: string;
  raFullName: string;
  raFirstName: string;
  raLastName: string;
  raAddress: string;
  raCity: string;
  raState: string;
  raZip: string;
  officers: Officer[];
}

export interface Officer {
  title: string;
  titleLabel: string;
  type: string;
  fullName: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}

export interface ParsedName {
  firstName: string;
  lastName: string;
  middleSuffix: string;
  fullName: string;
}

/** Date range — discriminated union */
export type DateRange =
  | { kind: "days"; days: number }
  | { kind: "custom"; startDate: string; endDate: string };

export type EntityType =
  | "DOMP"
  | "FLAL"
  | "FORP"
  | "FORNP"
  | "DOMNP"
  | "DOMLP"
  | "FORLP";

export type OutputFormat = "excel" | "csv" | "json";

export type FieldGroupKey =
  | "filingInfo"
  | "feiNumber"
  | "principalAddress"
  | "mailAddress"
  | "registeredAgent"
  | "officer1"
  | "additionalOfficers";

export interface FieldSelection {
  readonly required: readonly string[];
  selectedGroups: FieldGroupKey[];
}

export interface CliOptions {
  dateRange: DateRange;
  entityTypes: EntityType[];
  outputFormat: OutputFormat;
  activeOnly: boolean;
  selectedFields: FieldSelection;
  outputDir: string;
  dryRun: boolean;
}

export interface PipelineCallbacks {
  onDownloadProgress?: (completed: number, total: number, currentFile: string) => void;
  onParseProgress?: (file: string, recordCount: number) => void;
  onFilterComplete?: (total: number, filtered: number) => void;
}

export interface PipelineResult {
  totalDownloaded: number;
  totalParsed: number;
  totalFiltered: number;
  outputPath: string;
  skippedFiles: string[];
}
