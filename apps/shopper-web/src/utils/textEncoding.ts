const WINDOWS_1252_ENCODE_MAP = new Map<number, number>([
  [0x20ac, 0x80],
  [0x201a, 0x82],
  [0x0192, 0x83],
  [0x201e, 0x84],
  [0x2026, 0x85],
  [0x2020, 0x86],
  [0x2021, 0x87],
  [0x02c6, 0x88],
  [0x2030, 0x89],
  [0x0160, 0x8a],
  [0x2039, 0x8b],
  [0x0152, 0x8c],
  [0x017d, 0x8e],
  [0x2018, 0x91],
  [0x2019, 0x92],
  [0x201c, 0x93],
  [0x201d, 0x94],
  [0x2022, 0x95],
  [0x2013, 0x96],
  [0x2014, 0x97],
  [0x02dc, 0x98],
  [0x2122, 0x99],
  [0x0161, 0x9a],
  [0x203a, 0x9b],
  [0x0153, 0x9c],
  [0x017e, 0x9e],
  [0x0178, 0x9f],
]);

const MOJIBAKE_PATTERN =
  /[\u00c2\u00c3\u00d8\u00d9\u00e2\u2018\u2019\u201a\u201c\u201d\u201e\u2020\u2021\u2022\u2026\u2030\u2039\u203a\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc]/;

const utf8Decoder = new TextDecoder("utf-8");

export function repairTextEncoding(value: string) {
  if (!value || !MOJIBAKE_PATTERN.test(value)) {
    return value;
  }

  const bytes: number[] = [];

  for (const char of value) {
    const codePoint = char.codePointAt(0);

    if (codePoint === undefined) {
      return value;
    }

    if (codePoint <= 0xff) {
      bytes.push(codePoint);
      continue;
    }

    const windows1252Byte = WINDOWS_1252_ENCODE_MAP.get(codePoint);

    if (windows1252Byte === undefined) {
      return value;
    }

    bytes.push(windows1252Byte);
  }

  try {
    return utf8Decoder.decode(new Uint8Array(bytes));
  } catch {
    return value;
  }
}

export function normalizeTextEncoding<T>(value: T): T {
  if (typeof value === "string") {
    return repairTextEncoding(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeTextEncoding(entry)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        repairTextEncoding(key),
        normalizeTextEncoding(entry),
      ]),
    ) as T;
  }

  return value;
}
