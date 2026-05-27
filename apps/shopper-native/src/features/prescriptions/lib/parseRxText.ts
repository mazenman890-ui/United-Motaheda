/**
 * parseRxText — heuristic field extractor for OCR-recognized Rx labels.
 *
 * Pure regex. No native deps. No LLM. Returns best-effort fields; bails to
 * `undefined` whenever a pattern doesn't match — never guesses, because wrong
 * fields destroy user trust more than empty ones do.
 *
 * Tuned for two label families:
 *   - US printed labels (English, "Lisinopril 10mg / Rx #… / Refills: N / Dr. X")
 *   - Arabic typed labels (ميتفورمين 500 ملغ / د. الاسم / N مرات)
 *
 * Regex order goes most-specific → least-specific. The Rx-number fallback
 * accepts any free-floating 7–10 digit cluster, which is intentional — the
 * Review form will let the user correct anything wrong before submit.
 *
 * // TODO: tune regex once sample bottle photos land. Current set is generic.
 */

import type { RxLookupResult } from "./manualLookup";

/** Result shape — extends the lookup interface with an Rx number. */
export type ParsedRx = Partial<RxLookupResult> & { rxNumber?: string };

/**
 * Input to the parser. Shape matches `@react-native-ml-kit/text-recognition`'s
 * result so this file can stay native-free; the camera screen builds an
 * `OcrResult` from the ML Kit response before calling parse.
 */
export interface OcrResult {
  rawText: string;
  blocks:  Array<{ text: string; lines: string[] }>;
}

export function parseRxText(ocr: OcrResult): ParsedRx {
  const text = ocr.rawText;
  const result: ParsedRx = {};

  // ── Drug name + dose ────────────────────────────────────────────────────
  // English: "Word(s) NUMBER mg/mcg/ml/g/IU"
  const doseEn = text.match(/([A-Za-z][A-Za-z\s-]+?)\s+(\d+(?:\.\d+)?)\s*(mg|mcg|ml|g|IU)\b/i);
  // Arabic: same shape with Arabic-block letters + Arabic unit words.
  // Class boundaries use ؀-ۿ (Arabic block) for clarity; the unit
  // words below are whole Arabic strings (stable as literals).
  const doseAr = text.match(/([؀-ۿ][؀-ۿ\s-]+?)\s+(\d+(?:\.\d+)?)\s*(ملغ|مكغ|مل|غ)/);

  if (doseEn) {
    result.name = `${doseEn[1].trim()} ${doseEn[2]} ${doseEn[3].toLowerCase()}`;
  } else if (doseAr) {
    result.name = `${doseAr[1].trim()} ${doseAr[2]} ${doseAr[3]}`;
  }

  // ── Refills ─────────────────────────────────────────────────────────────
  const refillsMatch =
       text.match(/refills?\s*[:=]?\s*(\d+)/i)
    ?? text.match(/(\d+)\s*refills?/i)
    ?? text.match(/(\d+)\s*مرات/);
  if (refillsMatch) {
    const n = parseInt(refillsMatch[1], 10);
    if (Number.isFinite(n)) result.refills = n;
  }

  // ── Doctor ──────────────────────────────────────────────────────────────
  const drMatch =
       text.match(/(?:dr\.?|doctor)\s+([A-Z][A-Za-z\.\s]{2,30})/i)
    ?? text.match(/د\.\s+([؀-ۿ\s\.]{2,30})/);
  if (drMatch) {
    // Trim trailing punctuation/whitespace the greedy class may have eaten.
    result.doctor = drMatch[1].replace(/[\s،؛.,]+$/u, "").trim();
  }

  // ── Rx number — labeled first, free cluster as last resort ──────────────
  const rxMatch =
       text.match(/Rx\s*#?\s*:?\s*(\d{7,10})/i)
    ?? text.match(/prescription\s*#?\s*:?\s*(\d{7,10})/i)
    ?? text.match(/\b(\d{7,10})\b/);
  if (rxMatch) result.rxNumber = rxMatch[1];

  // ── Sensible default for the only field the store requires ─────────────
  result.status = "active";

  return result;
}
