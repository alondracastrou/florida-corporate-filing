import type { ParsedName } from "../types";
import { NAME_LAST_LEN, NAME_FIRST_LEN } from "./fields";

/** Title-case a string: "JOHN DOE" → "John Doe" */
function titleCase(s: string): string {
  if (!s) return "";
  return s
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Parse a 42-char fixed-width name block: Last(20) + First(14) + Middle/Suffix(8) */
export function parseName(raw: string): ParsedName {
  // Pad to 42 chars if shorter
  const padded = raw.padEnd(42);

  const lastName = titleCase(padded.substring(0, NAME_LAST_LEN).trim());
  const firstName = titleCase(padded.substring(NAME_LAST_LEN, NAME_LAST_LEN + NAME_FIRST_LEN).trim());
  const middleSuffix = titleCase(padded.substring(NAME_LAST_LEN + NAME_FIRST_LEN, 42).trim());

  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return { firstName, lastName, middleSuffix, fullName };
}
