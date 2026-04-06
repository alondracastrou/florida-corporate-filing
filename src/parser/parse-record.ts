import type { RawCorpRecord, RawOfficer } from "../types";
import {
  RECORD_SCHEMA,
  OFFICER_BLOCK_START,
  OFFICER_COUNT,
  OFFICER_BLOCK_LENGTH,
  OFFICER_SCHEMA,
  type FieldDef,
} from "./fields";

/** Extract fields from a string using a schema of offset/length pairs */
function extractFields(line: string, schema: FieldDef[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const field of schema) {
    record[field.name] = line.substring(field.offset, field.offset + field.length);
  }
  return record;
}

/** Parse a single fixed-width line into a RawCorpRecord */
export function parseRecord(line: string): RawCorpRecord | null {
  // Minimum viable length: must at least reach the officer block start
  if (line.length < OFFICER_BLOCK_START) return null;

  const fields = extractFields(line, RECORD_SCHEMA);

  // Parse officer blocks
  const officers: RawOfficer[] = [];
  for (let i = 0; i < OFFICER_COUNT; i++) {
    const blockStart = OFFICER_BLOCK_START + i * OFFICER_BLOCK_LENGTH;
    if (blockStart + OFFICER_BLOCK_LENGTH > line.length) break;

    const block = line.substring(blockStart, blockStart + OFFICER_BLOCK_LENGTH);
    const officerFields = extractFields(block, OFFICER_SCHEMA);

    // Only include if name has content
    if (officerFields.name?.trim()) {
      officers.push({
        title: officerFields.title ?? "",
        type: officerFields.type ?? "",
        name: officerFields.name ?? "",
        address: officerFields.address ?? "",
        city: officerFields.city ?? "",
        state: officerFields.state ?? "",
        zip: officerFields.zip ?? "",
      });
    }
  }

  return {
    corpNumber: fields.corpNumber ?? "",
    corpName: fields.corpName ?? "",
    status: fields.status ?? "",
    filingType: fields.filingType ?? "",
    principalAddress1: fields.principalAddress1 ?? "",
    principalAddress2: fields.principalAddress2 ?? "",
    principalCity: fields.principalCity ?? "",
    principalState: fields.principalState ?? "",
    principalZip: fields.principalZip ?? "",
    principalCountry: fields.principalCountry ?? "",
    mailAddress1: fields.mailAddress1 ?? "",
    mailAddress2: fields.mailAddress2 ?? "",
    mailCity: fields.mailCity ?? "",
    mailState: fields.mailState ?? "",
    mailZip: fields.mailZip ?? "",
    mailCountry: fields.mailCountry ?? "",
    fileDate: fields.fileDate ?? "",
    feiNumber: fields.feiNumber ?? "",
    moreOfficers: fields.moreOfficers ?? "",
    lastTransDate: fields.lastTransDate ?? "",
    stateOfInc: fields.stateOfInc ?? "",
    reportYear1: fields.reportYear1 ?? "",
    reportDate1: fields.reportDate1 ?? "",
    reportYear2: fields.reportYear2 ?? "",
    reportDate2: fields.reportDate2 ?? "",
    reportYear3: fields.reportYear3 ?? "",
    reportDate3: fields.reportDate3 ?? "",
    raName: fields.raName ?? "",
    raType: fields.raType ?? "",
    raAddress: fields.raAddress ?? "",
    raCity: fields.raCity ?? "",
    raState: fields.raState ?? "",
    raZip: fields.raZip ?? "",
    officers,
  };
}

/** Parse an entire file's content into RawCorpRecord[] */
export function parseFile(content: string): RawCorpRecord[] {
  const records: RawCorpRecord[] = [];

  // Strip null bytes
  const cleaned = content.replace(/\0/g, "");

  // Split by newlines
  const lines = cleaned.split(/\r?\n/);

  for (const line of lines) {
    if (line.length < OFFICER_BLOCK_START) continue;

    const record = parseRecord(line);
    if (record) records.push(record);
  }

  return records;
}

/** Parse from a Buffer (for in-memory SFTP downloads) — decodes as latin1 */
export function parseFileFromBuffer(buffer: Buffer): RawCorpRecord[] {
  const text = buffer.toString("latin1");
  return parseFile(text);
}
