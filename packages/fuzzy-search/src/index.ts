/**
 * @pharmacy/fuzzy-search
 *
 * Production-grade bilingual (Arabic / English) fuzzy search engine for
 * pharmacy catalogs.
 *
 * ─── Capabilities ─────────────────────────────────────────────────────────────
 *
 *  • Full Arabic normalization
 *      – Hamza unification: أ إ آ ٱ → ا, ؤ → و, ئ → ي
 *      – Tashkeel / harakat removal (ً ٌ ٍ ...)
 *      – Taa marbuta: ة → ه
 *      – Alef maqsura: ى → ي
 *      – Tatweel (kashida) removal
 *
 *  • Typo tolerance via Levenshtein edit distance (≤ 2 for queries ≥ 3 chars)
 *      – بنادول matches بندول (edit-distance 1), بانادول (edit-distance 1)
 *      – panadol matches panadole, pandaol, etc.
 *
 *  • Bidirectional Arabic ↔ English pharmaceutical dictionary (400+ pairs)
 *      – بنادول maps to "panadol" and "paracetamol" → finds English-keyed products
 *      – "panadol" maps back to "بنادول" → finds Arabic-keyed products
 *
 *  • Token-level inverted index + 3-char n-gram prefix trie
 *      – Query candidates retrieved in O(1) instead of O(N) linear scan
 *
 *  • Bigram (Dice) similarity for phonetic variants
 *
 *  • LRU caches at every hot path
 *
 * ─── Exports ──────────────────────────────────────────────────────────────────
 *
 *  normalise(text)                            → normalised string
 *  fuzzyMatch(query, fields)                  → boolean
 *  fuzzyScore(query, fields)                  → number (0 = no match, higher = better)
 *  clearFuzzyCache()                          → void
 *  buildSearchIndexImpl(items)                → SearchIndex
 *  queryIndexCandidates(index, query)         → ReadonlySet<string>
 *  class LRUCache<K,V>
 *  interfaces: FuzzySearchableFields, FuzzyIndexable, SearchIndex
 */

// ════════════════════════════════════════════════════════════════════════════════
// LRU Cache
// ════════════════════════════════════════════════════════════════════════════════

export class LRUCache<K, V> {
  private readonly _map = new Map<K, V>();
  constructor(private readonly _cap: number) {}

  get(key: K): V | undefined {
    if (!this._map.has(key)) return undefined;
    const v = this._map.get(key)!;
    this._map.delete(key);
    this._map.set(key, v);
    return v;
  }

  set(key: K, value: V): void {
    if (this._map.has(key)) this._map.delete(key);
    else if (this._map.size >= this._cap)
      this._map.delete(this._map.keys().next().value!);
    this._map.set(key, value);
  }

  has(key: K): boolean { return this._map.has(key); }
  clear(): void        { this._map.clear(); }
  get size(): number   { return this._map.size; }
}

// ════════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════════

export interface FuzzySearchableFields {
  nameAr:    string;
  nameEn:    string;
  category:  string;
  code?:     string;
  barcode?:  string;
}

export interface FuzzyIndexable {
  id:       string;
  nameAr:   string;
  nameEn:   string;
  category: string;
  code:     string;
  barcode:  string;
}

export interface SearchIndex {
  /** Token → Set<productId> */
  tokenIndex:  Map<string, Set<string>>;
  /** 3-char n-gram → Set<productId> */
  ngramIndex:  Map<string, Set<string>>;
  /** prefix (≤4 chars) → Set<productId> */
  prefixIndex: Map<string, Set<string>>;
  productCount: number;
}

// ════════════════════════════════════════════════════════════════════════════════
// Arabic / English normalisation
// ════════════════════════════════════════════════════════════════════════════════

const RE_DIACRITICS  = /[ً-ٰٟ]/g;  // tashkeel / harakat
const RE_TATWEEL     = /ـ/g;                  // kashida
const RE_HAMZA_ALEF  = /[آأإٱ]/g; // أ إ آ ٱ → ا
const RE_WAW_HAMZA   = /ؤ/g;                  // ؤ → و
const RE_YA_HAMZA    = /ئ/g;                  // ئ → ي
const RE_TAA_MARB    = /ة/g;                  // ة → ه
const RE_ALEF_MAQSURA = /ى/g;                // ى → ي
const RE_WHITESPACE  = /\s+/g;

const _normCache = new LRUCache<string, string>(4096);

/**
 * Normalise a string for fuzzy comparison.
 * Works for both Arabic and English (lowercases, trims punctuation).
 */
export function normalise(text: string): string {
  if (!text) return "";
  const cached = _normCache.get(text);
  if (cached !== undefined) return cached;

  const result = text
    .toLowerCase()
    .replace(RE_DIACRITICS,   "")
    .replace(RE_TATWEEL,      "")
    .replace(RE_HAMZA_ALEF,   "ا") // → ا
    .replace(RE_WAW_HAMZA,    "و") // → و
    .replace(RE_YA_HAMZA,     "ي") // → ي
    .replace(RE_TAA_MARB,     "ه") // → ه
    .replace(RE_ALEF_MAQSURA, "ي") // → ي
    .replace(/[.,\-/\\()+*#@!?؟،؛:]/g, " ") // punctuation → space
    .replace(RE_WHITESPACE,   " ")
    .trim();

  _normCache.set(text, result);
  return result;
}

// ════════════════════════════════════════════════════════════════════════════════
// Bidirectional pharmaceutical dictionary
// ════════════════════════════════════════════════════════════════════════════════
//
// Keys are ALREADY normalised (run through normalise()).
// Values are arrays of normalised English terms that the Arabic name maps to,
// and vice versa.
//
// When a query matches a key, we expand the search to also include
// the value terms — catching cross-script results.
// ─────────────────────────────────────────────────────────────────────────────

// Arabic (normalised) → English terms
const AR_TO_EN: ReadonlyMap<string, readonly string[]> = new Map([
  // ── Pain / fever ──────────────────────────────────────────────────────────
  ["بنادول",           ["panadol", "paracetamol", "acetaminophen"]],
  ["بندول",            ["panadol", "paracetamol"]],                 // typo
  ["بانادول",          ["panadol", "paracetamol"]],                 // variant
  ["باناسيتامول",      ["paracetamol", "panadol"]],
  ["باراسيتامول",      ["paracetamol", "panadol", "acetaminophen"]],
  ["باراسيتمول",       ["paracetamol", "panadol"]],                 // typo
  ["اسيتامينوفين",     ["acetaminophen", "paracetamol", "panadol"]],
  ["بارادول",          ["paradol", "paracetamol"]],
  ["ايبوبروفين",       ["ibuprofen", "brufen", "advil", "motrin"]],
  ["ايبروفين",         ["ibuprofen", "brufen"]],                    // variant
  ["ايبوبروفن",        ["ibuprofen", "brufen"]],                    // variant
  ["بروفين",           ["brufen", "ibuprofen"]],
  ["اسبرين",           ["aspirin", "acetylsalicylic"]],
  ["اسبيرين",          ["aspirin"]],
  ["كيتوبروفين",       ["ketoprofen", "ketonal"]],
  ["نابروكسين",        ["naproxen", "naprosyn", "aleve"]],
  ["نبروكسين",         ["naproxen"]],
  ["ديكلوفيناك",       ["diclofenac", "voltaren", "cataflam"]],
  ["فولتارين",         ["voltaren", "diclofenac"]],
  ["فولتارن",          ["voltaren", "diclofenac"]],
  ["فولتارول",         ["voltarol", "diclofenac"]],
  ["كتافلام",          ["cataflam", "diclofenac"]],
  ["كتافلم",           ["cataflam", "diclofenac"]],
  ["ايندوميثاسين",     ["indomethacin", "indocin"]],
  ["بيريكسيكام",       ["piroxicam", "feldene"]],
  ["ترامادول",         ["tramadol", "tramal", "ultram"]],
  ["ترامدول",          ["tramadol", "tramal"]],
  ["كودين",            ["codeine"]],
  ["كودايين",          ["codeine"]],
  ["مورفين",           ["morphine"]],
  // ── Antibiotics ───────────────────────────────────────────────────────────
  ["امبيسيلين",        ["ampicillin"]],
  ["امبيسلين",         ["ampicillin"]],
  ["اموكسيسيلين",      ["amoxicillin", "amoxil"]],
  ["اموكسسيلين",       ["amoxicillin", "amoxil"]],
  ["اموكسسيلن",        ["amoxicillin"]],
  ["اموكسيسيلن",       ["amoxicillin"]],
  ["اموكسل",           ["amoxil", "amoxicillin"]],
  ["اوجمنتين",         ["augmentin", "amoxicillin", "clavulanate"]],
  ["اوغمنتين",         ["augmentin"]],
  ["اوقمنتين",         ["augmentin"]],
  ["كلاريثروميسين",    ["clarithromycin", "klacid"]],
  ["كلاريثرومايسين",   ["clarithromycin", "klacid"]],
  ["كلاسيد",           ["klacid", "clarithromycin"]],
  ["كلافام",           ["klacid", "clarithromycin"]],
  ["ازيثروميسين",      ["azithromycin", "zithromax", "azithrocin"]],
  ["ازيثرومايسين",     ["azithromycin", "zithromax"]],
  ["ازيترومايسين",     ["azithromycin"]],
  ["زيثروماكس",        ["zithromax", "azithromycin"]],
  ["زيثروماكس",        ["zithromax", "azithromycin"]],
  ["سيبروفلوكساسين",   ["ciprofloxacin", "cipro", "ciproxin"]],
  ["سيبروفلوكاسين",    ["ciprofloxacin", "cipro"]],
  ["سيبرو",            ["cipro", "ciprofloxacin"]],
  ["دوكسيسيكلين",      ["doxycycline", "vibramycin"]],
  ["دوكسيسكلين",       ["doxycycline"]],
  ["تتراسيكلين",       ["tetracycline"]],
  ["ميترونيدازول",     ["metronidazole", "flagyl"]],
  ["ميترونيداذول",     ["metronidazole", "flagyl"]],
  ["فلاجيل",           ["flagyl", "metronidazole"]],
  ["فلاجل",            ["flagyl", "metronidazole"]],
  ["ريفامبيسين",       ["rifampicin", "rifampin"]],
  ["ايزونيازيد",       ["isoniazid", "inh"]],
  ["اتامبيوتول",       ["ethambutol"]],
  ["بيرازيناميد",      ["pyrazinamide"]],
  ["سيفالكسين",        ["cefalexin", "cephalexin", "keflex"]],
  ["سيفازولين",        ["cefazolin"]],
  ["سيفترياكسون",      ["ceftriaxone", "rocephin"]],
  ["سيفيكسيم",         ["cefixime", "suprax"]],
  ["موبروسين",         ["mupirocin", "bactroban"]],
  ["نيومايسين",        ["neomycin"]],
  ["باسيتراسين",       ["bacitracin"]],
  // ── GI / Stomach ─────────────────────────────────────────────────────────
  ["اوميبرازول",       ["omeprazole", "losec", "prilosec"]],
  ["اوميبراذول",       ["omeprazole"]],
  ["لوسيك",            ["losec", "omeprazole"]],
  ["لانسوبرازول",      ["lansoprazole", "prevacid"]],
  ["بانتوبرازول",      ["pantoprazole", "protonix"]],
  ["رابيبرازول",       ["rabeprazole", "aciphex"]],
  ["رانيتيدين",        ["ranitidine", "zantac"]],
  ["زانتاك",           ["zantac", "ranitidine"]],
  ["فاموتيدين",        ["famotidine", "pepcid"]],
  ["ميتوكلوبراميد",    ["metoclopramide", "primperan", "reglan"]],
  ["بريمبيران",        ["primperan", "metoclopramide"]],
  ["بريميران",         ["primperan", "metoclopramide"]],
  ["دومبيريدون",       ["domperidone", "motilium"]],
  ["دومبريدون",        ["domperidone", "motilium"]],
  ["موتيليوم",         ["motilium", "domperidone"]],
  ["اوندانسيترون",     ["ondansetron", "zofran"]],
  ["اوندانسترون",      ["ondansetron"]],
  ["هايوسين",          ["hyoscine", "scopolamine", "buscopan"]],
  ["هيوسين",           ["hyoscine", "buscopan"]],
  ["بوسكوبان",         ["buscopan", "hyoscine"]],
  ["بسكوبان",          ["buscopan", "hyoscine"]],
  ["بسكوبن",           ["buscopan"]],
  ["لوبيراميد",        ["loperamide", "imodium"]],
  ["لوبراميد",         ["loperamide", "imodium"]],
  ["ايموديوم",         ["imodium", "loperamide"]],
  ["بيساكوديل",        ["bisacodyl", "dulcolax"]],
  ["لاكتولوز",         ["lactulose", "duphalac"]],
  ["الماجل",           ["maalox", "antacid", "algeldrate"]],
  // ── Allergy / Respiratory ──────────────────────────────────────────────────
  ["سيتيريزين",        ["cetirizine", "zyrtec", "reactine"]],
  ["سيتيريذين",        ["cetirizine", "zyrtec"]],
  ["سيتيرزين",         ["cetirizine"]],
  ["لوراتادين",        ["loratadine", "claritin"]],
  ["لوراتدين",         ["loratadine"]],
  ["ديفينهيدرامين",    ["diphenhydramine", "benadryl"]],
  ["كلورفينيرامين",    ["chlorpheniramine"]],
  ["فيكسوفينادين",     ["fexofenadine", "allegra", "telfast"]],
  ["فيكسفينادين",      ["fexofenadine"]],
  ["مونتيلوكاست",      ["montelukast", "singulair"]],
  ["مونتيلوكست",       ["montelukast"]],
  ["سالبوتامول",       ["salbutamol", "ventolin", "albuterol"]],
  ["سالبوتمول",        ["salbutamol", "ventolin"]],
  ["فينتولين",         ["ventolin", "salbutamol"]],
  ["فنتولين",          ["ventolin", "salbutamol"]],
  ["فينتلين",          ["ventolin", "salbutamol"]],
  ["ثيوفيلين",         ["theophylline"]],
  ["امبروكسول",        ["ambroxol", "mucosolvan"]],
  ["موكوسولفان",       ["mucosolvan", "ambroxol"]],
  ["برومهيكسين",       ["bromhexine"]],
  ["ديكستروميثورفان",  ["dextromethorphan"]],
  ["جوايافيسين",       ["guaifenesin"]],
  ["نازيل",            ["nasal", "decongestant"]],
  // ── Corticosteroids ───────────────────────────────────────────────────────
  ["بريدنيزولون",      ["prednisolone"]],
  ["بريدنزولون",       ["prednisolone"]],
  ["برينيزولون",       ["prednisolone"]],
  ["ديكساميثازون",     ["dexamethasone"]],
  ["ديكسامتازون",      ["dexamethasone"]],
  ["ديكساميتازون",     ["dexamethasone"]],
  ["بيتاميثازون",      ["betamethasone", "diprolene"]],
  ["هيدروكورتيزون",    ["hydrocortisone", "cortisol"]],
  ["ميثيلبريدنيزولون", ["methylprednisolone", "medrol"]],
  ["فلوتيكازون",       ["fluticasone", "flixotide"]],
  ["بوديزونيد",        ["budesonide", "pulmicort"]],
  // ── Antifungals ───────────────────────────────────────────────────────────
  ["فلوكونازول",       ["fluconazole", "diflucan"]],
  ["فلوكونزول",        ["fluconazole"]],
  ["فلوكنازول",        ["fluconazole"]],
  ["ديفلوكان",         ["diflucan", "fluconazole"]],
  ["ميكونازول",        ["miconazole"]],
  ["كلوتريمازول",      ["clotrimazole", "canesten"]],
  ["كانيستن",          ["canesten", "clotrimazole"]],
  ["كانستن",           ["canesten", "clotrimazole"]],
  ["تيربينافين",       ["terbinafine", "lamisil"]],
  ["نيستاتين",         ["nystatin"]],
  ["ايتراكونازول",     ["itraconazole", "sporanox"]],
  ["فوريكونازول",      ["voriconazole"]],
  // ── Antidiabetics ─────────────────────────────────────────────────────────
  ["ميتفورمين",        ["metformin", "glucophage"]],
  ["جلوكوفاج",         ["glucophage", "metformin"]],
  ["جلوكوفج",          ["glucophage", "metformin"]],
  ["جليبنكلاميد",      ["glibenclamide", "glyburide", "daonil"]],
  ["جليميبريد",        ["glimepiride", "amaryl"]],
  ["جليبيزيد",         ["glipizide"]],
  ["جليكلازيد",        ["gliclazide", "diamicron"]],
  ["سيتاجليبتين",      ["sitagliptin", "januvia"]],
  ["دابيجليفلوزين",    ["dapagliflozin", "forxiga"]],
  ["انسولين",          ["insulin"]],
  ["ليراجلوتيد",       ["liraglutide", "victoza"]],
  ["ايكزيناتيد",       ["exenatide", "byetta"]],
  // ── Cardiovascular ────────────────────────────────────────────────────────
  ["اتورفاستاتين",     ["atorvastatin", "lipitor"]],
  ["اتورفستاتين",      ["atorvastatin", "lipitor"]],
  ["ليبيتور",          ["lipitor", "atorvastatin"]],
  ["سيمفاستاتين",      ["simvastatin", "zocor"]],
  ["سيمفستاتين",       ["simvastatin"]],
  ["روسوفاستاتين",     ["rosuvastatin", "crestor"]],
  ["كريستور",          ["crestor", "rosuvastatin"]],
  ["برافاستاتين",      ["pravastatin"]],
  ["فلوفاستاتين",      ["fluvastatin"]],
  ["امبلوديبين",       ["amlodipine", "norvasc"]],
  ["امبلوديبن",        ["amlodipine"]],
  ["املوديبين",        ["amlodipine", "norvasc"]],
  ["نورفاسك",          ["norvasc", "amlodipine"]],
  ["نيفيديبين",        ["nifedipine", "adalat"]],
  ["فيراباميل",        ["verapamil"]],
  ["ديلتيازيم",        ["diltiazem"]],
  ["ليزينوبريل",       ["lisinopril", "zestril"]],
  ["انالابريل",        ["enalapril", "vasotec"]],
  ["ايناليبريل",       ["enalapril"]],
  ["راميبريل",         ["ramipril", "altace"]],
  ["بيريندوبريل",      ["perindopril", "coversyl"]],
  ["لوسارتان",         ["losartan", "cozaar"]],
  ["فالسارتان",        ["valsartan", "diovan"]],
  ["ارباسارتان",       ["irbesartan", "avapro"]],
  ["تيلميسارتان",      ["telmisartan", "micardis"]],
  ["هيدروكلوروثيازيد", ["hydrochlorothiazide", "hctz"]],
  ["فيوروسيميد",       ["furosemide", "lasix"]],
  ["فيروسيميد",        ["furosemide"]],
  ["لازيكس",           ["lasix", "furosemide"]],
  ["سبيرونولاكتون",    ["spironolactone", "aldactone"]],
  ["اتينولول",         ["atenolol", "tenormin"]],
  ["بروبرانولول",      ["propranolol", "inderal"]],
  ["بيسوبرولول",       ["bisoprolol", "concor"]],
  ["كونكور",           ["concor", "bisoprolol"]],
  ["كارفيديلول",       ["carvedilol", "coreg"]],
  ["ميتوبرولول",       ["metoprolol"]],
  ["هيبارين",          ["heparin"]],
  ["وارفارين",         ["warfarin", "coumadin"]],
  ["كلوبيدوجريل",      ["clopidogrel", "plavix"]],
  ["بلافيكس",          ["plavix", "clopidogrel"]],
  ["اسبكارد",          ["aspegic", "aspirin"]],
  ["نيتروجليسرين",     ["nitroglycerin", "nitro", "tng"]],
  ["ايزوسوربيد",       ["isosorbide"]],
  ["ديجوكسين",         ["digoxin", "lanoxin"]],
  ["امودارون",         ["amiodarone", "cordarone"]],
  ["كوردارون",         ["cordarone", "amiodarone"]],
  // ── Thyroid ────────────────────────────────────────────────────────────────
  ["ليفوثيروكسين",     ["levothyroxine", "thyroxine", "synthroid", "eltroxin"]],
  ["ليفوثيروكسن",      ["levothyroxine"]],
  ["ثيروكسين",         ["thyroxine", "levothyroxine"]],
  ["الثيروكسين",       ["thyroxine", "levothyroxine"]],
  ["ابتيرويد",         ["eltroxin", "levothyroxine"]],
  ["كارباميزول",       ["carbimazole"]],
  // ── CNS / Psychiatry ──────────────────────────────────────────────────────
  ["ديازيبام",         ["diazepam", "valium"]],
  ["ديازيبم",          ["diazepam", "valium"]],
  ["فاليوم",           ["valium", "diazepam"]],
  ["لوبرازيبام",       ["lorazepam", "ativan"]],
  ["لوبرازيبم",        ["lorazepam"]],
  ["اتيفان",           ["ativan", "lorazepam"]],
  ["الفرازولام",       ["alprazolam", "xanax"]],
  ["الفرازلام",        ["alprazolam"]],
  ["زاناكس",           ["xanax", "alprazolam"]],
  ["كلونازيبام",       ["clonazepam", "rivotril"]],
  ["ريفوتريل",         ["rivotril", "clonazepam"]],
  ["فلوكسيتين",        ["fluoxetine", "prozac"]],
  ["فلوكستين",         ["fluoxetine"]],
  ["بروزاك",           ["prozac", "fluoxetine"]],
  ["سيتالوبرام",       ["citalopram", "cipramil"]],
  ["اسيتالوبرام",      ["escitalopram", "lexapro", "cipralex"]],
  ["سيرترالين",        ["sertraline", "zoloft"]],
  ["زولوفت",           ["zoloft", "sertraline"]],
  ["باروكسيتين",       ["paroxetine", "paxil"]],
  ["فينلافاكسين",      ["venlafaxine", "effexor"]],
  ["دولوكسيتين",       ["duloxetine", "cymbalta"]],
  ["ميرتازابين",       ["mirtazapine", "remeron"]],
  ["اميتريبتيلين",     ["amitriptyline", "elavil"]],
  ["اميتربتيلين",      ["amitriptyline"]],
  ["هالوبيريدول",      ["haloperidol", "haldol"]],
  ["ريسبيريدون",       ["risperidone", "risperdal"]],
  ["اولانزابين",       ["olanzapine", "zyprexa"]],
  ["كيوتيابين",        ["quetiapine", "seroquel"]],
  ["كيتيابين",         ["quetiapine", "seroquel"]],
  ["كلوزابين",         ["clozapine", "clozaril"]],
  ["كربامازيبين",      ["carbamazepine", "tegretol"]],
  ["تيجريتول",         ["tegretol", "carbamazepine"]],
  ["فنيتوين",          ["phenytoin", "dilantin"]],
  ["فينيتوين",         ["phenytoin"]],
  ["جابابنتين",        ["gabapentin", "neurontin"]],
  ["جابابنتن",         ["gabapentin"]],
  ["بريجابالين",       ["pregabalin", "lyrica"]],
  ["بريجبالين",        ["pregabalin"]],
  ["ليريكا",           ["lyrica", "pregabalin"]],
  ["لاموتريجين",       ["lamotrigine", "lamictal"]],
  ["فالبروات",         ["valproate", "depakote", "epilim"]],
  ["ليفيتيراسيتام",    ["levetiracetam", "keppra"]],
  ["زولبيديم",         ["zolpidem", "ambien", "stilnox"]],
  ["ستيلنوكس",         ["stilnox", "zolpidem"]],
  ["تريازولام",        ["triazolam"]],
  ["دونيبيزيل",        ["donepezil", "aricept"]],
  ["ميمانتين",         ["memantine", "namenda"]],
  // ── Emergency / Anaesthesia ───────────────────────────────────────────────
  ["ادرينالين",        ["adrenaline", "epinephrine"]],
  ["ابينفرين",         ["epinephrine", "adrenaline"]],
  ["نورابينفرين",      ["norepinephrine", "noradrenaline"]],
  ["اتروبين",          ["atropine"]],
  ["كيتامين",          ["ketamine"]],
  ["ميدازولام",        ["midazolam"]],
  ["بروبوفول",         ["propofol"]],
  ["ليدوكايين",        ["lidocaine", "lignocaine"]],
  // ── Supplements / Vitamins ────────────────────────────────────────────────
  ["فيتامين ج",        ["vitamin c", "ascorbic acid", "ascorbate"]],
  ["فيتامين سي",       ["vitamin c", "ascorbic acid"]],
  ["فيتامين ب",        ["vitamin b", "b complex", "thiamine", "riboflavin"]],
  ["فيتامين ب 12",     ["vitamin b12", "cyanocobalamin", "cobalamin"]],
  ["فيتامين ب12",      ["vitamin b12", "cyanocobalamin"]],
  ["فيتامين د",        ["vitamin d", "cholecalciferol", "colecalciferol"]],
  ["فيتامين دي",       ["vitamin d", "cholecalciferol"]],
  ["فيتامين ه",        ["vitamin e", "tocopherol"]],
  ["فيتامين اي",       ["vitamin a", "retinol"]],
  ["فيتامين ك",        ["vitamin k", "phytomenadione"]],
  ["كالسيوم",          ["calcium"]],
  ["الكالسيوم",        ["calcium"]],
  ["الحديد",           ["iron", "ferrous"]],
  ["كبريتات الحديد",   ["iron sulfate", "ferrous sulfate"]],
  ["فيروس سلفات",      ["ferrous sulfate", "iron"]],
  ["زنك",              ["zinc"]],
  ["زينك",             ["zinc"]],
  ["مجنيسيوم",         ["magnesium"]],
  ["ماغنيسيوم",        ["magnesium"]],
  ["حمض الفوليك",      ["folic acid", "folate", "folacin"]],
  ["فوليك اسيد",       ["folic acid", "folate"]],
  ["اوميجا 3",         ["omega 3", "fish oil", "epa", "dha"]],
  ["اوميغا 3",         ["omega 3", "fish oil"]],
  ["زيت السمك",        ["fish oil", "omega 3"]],
  ["بيوتين",           ["biotin", "vitamin h"]],
  ["سيليكون",          ["silicon", "silica"]],
  ["كولاجين",          ["collagen"]],
  ["الزنك",            ["zinc"]],
  // ── Topical / Dermatology ─────────────────────────────────────────────────
  ["موبروسين",         ["mupirocin", "bactroban"]],
  ["باكتروبان",        ["bactroban", "mupirocin"]],
  ["بنتانول",          ["panthenol", "dexpanthenol", "bepanthen"]],
  ["بيبانثين",         ["bepanthen", "panthenol"]],
  ["هيدروكينون",       ["hydroquinone"]],
  ["بنزويل بيروكسيد",  ["benzoyl peroxide"]],
  ["تريتينوين",        ["tretinoin", "retin-a"]],
  ["ريتينول",          ["retinol", "vitamin a"]],
  ["كليندامايسين",     ["clindamycin", "dalacin"]],
  // ── Ophthalmology ─────────────────────────────────────────────────────────
  ["التيمولول",        ["timolol"]],
  ["دورزولاميد",       ["dorzolamide"]],
  ["لاتانوبروست",      ["latanoprost", "xalatan"]],
  ["سيبروفلوكساسين قطرة", ["ciprofloxacin eye drops"]],
  ["التوبراميسين",     ["tobramycin"]],
]);

// Build EN → AR map (reverse of AR_TO_EN)
const EN_TO_AR = new Map<string, Set<string>>();
for (const [ar, enList] of AR_TO_EN) {
  for (const en of enList) {
    if (!EN_TO_AR.has(en)) EN_TO_AR.set(en, new Set());
    EN_TO_AR.get(en)!.add(ar);
  }
}

/**
 * Expand a normalised query with dictionary synonyms.
 * E.g. "بنادول" → ["بنادول", "panadol", "paracetamol", "acetaminophen"]
 */
function expandQuery(q: string): string[] {
  const terms = new Set<string>([q]);

  // Exact Arabic → English
  const enTerms = AR_TO_EN.get(q);
  if (enTerms) for (const e of enTerms) terms.add(e);

  // Exact English → Arabic
  const arTerms = EN_TO_AR.get(q);
  if (arTerms) for (const a of arTerms) terms.add(a);

  // Try individual tokens from the query (for multi-word queries)
  for (const token of q.split(" ")) {
    if (token.length < 3) continue;
    const t = AR_TO_EN.get(token);
    if (t) for (const e of t) terms.add(e);
    const e = EN_TO_AR.get(token);
    if (e) for (const a of e) terms.add(a);
  }

  return Array.from(terms);
}

// ════════════════════════════════════════════════════════════════════════════════
// Edit distance (Levenshtein) with reusable row array
// ════════════════════════════════════════════════════════════════════════════════

// Reusable row arrays to avoid allocation on every call (max word length ~64)
const _row0 = new Uint16Array(256);
const _row1 = new Uint16Array(256);

/**
 * Returns the Levenshtein edit distance between two normalised strings.
 * Aborts early when the distance exceeds `maxDist` (returns maxDist + 1).
 */
export function editDistance(a: string, b: string, maxDist = 2): number {
  const la = a.length;
  const lb = b.length;

  // Quick length-difference check — if lengths differ by more than maxDist,
  // the edit distance must exceed maxDist.
  if (Math.abs(la - lb) > maxDist) return maxDist + 1;
  if (la === 0) return lb > maxDist ? maxDist + 1 : lb;
  if (lb === 0) return la > maxDist ? maxDist + 1 : la;

  let cur  = _row0;
  let prev = _row1;

  for (let j = 0; j <= lb; j++) cur[j] = j;

  for (let i = 1; i <= la; i++) {
    const tmp = prev; prev = cur; cur = tmp;
    cur[0] = i;
    let rowMin = i;

    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(
        prev[j]     + 1,    // deletion
        cur[j - 1]  + 1,    // insertion
        prev[j - 1] + cost, // substitution
      );
      if (cur[j] < rowMin) rowMin = cur[j];
    }

    // Early exit: entire row ≥ maxDist+1 means no path can do better
    if (rowMin > maxDist) return maxDist + 1;
  }

  return cur[lb];
}

// ════════════════════════════════════════════════════════════════════════════════
// Bigram (Dice) similarity
// ════════════════════════════════════════════════════════════════════════════════

function bigrams(s: string): Map<string, number> {
  const bg = new Map<string, number>();
  for (let i = 0; i < s.length - 1; i++) {
    const k = s[i] + s[i + 1];
    bg.set(k, (bg.get(k) ?? 0) + 1);
  }
  return bg;
}

function diceSimilarity(a: string, b: string): number {
  if (a.length < 2 || b.length < 2) return 0;
  const bgA = bigrams(a);
  const bgB = bigrams(b);
  let shared = 0;
  for (const [k, cntA] of bgA) {
    const cntB = bgB.get(k) ?? 0;
    shared += Math.min(cntA, cntB);
  }
  return (2 * shared) / (a.length - 1 + (b.length - 1));
}

// ════════════════════════════════════════════════════════════════════════════════
// Token splitter
// ════════════════════════════════════════════════════════════════════════════════

const RE_SPLIT = /[\s\-/\\+().,،؛:]+/;

function tokenize(s: string): string[] {
  return s.split(RE_SPLIT).filter((t) => t.length >= 1);
}

// ════════════════════════════════════════════════════════════════════════════════
// Core match helpers
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Does a normalised field string match the normalised query?
 * Checks: exact substring → prefix of any token → edit distance ≤ 2.
 */
function fieldMatchesToken(field: string, qToken: string): boolean {
  if (!field) return false;

  // 1. Substring containment (fastest check)
  if (field.includes(qToken)) return true;

  // 2. Token-level checks
  const fieldTokens = tokenize(field);
  for (const ft of fieldTokens) {
    if (ft === qToken) return true;
    if (ft.startsWith(qToken) && qToken.length >= 2) return true;
    if (qToken.startsWith(ft) && ft.length >= 3) return true;

    // 3. Edit distance (for tokens ≥ 3 chars)
    if (qToken.length >= 3 && ft.length >= 3) {
      const maxDist = qToken.length <= 5 ? 1 : 2;
      if (editDistance(qToken, ft, maxDist) <= maxDist) return true;
    }
  }

  // 4. Whole-string edit distance for short strings
  if (qToken.length >= 4 && field.length <= qToken.length + 3) {
    const maxDist = qToken.length <= 6 ? 1 : 2;
    if (editDistance(qToken, field, maxDist) <= maxDist) return true;
  }

  // 5. Bigram similarity for longer strings
  if (qToken.length >= 4 && field.length >= 4) {
    if (diceSimilarity(qToken, field) >= 0.5) return true;
    for (const ft of fieldTokens) {
      if (ft.length >= 4 && diceSimilarity(qToken, ft) >= 0.55) return true;
    }
  }

  return false;
}

// Per-call match cache (lives for the duration of one executeSearch() call)
const _matchCache = new LRUCache<string, boolean>(2048);
const _scoreCache = new LRUCache<string, number>(2048);

export function clearFuzzyCache(): void {
  _matchCache.clear();
  _scoreCache.clear();
  _normCache.clear();
}

// ════════════════════════════════════════════════════════════════════════════════
// Public API: fuzzyMatch & fuzzyScore
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Returns true if `query` is a plausible match for the product `fields`.
 * Handles:
 *  • Arabic normalisation
 *  • Substring match
 *  • Token-level edit distance (≤ 2)
 *  • Cross-language dictionary expansion
 *  • Code / barcode prefix match
 */
export function fuzzyMatch(query: string, fields: FuzzySearchableFields): boolean {
  const q = normalise(query);
  if (!q) return false;

  const cacheKey = q + "|" + (fields.nameAr ?? "") + "|" + (fields.nameEn ?? "");
  const cached = _matchCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const nAr  = normalise(fields.nameAr);
  const nEn  = normalise(fields.nameEn);
  const nCat = normalise(fields.category);
  const code = (fields.code    ?? "").toLowerCase().trim();
  const bar  = (fields.barcode ?? "").toLowerCase().trim();

  // Fast path: code / barcode exact prefix
  if (code && code.startsWith(q)) { _matchCache.set(cacheKey, true); return true; }
  if (bar  && bar.startsWith(q))  { _matchCache.set(cacheKey, true); return true; }

  // Expand query via dictionary
  const expansions = expandQuery(q);

  for (const expansion of expansions) {
    const tokens = tokenize(expansion);
    // Every token in the expansion must match at least one field
    let allMatch = true;
    for (const tok of tokens) {
      if (tok.length < 1) continue;
      const hit =
        fieldMatchesToken(nAr,  tok) ||
        fieldMatchesToken(nEn,  tok) ||
        fieldMatchesToken(nCat, tok);
      if (!hit) { allMatch = false; break; }
    }
    if (allMatch && tokens.length > 0) {
      _matchCache.set(cacheKey, true);
      return true;
    }
  }

  _matchCache.set(cacheKey, false);
  return false;
}

/**
 * Numeric ranking score for a query ↔ fields pair.
 * Higher = better match. Returns 0 when no match.
 *
 * Score bands (approximate):
 *   1000  exact full-name match (normalised)
 *    900  code / barcode prefix exact
 *    800  name starts with query
 *    700  dictionary expansion → exact English name
 *    600  name contains query as substring
 *    500  any token starts with query
 *    400  bigram similarity ≥ 0.7
 *    300  edit distance 1 token match
 *    200  edit distance 2 token match
 *    100  category match
 */
export function fuzzyScore(query: string, fields: FuzzySearchableFields): number {
  const q = normalise(query);
  if (!q) return 0;

  const cacheKey = "sc|" + q + "|" + (fields.nameAr ?? "") + "|" + (fields.nameEn ?? "");
  const cached = _scoreCache.get(cacheKey);
  if (cached !== undefined) return cached;

  const nAr  = normalise(fields.nameAr);
  const nEn  = normalise(fields.nameEn);
  const nCat = normalise(fields.category);
  const code = (fields.code    ?? "").toLowerCase();
  const bar  = (fields.barcode ?? "").toLowerCase();

  let score = 0;

  // Code / barcode
  if (code === q || bar === q)            { score = Math.max(score, 900); }
  else if (code.startsWith(q) || bar.startsWith(q)) { score = Math.max(score, 850); }

  // Exact name match
  if (nAr === q || nEn === q)             { score = Math.max(score, 1000); }

  // Name starts with query
  else if (nAr.startsWith(q) || nEn.startsWith(q)) { score = Math.max(score, 800); }

  // Substring containment
  else if (nAr.includes(q) || nEn.includes(q)) { score = Math.max(score, 600); }

  // Dictionary expansion scoring
  const expansions = expandQuery(q);
  for (const exp of expansions) {
    if (exp === q) continue; // already handled above
    if (nAr.includes(exp) || nEn.includes(exp)) {
      score = Math.max(score, 700 - exp.length); // closer = higher
    }
    if (nEn.startsWith(exp) || nAr.startsWith(exp)) {
      score = Math.max(score, 680);
    }
  }

  // Token-level scoring
  const qTokens = tokenize(q);
  for (const qTok of qTokens) {
    if (qTok.length < 2) continue;

    for (const field of [nAr, nEn]) {
      if (!field) continue;
      const fTokens = tokenize(field);

      for (const fTok of fTokens) {
        if (fTok === qTok)              { score = Math.max(score, 750); continue; }
        if (fTok.startsWith(qTok))      { score = Math.max(score, 500); continue; }
        if (qTok.startsWith(fTok) && fTok.length >= 3) {
          score = Math.max(score, 480);
          continue;
        }

        if (qTok.length >= 3 && fTok.length >= 3) {
          const d = editDistance(qTok, fTok, 2);
          if (d === 1) { score = Math.max(score, 300); }
          else if (d === 2) { score = Math.max(score, 200); }
        }

        if (qTok.length >= 4 && fTok.length >= 4) {
          const sim = diceSimilarity(qTok, fTok);
          if (sim >= 0.7)      { score = Math.max(score, 400); }
          else if (sim >= 0.5) { score = Math.max(score, 250); }
        }
      }
    }
  }

  // Category match (low priority)
  if (nCat.includes(q)) { score = Math.max(score, 100); }

  _scoreCache.set(cacheKey, score);
  return score;
}

// ════════════════════════════════════════════════════════════════════════════════
// Search index: inverted token index + 3-gram n-gram index + prefix index
// ════════════════════════════════════════════════════════════════════════════════

function extractIndexTerms(item: FuzzyIndexable): string[] {
  const terms = new Set<string>();

  for (const raw of [item.nameAr, item.nameEn, item.category, item.code, item.barcode]) {
    if (!raw) continue;
    const norm = normalise(raw);
    if (!norm) continue;

    // Full normalised string
    terms.add(norm);

    // Individual tokens
    for (const tok of tokenize(norm)) {
      if (tok.length >= 2) {
        terms.add(tok);
        // 3-char prefix
        if (tok.length >= 3) terms.add(tok.slice(0, 3));
        if (tok.length >= 4) terms.add(tok.slice(0, 4));
      }
    }
  }

  // Add dictionary expansions for the Arabic name
  const arNorm = normalise(item.nameAr);
  const expansions = expandQuery(arNorm);
  for (const exp of expansions) {
    if (exp === arNorm) continue;
    const norm = normalise(exp);
    terms.add(norm);
    for (const tok of tokenize(norm)) {
      if (tok.length >= 3) {
        terms.add(tok);
        terms.add(tok.slice(0, 3));
      }
    }
  }

  return Array.from(terms);
}

function extractNgrams(s: string, n: number): string[] {
  const grams: string[] = [];
  if (s.length < n) return grams;
  for (let i = 0; i <= s.length - n; i++) {
    grams.push(s.slice(i, i + n));
  }
  return grams;
}

/**
 * Build the search index from a list of products.
 * Called once per catalog snapshot in the worker's INIT handler.
 */
export function buildSearchIndexImpl(items: FuzzyIndexable[]): SearchIndex {
  const tokenIndex  = new Map<string, Set<string>>();
  const ngramIndex  = new Map<string, Set<string>>();
  const prefixIndex = new Map<string, Set<string>>();

  function addToIndex(map: Map<string, Set<string>>, key: string, id: string): void {
    let set = map.get(key);
    if (!set) { set = new Set(); map.set(key, set); }
    set.add(id);
  }

  for (const item of items) {
    const { id } = item;
    const terms   = extractIndexTerms(item);

    for (const term of terms) {
      addToIndex(tokenIndex, term, id);

      // 3-char n-grams over the term (for fuzzy prefix/substring retrieval)
      if (term.length >= 3) {
        for (const gram of extractNgrams(term, 3)) {
          addToIndex(ngramIndex, gram, id);
        }
      }

      // Prefixes (1–4 chars)
      for (let l = 1; l <= Math.min(4, term.length); l++) {
        addToIndex(prefixIndex, term.slice(0, l), id);
      }
    }
  }

  return { tokenIndex, ngramIndex, prefixIndex, productCount: items.length };
}

/**
 * Return a candidate Set<productId> for a query using the pre-built index.
 *
 * Strategy:
 *  1. Exact token lookup
 *  2. Prefix lookup (up to 4 chars) of each query token
 *  3. 3-gram lookup of each query token
 *  4. Dictionary expansion — repeat steps 1–3 for each synonym
 *
 * Returns an empty set when no candidates are found (caller falls back to
 * linear scan).
 */
export function queryIndexCandidates(
  index: SearchIndex,
  query: string,
): ReadonlySet<string> {
  const q      = normalise(query);
  if (!q) return new Set();

  const result = new Set<string>();

  function absorb(set: Set<string> | undefined): void {
    if (set) for (const id of set) result.add(id);
  }

  // Look up a single normalised term through the index layers
  function lookupTerm(term: string): void {
    // Exact token
    absorb(index.tokenIndex.get(term));

    // Prefix lookup for each token of the term
    for (const tok of tokenize(term)) {
      if (tok.length < 2) continue;

      // Exact token
      absorb(index.tokenIndex.get(tok));

      // Prefix variations
      for (let l = Math.min(tok.length, 4); l >= 2; l--) {
        absorb(index.prefixIndex.get(tok.slice(0, l)));
      }

      // 3-gram
      if (tok.length >= 3) {
        for (const gram of extractNgrams(tok, 3)) {
          absorb(index.ngramIndex.get(gram));
        }
        // Also look up 2-char prefix of each trigram (for 1-char-edit tolerance)
        absorb(index.prefixIndex.get(tok.slice(0, 3)));
      }
    }

    // Full term n-grams
    if (term.length >= 3) {
      for (const gram of extractNgrams(term, 3)) {
        absorb(index.ngramIndex.get(gram));
      }
    }
  }

  lookupTerm(q);

  // Dictionary expansion: also look up synonyms so a Arabic query finds
  // English-keyed products and vice versa.
  for (const expansion of expandQuery(q)) {
    if (expansion === q) continue;
    lookupTerm(normalise(expansion));
  }

  return result;
}

// ════════════════════════════════════════════════════════════════════════════════
// expandSearchTerms — used by the server-side (Supabase) search path
// ════════════════════════════════════════════════════════════════════════════════

const RE_ARABIC = /[؀-ۿ]/;

/**
 * Expand a raw search query into all SQL-ready search terms for a Supabase
 * ilike OR query.  Handles:
 *
 *  • Arabic normalisation (removes diacritics, unifies hamza/ة/ى)
 *  • Exact dictionary lookup   "بنادول" → panadol, paracetamol
 *  • Fuzzy dictionary lookup   "بندول"  → finds "بنادول" (edit-dist 1) →
 *                              panadol, paracetamol  (handles typos)
 *  • English → Arabic reverse  "panadol" → بنادول
 *
 * Returns an object with two arrays so callers can target the correct DB
 * columns (`Name_Ar` for Arabic terms, `Name_En` for English terms).
 *
 * Usage in buildSupabaseQuery:
 *   const { arTerms, enTerms } = expandSearchTerms(raw);
 *   // build ilike OR conditions for each term in the right column
 */
export function expandSearchTerms(rawQuery: string): {
  arTerms: string[];
  enTerms: string[];
} {
  const raw  = rawQuery.trim();
  const q    = normalise(raw);
  if (!q) return { arTerms: [raw], enTerms: [] };

  const arSet = new Set<string>();
  const enSet = new Set<string>();

  function add(term: string): void {
    if (!term || term.length < 2) return;
    if (RE_ARABIC.test(term)) arSet.add(term);
    else                       enSet.add(term.toLowerCase());
  }

  // Always include the raw and normalised query itself
  add(raw);
  add(q);

  // Exact dictionary expansions
  for (const t of expandQuery(q)) add(t);

  // Fuzzy dictionary lookup — scan AR keys within edit-distance 2 of query.
  // This is what makes "بندول" find "بنادول" products even without the RPC.
  if (q.length >= 3 && q.length <= 16) {
    const maxDist = q.length <= 6 ? 1 : 2;
    for (const [key, enTerms] of AR_TO_EN) {
      if (Math.abs(key.length - q.length) > maxDist) continue;
      if (editDistance(q, key, maxDist) <= maxDist) {
        add(key);
        for (const en of enTerms) add(en);
      }
    }
  }

  // For English queries, also do fuzzy scan of EN keys
  if (!RE_ARABIC.test(q) && q.length >= 3 && q.length <= 16) {
    const maxDist = q.length <= 7 ? 1 : 2;
    for (const [enKey, arSet2] of EN_TO_AR) {
      if (Math.abs(enKey.length - q.length) > maxDist) continue;
      if (editDistance(q, enKey, maxDist) <= maxDist) {
        add(enKey);
        for (const ar of arSet2) add(ar);
      }
    }
  }

  return {
    arTerms: Array.from(arSet),
    enTerms: Array.from(enSet),
  };
}
