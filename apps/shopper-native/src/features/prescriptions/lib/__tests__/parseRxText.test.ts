/**
 * parseRxText — Jest test suite.
 *
 * The test cases were previously stored as a custom `runParserTests()` helper
 * (invoked via the __preview/components dev screen). They are now promoted to
 * standard Jest tests so they run in CI alongside the rest of the suite.
 *
 * The dev-preview runner (`runParserTests`) lives in parseRxText.devUtils.ts
 * so it can be imported by the production barrel without dragging in Jest types.
 */

import { parseRxText, type OcrResult, type ParsedRx } from "../parseRxText";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ocr(text: string): OcrResult {
  return { rawText: text, blocks: [{ text, lines: text.split("\n") }] };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("parseRxText", () => {
  describe("English label", () => {
    let result: ParsedRx;
    beforeAll(() => {
      result = parseRxText(ocr("Lisinopril 10mg, Rx #47820094, Refills: 3, Dr. P. Chen"));
    });

    it("extracts drug name including the dose", () => {
      expect(result.name).toBeDefined();
      expect(result.name!.toLowerCase()).toContain("lisinopril");
      expect(result.name).toContain("10");
    });

    it("extracts refills count", () => {
      expect(result.refills).toBe(3);
    });

    it("extracts doctor name", () => {
      expect(result.doctor).toBeDefined();
      expect(result.doctor).toContain("Chen");
    });

    it("extracts Rx number", () => {
      expect(result.rxNumber).toBe("47820094");
    });

    it("defaults status to 'active'", () => {
      expect(result.status).toBe("active");
    });
  });

  describe("Arabic label", () => {
    let result: ParsedRx;
    beforeAll(() => {
      result = parseRxText(ocr("ميتفورمين 500 ملغ، د. أحمد، 2 مرات"));
    });

    it("extracts drug name in Arabic including dose", () => {
      expect(result.name).toBeDefined();
      expect(result.name).toContain("ميتفورمين");
      expect(result.name).toContain("500");
    });

    it("extracts refills count from Arabic numeric", () => {
      expect(result.refills).toBe(2);
    });

    it("extracts Arabic doctor name", () => {
      expect(result.doctor).toBeDefined();
      expect(result.doctor).toContain("أحمد");
    });
  });

  describe("Garbage / unrecognised input", () => {
    let result: ParsedRx;
    beforeAll(() => {
      result = parseRxText(ocr("asdfqwer 123"));
    });

    it("leaves name undefined", () => {
      expect(result.name).toBeUndefined();
    });

    it("leaves refills undefined", () => {
      expect(result.refills).toBeUndefined();
    });

    it("leaves doctor undefined", () => {
      expect(result.doctor).toBeUndefined();
    });

    it("leaves rxNumber undefined", () => {
      expect(result.rxNumber).toBeUndefined();
    });

    it("defaults status to 'active'", () => {
      expect(result.status).toBe("active");
    });
  });

  describe("Drug name without dose", () => {
    it("leaves name undefined when no dose is present", () => {
      const result = parseRxText(ocr("Lisinopril"));
      expect(result.name).toBeUndefined();
    });

    it("still defaults status to 'active'", () => {
      const result = parseRxText(ocr("Lisinopril"));
      expect(result.status).toBe("active");
    });
  });

  describe("Rx number disambiguation", () => {
    it("extracts an 8-digit Rx# from text containing shorter numeric clusters", () => {
      const result = parseRxText(ocr("Patient ID 12345 has Rx 47820094 active"));
      expect(result.rxNumber).toBe("47820094");
    });
  });
});

// ─── Re-export dev-preview runner (kept for any direct test imports) ──────────
// Production consumers should import from parseRxText.devUtils directly
// (or via the feature barrel) to avoid pulling in Jest type declarations.
export { runParserTests } from "../parseRxText.devUtils";
export type { ParserTestSummary } from "../parseRxText.devUtils";
