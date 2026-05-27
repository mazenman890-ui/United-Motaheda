/**
 * parseRxText dev-preview utilities.
 *
 * These are runtime helpers used by the __preview/components dev screen to
 * run the parser test-cases interactively on-device. They live in a separate
 * file so that:
 *   1. The production barrel (index.ts) can re-export them without importing
 *      a test file (which is excluded from the main tsconfig).
 *   2. The Jest test suite can import them without duplicating the logic.
 */

import { parseRxText, type OcrResult, type ParsedRx } from "./parseRxText";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Failure {
  label:   string;
  message: string;
}

export interface ParserTestSummary {
  passed:   number;
  failed:   number;
  failures: Failure[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ocr(text: string): OcrResult {
  return { rawText: text, blocks: [{ text, lines: text.split("\n") }] };
}

// ─── Runner ───────────────────────────────────────────────────────────────────

/**
 * Runs the canonical parser test-cases without Jest and returns a summary.
 * Suitable for on-device display in the __preview dev screen.
 */
export function runParserTests(): ParserTestSummary {
  const cases: Array<{ label: string; text: string; assert: (r: ParsedRx) => string | null }> = [
    {
      label: "English label — extracts name, refills, doctor, rx#",
      text:  "Lisinopril 10mg, Rx #47820094, Refills: 3, Dr. P. Chen",
      assert: (r) => {
        if (!r.name || !r.name.toLowerCase().includes("lisinopril")) return `name missing 'lisinopril'`;
        if (!r.name.includes("10"))    return `name missing dose '10'`;
        if (r.refills !== 3)           return `refills should be 3, got ${r.refills}`;
        if (!r.doctor)                 return `doctor should be defined`;
        if (!r.doctor.includes("Chen")) return `doctor missing 'Chen'`;
        if (r.rxNumber !== "47820094") return `rxNumber should be 47820094`;
        return null;
      },
    },
    {
      label: "Arabic label — extracts name, doctor, refills",
      text:  "ميتفورمين 500 ملغ، د. أحمد، 2 مرات",
      assert: (r) => {
        if (!r.name || !r.name.includes("ميتفورمين")) return `name missing 'ميتفورمين'`;
        if (!r.name.includes("500")) return `name missing dose '500'`;
        if (r.refills !== 2)         return `refills should be 2`;
        if (!r.doctor || !r.doctor.includes("أحمد")) return `doctor missing 'أحمد'`;
        return null;
      },
    },
    {
      label: "Garbage input — only status set",
      text:  "asdfqwer 123",
      assert: (r) => {
        if (r.name !== undefined)     return `name should be undefined`;
        if (r.refills !== undefined)  return `refills should be undefined`;
        if (r.doctor !== undefined)   return `doctor should be undefined`;
        if (r.rxNumber !== undefined) return `rxNumber should be undefined`;
        if (r.status !== "active")    return `status should default to 'active'`;
        return null;
      },
    },
  ];

  const failures: Failure[] = [];
  let passed = 0;
  for (const c of cases) {
    try {
      const msg = c.assert(parseRxText(ocr(c.text)));
      if (msg === null) passed += 1;
      else failures.push({ label: c.label, message: msg });
    } catch (e) {
      failures.push({ label: c.label, message: `threw: ${(e as Error).message}` });
    }
  }
  return { passed, failed: failures.length, failures };
}
