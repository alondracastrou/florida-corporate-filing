export interface FieldDef {
  name: string;
  offset: number;  // 0-based byte offset
  length: number;
}

/** Main record field definitions (0-based offsets) */
export const RECORD_SCHEMA: FieldDef[] = [
  { name: "corpNumber",        offset: 0,    length: 12  },
  { name: "corpName",          offset: 12,   length: 192 },
  { name: "status",            offset: 204,  length: 1   },
  { name: "filingType",        offset: 205,  length: 15  },
  { name: "principalAddress1", offset: 220,  length: 42  },
  { name: "principalAddress2", offset: 262,  length: 42  },
  { name: "principalCity",     offset: 304,  length: 28  },
  { name: "principalState",    offset: 332,  length: 2   },
  { name: "principalZip",      offset: 334,  length: 10  },
  { name: "principalCountry",  offset: 344,  length: 2   },
  { name: "mailAddress1",      offset: 346,  length: 42  },
  { name: "mailAddress2",      offset: 388,  length: 42  },
  { name: "mailCity",          offset: 430,  length: 28  },
  { name: "mailState",         offset: 458,  length: 2   },
  { name: "mailZip",           offset: 460,  length: 10  },
  { name: "mailCountry",       offset: 470,  length: 2   },
  { name: "fileDate",          offset: 472,  length: 8   },
  { name: "feiNumber",         offset: 480,  length: 14  },
  { name: "moreOfficers",      offset: 494,  length: 1   },
  { name: "lastTransDate",     offset: 495,  length: 8   },
  { name: "stateOfInc",        offset: 503,  length: 2   },
  { name: "reportYear1",       offset: 505,  length: 4   },
  { name: "reportDate1",       offset: 509,  length: 8   },
  { name: "reportYear2",       offset: 517,  length: 4   },
  { name: "reportDate2",       offset: 521,  length: 8   },
  { name: "reportYear3",       offset: 529,  length: 4   },
  { name: "reportDate3",       offset: 533,  length: 8   },
  { name: "raName",            offset: 544,  length: 42  },
  { name: "raType",            offset: 586,  length: 1   },
  { name: "raAddress",         offset: 587,  length: 42  },
  { name: "raCity",            offset: 629,  length: 28  },
  { name: "raState",           offset: 657,  length: 2   },
  { name: "raZip",             offset: 659,  length: 9   },
];

/** Officer block layout — 6 officers, each 128 bytes, starting at offset 668 */
export const OFFICER_BLOCK_START = 668;
export const OFFICER_COUNT = 6;
export const OFFICER_BLOCK_LENGTH = 128;

/** Fields within each officer block (offsets relative to block start) */
export const OFFICER_SCHEMA: FieldDef[] = [
  { name: "title",   offset: 0,   length: 4  },
  { name: "type",    offset: 4,   length: 1  },
  { name: "name",    offset: 5,   length: 42 },
  { name: "address", offset: 47,  length: 42 },
  { name: "city",    offset: 89,  length: 28 },
  { name: "state",   offset: 117, length: 2  },
  { name: "zip",     offset: 119, length: 9  },
];

/** Name sub-field layout within 42-char name blocks */
export const NAME_LAST_LEN = 20;
export const NAME_FIRST_LEN = 14;
export const NAME_MIDDLE_LEN = 8;
