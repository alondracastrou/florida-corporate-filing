import type { EntityType, FieldGroupKey } from "./types";

// Public-access credentials for FL Division of Corporations SFTP
// See: https://dos.fl.gov/sunbiz/bulk-data/
export const SFTP_CONFIG = {
  host: process.env.FL_SFTP_HOST ?? "sftp.floridados.gov",
  port: Number(process.env.FL_SFTP_PORT ?? 22),
  username: process.env.FL_SFTP_USER ?? "Public",
  password: process.env.FL_SFTP_PASS ?? "PubAccess1845!",
  readyTimeout: 15_000,
  keepaliveInterval: 10_000,
  keepaliveCountMax: 3,
};

export const SFTP_REMOTE_DIR = "/Public/doc/cor/";

export const RECORD_LENGTH = 1441; // 1436 visible + 4 null + 1 newline

export const FILING_TYPES = {
  DOMP: "Domestic Profit Corporation",
  FLAL: "Florida Limited Liability Company",
  FORP: "Foreign Profit Corporation",
  FORNP: "Foreign Non-Profit Corporation",
  DOMNP: "Domestic Non-Profit Corporation",
  DOMLP: "Domestic Limited Partnership",
  FORLP: "Foreign Limited Partnership",
  NPREG: "Non-Profit Registration",
  TRUST: "Trust",
  AGENT: "Registered Agent",
} as const satisfies Record<string, string>;

export const OFFICER_TITLES = {
  P: "President",
  V: "Vice President",
  S: "Secretary",
  T: "Treasurer",
  D: "Director",
  C: "Chairman",
  AMBR: "Authorized Member",
  MGRM: "Managing Member",
  MGR: "Manager",
  MBR: "Member",
  AVP: "Assistant VP",
  CFO: "CFO",
  CEO: "CEO",
  COO: "COO",
  CLO: "CLO",
  CTO: "CTO",
  VPP: "VP",
} as const satisfies Record<string, string>;

export const ENTITY_TYPE_PREFIXES = {
  L: "LLC",
  P: "Profit Corporation",
  N: "Non-Profit Corporation",
  F: "Foreign",
  A: "Authority",
  B: "Bank",
} as const satisfies Record<string, string>;

export const REQUIRED_FIELDS = ["corpNumber", "corpName"] as const;

export const FIELD_GROUPS = {
  filingInfo: {
    label: "Filing Info (type, status, date)",
    fields: ["entityType", "status", "filingType", "filingTypeLabel", "fileDate"],
  },
  feiNumber: {
    label: "FEI / EIN",
    fields: ["feiNumber"],
  },
  principalAddress: {
    label: "Principal Address",
    fields: ["principalAddress", "principalCity", "principalState", "principalZip"],
  },
  mailAddress: {
    label: "Mailing Address",
    fields: ["mailAddress", "mailCity", "mailState", "mailZip"],
  },
  registeredAgent: {
    label: "Registered Agent",
    fields: ["raFullName", "raAddress", "raCity", "raState", "raZip"],
  },
  officer1: {
    label: "Primary Officer (name, title, address)",
    fields: [
      "officer1Title",
      "officer1Name",
      "officer1FirstName",
      "officer1LastName",
      "officer1Address",
      "officer1City",
      "officer1State",
      "officer1Zip",
    ],
  },
  additionalOfficers: {
    label: "Additional Officers",
    fields: ["additionalOfficers"],
  },
} as const satisfies Record<FieldGroupKey, { label: string; fields: readonly string[] }>;

export const VALID_ENTITY_TYPES = new Set<EntityType>([
  "DOMP", "FLAL", "FORP", "FORNP", "DOMNP", "DOMLP", "FORLP",
]);

export const ENTITY_TYPE_OPTIONS: { value: EntityType; label: string }[] = [
  { value: "DOMP", label: "DOMP — Domestic Profit Corporation" },
  { value: "FLAL", label: "FLAL — Florida LLC" },
  { value: "FORP", label: "FORP — Foreign Profit Corporation" },
  { value: "DOMNP", label: "DOMNP — Domestic Non-Profit" },
  { value: "DOMLP", label: "DOMLP — Domestic Limited Partnership" },
  { value: "FORNP", label: "FORNP — Foreign Non-Profit" },
  { value: "FORLP", label: "FORLP — Foreign Limited Partnership" },
];

export const FIELD_GROUP_OPTIONS: { value: FieldGroupKey; label: string }[] = Object.entries(
  FIELD_GROUPS
).map(([key, group]) => ({
  value: key as FieldGroupKey,
  label: group.label,
}));

export const DEFAULT_ENTITY_TYPES: EntityType[] = ["DOMP", "FLAL"];

export const DEFAULT_FIELD_GROUPS: FieldGroupKey[] = [
  "filingInfo",
  "principalAddress",
  "officer1",
];
