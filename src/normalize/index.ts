import type { RawCorpRecord, CorpRecord, Officer } from "../types";
import { parseName } from "../parser/parse-name";
import { FILING_TYPES, OFFICER_TITLES, ENTITY_TYPE_PREFIXES } from "../constants";

/** Convert MMDDYYYY to YYYY-MM-DD. Returns empty string if invalid. */
function normalizeDate(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length !== 8 || !/^\d{8}$/.test(trimmed)) return "";
  const mm = trimmed.substring(0, 2);
  const dd = trimmed.substring(2, 4);
  const yyyy = trimmed.substring(4, 8);
  return `${yyyy}-${mm}-${dd}`;
}

/** Combine address line 1 and 2, trim whitespace */
function normalizeAddress(addr1: string, addr2: string): string {
  const parts = [addr1.trim(), addr2.trim()].filter(Boolean);
  return parts.join(", ");
}

/** Normalize zip code: trim, insert dash for 9-digit zips */
function normalizeZip(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^\d{9}$/.test(trimmed)) {
    return `${trimmed.substring(0, 5)}-${trimmed.substring(5)}`;
  }
  return trimmed;
}

/** Convert a RawCorpRecord to a normalized CorpRecord */
export function normalizeRecord(raw: RawCorpRecord): CorpRecord {
  const corpNumber = raw.corpNumber.trim();
  const prefix = corpNumber.charAt(0);
  const raName = parseName(raw.raName);
  const filingType = raw.filingType.trim();

  return {
    corpNumber,
    entityType: prefix in ENTITY_TYPE_PREFIXES
      ? ENTITY_TYPE_PREFIXES[prefix as keyof typeof ENTITY_TYPE_PREFIXES]
      : "Unknown",
    corpName: raw.corpName.trim(),
    status: raw.status.trim() === "A" ? "Active" : "Inactive",
    filingType,
    filingTypeLabel:
      FILING_TYPES[filingType as keyof typeof FILING_TYPES] ?? filingType,
    principalAddress: normalizeAddress(raw.principalAddress1, raw.principalAddress2),
    principalCity: raw.principalCity.trim(),
    principalState: raw.principalState.trim(),
    principalZip: normalizeZip(raw.principalZip),
    principalCountry: raw.principalCountry.trim(),
    mailAddress: normalizeAddress(raw.mailAddress1, raw.mailAddress2),
    mailCity: raw.mailCity.trim(),
    mailState: raw.mailState.trim(),
    mailZip: normalizeZip(raw.mailZip),
    mailCountry: raw.mailCountry.trim(),
    fileDate: normalizeDate(raw.fileDate),
    feiNumber: raw.feiNumber.trim(),
    stateOfInc: raw.stateOfInc.trim(),
    raFullName: raName.fullName,
    raFirstName: raName.firstName,
    raLastName: raName.lastName,
    raAddress: raw.raAddress.trim(),
    raCity: raw.raCity.trim(),
    raState: raw.raState.trim(),
    raZip: normalizeZip(raw.raZip),
    officers: raw.officers.map((o): Officer => {
      const name = parseName(o.name);
      const titleCode = o.title.trim();
      return {
        title: titleCode,
        titleLabel:
          OFFICER_TITLES[titleCode as keyof typeof OFFICER_TITLES] ?? titleCode,
        type: o.type.trim(),
        fullName: name.fullName,
        firstName: name.firstName,
        lastName: name.lastName,
        address: o.address.trim(),
        city: o.city.trim(),
        state: o.state.trim(),
        zip: normalizeZip(o.zip),
      };
    }),
  };
}
