/**
 * fuzzySearch.ts — Bilingual (Arabic ↔ English) search engine
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * ARCHITECTURE — five-layer pipeline, short-circuits on first `true`
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *   L1  Exact / substring on every normalised field value
 *   L2  Medical / brand-name dictionary cross-language lookup → re-runs L1
 *   L3  Phonetic transliteration in a shared Latin space → substring check
 *   L4  Levenshtein on ≥4-char phonetic tokens  (max ⌊len × 0.30⌋ edits)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * NEW IN THIS VERSION: Inverted Index + Trie + Proper LRU Cache
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 *  • buildSearchIndex(products) — called once by the worker on INIT.
 *    Builds two complementary structures:
 *
 *    1. Inverted Index  (Map<token, Set<productId>>)
 *       Tokenises every field of every product and maps each normalised token
 *       to the set of product IDs that contain it.  A query token lookup is
 *       O(1) and immediately reduces the candidate set from 52K → typically
 *       50–500 items before any fuzzy scoring runs.
 *
 *    2. Prefix Trie  (compact radix tree)
 *       Supports O(prefix.length) retrieval of all product IDs whose tokens
 *       begin with a given prefix.  Essential for real-time typing where the
 *       user has only typed a partial word.
 *
 *  • queryIndexCandidates(index, query) — combines trie prefix lookup with
 *    inverted-index exact-token lookup and unions the candidate sets.  The
 *    worker calls this before fuzzy scoring so it only scores the union set.
 *
 *  • LRUCache<K,V> — doubly-linked-list LRU with O(1) get/set.
 *    Replaces the previous `Map + _cache.clear()` approach which discarded ALL
 *    cached results when the 2048 cap was hit.  Now only the least-recently-used
 *    entry is evicted, so backspace (e.g. "Panad" ← "Panado") is an O(1) cache
 *    hit instead of a full re-scan.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 * BACKWARD-COMPATIBLE PUBLIC API (unchanged)
 * ═══════════════════════════════════════════════════════════════════════════════
 *   normalise(s)             → canonical form for comparison
 *   fuzzyMatch(q, fields)    → boolean pre-filter (cached, O(1) on hit)
 *   fuzzyScore(q, fields)    → number 0–1 for ranking
 *   clearFuzzyCache()        → flush LRU
 *
 * NEW EXPORTS
 *   tokenise(s)              → string[]  normalised search tokens
 *   buildSearchIndex(items)  → SearchIndex
 *   queryIndexCandidates(i, q) → Set<string>  candidate product IDs
 *   LRUCache<K,V>            → reusable O(1) LRU implementation
 */

// ─── LRU Cache ────────────────────────────────────────────────────────────────

/**
 * O(1) get/set Least-Recently-Used cache backed by a Map + doubly-linked list.
 *
 * WHY: The previous implementation used `Map.clear()` when the size cap was
 * hit, wiping ALL cached entries.  Typing "Panadol" caches 7 results; the
 * 2048-cap clear discards all of them.  With a true LRU, backspace from
 * "Panadol" → "Panado" is an instant cache hit.
 */
export class LRUCache<K, V> {
  private readonly map = new Map<K, LRUNode<K, V>>();
  private head: LRUNode<K, V> | null = null; // most-recently-used
  private tail: LRUNode<K, V> | null = null; // least-recently-used

  constructor(private readonly capacity: number) {}

  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    this._moveToHead(node);
    return node.value;
  }

  set(key: K, value: V): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      this._moveToHead(existing);
      return;
    }
    const node: LRUNode<K, V> = { key, value, prev: null, next: this.head };
    if (this.head) this.head.prev = node;
    this.head = node;
    if (!this.tail) this.tail = node;
    this.map.set(key, node);

    if (this.map.size > this.capacity) {
      // Evict least-recently-used (tail)
      const evicted = this.tail!;
      this.tail = evicted.prev;
      if (this.tail) this.tail.next = null;
      this.map.delete(evicted.key);
    }
  }

  has(key: K): boolean {
    return this.map.has(key);
  }

  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  get size(): number {
    return this.map.size;
  }

  private _moveToHead(node: LRUNode<K, V>): void {
    if (node === this.head) return;
    // Detach
    if (node.prev) node.prev.next = node.next;
    if (node.next) node.next.prev = node.prev;
    if (node === this.tail) this.tail = node.prev;
    // Prepend
    node.prev = null;
    node.next = this.head;
    if (this.head) this.head.prev = node;
    this.head = node;
  }
}

interface LRUNode<K, V> {
  key:   K;
  value: V;
  prev:  LRUNode<K, V> | null;
  next:  LRUNode<K, V> | null;
}

// ─── 1. Normalisation ─────────────────────────────────────────────────────────

/**
 * Single-pass lowercase + full Arabic script unification.
 *
 * WHY single pass: regex chains allocate N intermediate strings.  A single
 * regex union allocated once at module load time does the same work in one
 * allocation.
 */
const NORMALISE_REGEX = /[\u064B-\u065F\u0670\u0640]|[أإآ]|ة|ى/g;

function normaliseReplacer(ch: string): string {
  // tashkeel / harakat + tatweel → delete
  if (ch >= "\u064B" && ch <= "\u065F") return "";
  if (ch === "\u0670" || ch === "\u0640") return "";
  // hamza variants → bare alef
  if (ch === "أ" || ch === "إ" || ch === "آ") return "ا";
  // ta marbuta → ha
  if (ch === "ة") return "ه";
  // alef maqsura → ya
  if (ch === "ى") return "ي";
  return ch;
}

export function normalise(s: string): string {
  return s.toLowerCase().replace(NORMALISE_REGEX, normaliseReplacer).trim();
}

// ─── 2. Tokeniser ────────────────────────────────────────────────────────────

/**
 * Returns the normalised search tokens extracted from a string.
 *
 * Tokens are split on whitespace and non-alphanumeric/non-Arabic boundaries.
 * Single-character tokens are kept because Arabic characters carry meaning.
 * This is used both at index-build time (per product) and at query time.
 *
 * WHY export: workers and the trie builder both need this exact function.
 * Having it in one place guarantees index-build and query tokenisation are
 * always identical (a mismatch would cause lookups to fail silently).
 */
export function tokenise(s: string): string[] {
  const norm = normalise(s);
  if (!norm) return [];
  // Split on whitespace and ASCII punctuation; keep Arabic + alphanumeric
  return norm.split(/[\s\-_/\\.,;:()[\]{}]+/).filter(Boolean);
}

// ─── 3. Transliteration ──────────────────────────────────────────────────────

const AR_TO_LATIN: Readonly<Record<string, string>> = {
  ا:"a", ب:"b", ت:"t", ث:"th", ج:"j", ح:"h", خ:"kh",
  د:"d", ذ:"dh", ر:"r", ز:"z", س:"s", ش:"sh", ص:"s",
  ض:"d", ط:"t", ظ:"z", ع:"a",  غ:"gh", ف:"f", ق:"q",
  ك:"k", ل:"l", م:"m", ن:"n",  ه:"h",  و:"o", ي:"y",
};

function arabicToLatin(s: string): string {
  return [...normalise(s)].map((ch) => AR_TO_LATIN[ch] ?? ch).join("");
}

const HAS_ARABIC = /[\u0600-\u06FF]/;

function toPhonetic(s: string): string {
  const n = normalise(s);
  return HAS_ARABIC.test(n) ? arabicToLatin(n) : n;
}

// ─── 4. Medical / brand-name dictionary ──────────────────────────────────────

/* eslint-disable @typescript-eslint/no-duplicate-type-constituents */
const MEDICAL_DICT_AR_EN: Readonly<Record<string, string>> = {
  // Dosage forms
  كحول:"alcohol", قطره:"drops", مرهم:"ointment", كريم:"cream",
  جل:"gel", شامبو:"shampoo", حقنه:"injection", كبسوله:"capsule",
  قرص:"tablet", شراب:"syrup", معلق:"suspension", لبوس:"suppository",
  بخاخ:"spray", غسول:"lotion", محلول:"solution", بودره:"powder",
  حبيبات:"granules", لصقه:"patch", قطاره:"dropper", امبول:"ampoule",
  فيال:"vial", سيروم:"serum", تحميله:"suppository", بلسم:"balm",
  بخور:"inhalation", افوار:"effervescent", اقراص:"tablets",
  كبسولات:"capsules", حبوب:"pills", مضغ:"chewable", مستحلب:"emulsion",
  مرذاذ:"spray", "تحت اللسان":"sublingual",
  "طويل المفعول":"sustained release", "سريع المفعول":"immediate release",
  // Therapeutic classes
  مسكن:"painkiller", "مسكن الم":"analgesic", "خافض حراره":"antipyretic",
  "مضاد حيوي":"antibiotic", "مضاد التهاب":"anti-inflammatory",
  "مضاد هستامين":"antihistamine", "مضاد فطريات":"antifungal",
  "مضاد فيروسات":"antiviral", "مضاد اكتئاب":"antidepressant",
  مهدئ:"sedative", منوم:"sleep aid", مقوي:"tonic", فيتامين:"vitamin",
  "مكمل غذائي":"dietary supplement", ملين:"laxative",
  "مضاد اسهال":"antidiarrheal", "مضاد غثيان":"antiemetic",
  "مضاد حموضه":"antacid", "طارد غازات":"antiflatulent",
  "مضاد سعال":"antitussive", "طارد بلغم":"expectorant",
  "مزيل احتقان":"decongestant", "خافض ضغط":"antihypertensive",
  "مدر بول":"diuretic", "مضاد تخثر":"anticoagulant",
  "مضاد صرع":"antiepileptic", "مضاد قلق":"anxiolytic",
  منبه:"stimulant", منشط:"stimulant", "مقوي قلب":"cardiac tonic",
  "موسع شعب":"bronchodilator", كورتيزون:"cortisone",
  "مضاد روماتيزم":"anti-rheumatic", مسهل:"laxative",
  "خافض سكر":"hypoglycemic", انسولين:"insulin", هرمون:"hormone",
  "مضاد قرحه":"antiulcer", "واقي معده":"gastroprotective",
  "مقوي مناعه":"immunostimulant", "مضاد للتشنج":"antispasmodic",
  "مرخ عضلات":"muscle relaxant", "منبه التبويض":"ovulation stimulant",
  "منع الحمل":"contraceptive",
  // Body systems / conditions
  صداع:"headache", حمى:"fever", سعال:"cough", زكام:"cold",
  انفلونزا:"flu", حساسيه:"allergy", ربو:"asthma", سكري:"diabetes",
  "ضغط الدم":"blood pressure", كوليسترول:"cholesterol", قلب:"heart",
  كلى:"kidney", كبد:"liver", "جهاز هضمي":"digestive", مفاصل:"joints",
  عظام:"bones", جلد:"skin", شعر:"hair", اسنان:"teeth", عيون:"eyes",
  اذن:"ear", انف:"nose", حلق:"throat", "غده درقيه":"thyroid",
  "غده نخاميه":"pituitary", "كيس دم":"blood clot", انيميا:"anemia",
  "فقر دم":"anemia", التهاب:"inflammation", عدوى:"infection",
  فطريات:"fungal", بكتيريا:"bacterial", فيروس:"viral", طفيليات:"parasitic",
  // Eye / ear / nasal
  "قطره عين":"eye drops", "قطره اذن":"ear drops",
  "قطره انف":"nasal drops", "مرهم عين":"eye ointment",
  "شطاف عين":"eye wash",
  // Oral care
  "غسول فم":"mouthwash", "معجون اسنان":"toothpaste", ابتسامه:"smile",
  "تبييض اسنان":"teeth whitening",
};

const MEDICAL_DICT_EN_AR: Readonly<Record<string, string>> = {
  painkiller:"مسكن", analgesic:"مسكن", antipyretic:"خافض حراره",
  antibiotic:"مضاد حيوي", antihistamine:"مضاد هستامين",
  antifungal:"مضاد فطريات", antiviral:"مضاد فيروسات",
  antidepressant:"مضاد اكتئاب", sedative:"مهدئ", vitamin:"فيتامين",
  supplement:"مكمل", laxative:"ملين", antacid:"مضاد حموضه",
  decongestant:"مزيل احتقان", diuretic:"مدر بول",
  anticoagulant:"مضاد تخثر", anxiolytic:"مضاد قلق",
  bronchodilator:"موسع شعب", cortisone:"كورتيزون",
  insulin:"انسولين", hormone:"هرمون", headache:"صداع", fever:"حمى",
  cough:"سعال", cold:"زكام", flu:"انفلونزا", allergy:"حساسيه",
  asthma:"ربو", diabetes:"سكري", cholesterol:"كوليسترول",
  anemia:"انيميا", inflammation:"التهاب", infection:"عدوى",
  drops:"قطره", cream:"كريم", gel:"جل", ointment:"مرهم",
  syrup:"شراب", tablet:"قرص", capsule:"كبسوله", spray:"بخاخ",
  lotion:"غسول", serum:"سيروم", patch:"لصقه",
};

/**
 * Pre-built Set of all dictionary keys for O(1) membership test.
 * WHY: getDictMatches was doing includes() on result arrays; a Set is faster.
 */
const DICT_AR_KEYS = new Set(Object.keys(MEDICAL_DICT_AR_EN));
const DICT_EN_KEYS = new Set(Object.keys(MEDICAL_DICT_EN_AR));

function getDictMatches(query: string): string[] {
  const normAr = normalise(query);
  const normEn = query.toLowerCase().trim();
  const seen   = new Set<string>();
  const results: string[] = [];

  const push = (v: string | undefined) => {
    if (v && !seen.has(v)) { seen.add(v); results.push(v); }
  };

  if (DICT_AR_KEYS.has(normAr)) push(MEDICAL_DICT_AR_EN[normAr]);
  if (DICT_EN_KEYS.has(normEn)) push(MEDICAL_DICT_EN_AR[normEn]);

  for (const tok of normAr.split(/\s+/)) {
    if (DICT_AR_KEYS.has(tok)) push(MEDICAL_DICT_AR_EN[tok]);
  }
  for (const tok of normEn.split(/\s+/)) {
    if (DICT_EN_KEYS.has(tok)) push(MEDICAL_DICT_EN_AR[tok]);
  }

  return results;
}

// ─── 5. Levenshtein (two-row DP + early exit) ────────────────────────────────

/**
 * Two-row Levenshtein with row-minimum early exit.
 *
 * WHY two rows: the standard DP matrix is O(m×n) space; two rows reduce that
 * to O(min(m,n)).  The row-minimum early exit avoids completing rows whose
 * minimum distance already exceeds maxDist, saving ~40% of work on long strings
 * that clearly don't match.
 */
function levenshtein(a: string, b: string, maxDist: number): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  if (a.length > b.length) { const t = a; a = b; b = t; } // keep a shorter

  let prev = Array.from({ length: a.length + 1 }, (_, i) => i);
  let curr = new Array<number>(a.length + 1);

  for (let i = 1; i <= b.length; i++) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDist) return maxDist + 1;
    [prev, curr] = [curr, prev]; // swap rows without allocation
  }
  return prev[a.length];
}

// ─── 6. Inverted Index + Trie ─────────────────────────────────────────────────

export interface FuzzyIndexable {
  id:       string;
  nameAr?:  string;
  nameEn?:  string;
  category?: string;
  code?:    string;
  barcode?: string;
}

/**
 * In-memory search index combining an inverted token index and a prefix trie.
 *
 * Both structures are built in a single pass over the product array, so the
 * total construction cost is O(P × F × T) where P = products, F = fields per
 * product, T = tokens per field.  For 52K products with ~5 tokens each this
 * is ~260K string operations — fast enough to complete in a worker's INIT
 * without affecting the main thread.
 */
export interface SearchIndex {
  /**
   * token → Set<productId>.  Used for exact-token lookups (O(1) per token).
   * Also covers 3-gram prefix tokens added during build for short-query support.
   */
  readonly invertedIndex: Map<string, Set<string>>;
  /**
   * Prefix trie root.  Used for partial-word (prefix) lookups so that typing
   * "pana" returns all products containing a token starting with "pana".
   */
  readonly trie: TrieNode;
  readonly productCount: number;
}

export interface TrieNode {
  /** Children keyed by single character. */
  children: Map<string, TrieNode>;
  /**
   * Product IDs whose tokens END at or PASS THROUGH this node.
   * We store IDs at every intermediate node so subtree collection is O(result)
   * instead of O(subtree size).
   */
  productIds: Set<string>;
}

function makeTrieNode(): TrieNode {
  return { children: new Map(), productIds: new Set() };
}

function trieInsert(root: TrieNode, token: string, productId: string): void {
  let node = root;
  // Mark every prefix node so prefix queries collect results bottom-up
  for (const ch of token) {
    let child = node.children.get(ch);
    if (!child) { child = makeTrieNode(); node.children.set(ch, child); }
    child.productIds.add(productId);
    node = child;
  }
}

function trieCollect(root: TrieNode, prefix: string): Set<string> {
  let node = root;
  for (const ch of prefix) {
    const child = node.children.get(ch);
    if (!child) return new Set(); // prefix not found — empty result
    node = child;
  }
  // All productIds stored at this node already represent the full subtree
  return node.productIds;
}

/**
 * Build an inverted index + prefix trie from a list of indexable items.
 *
 * Indexing strategy:
 *  1. For every field of every product, tokenise and insert each token.
 *  2. Also insert 3-char prefix tokens ("pan" for "panadol") into the inverted
 *     index so very short queries still produce candidates before the trie
 *     lookup would find them.
 *  3. The trie receives full tokens only — prefix traversal handles short queries.
 *
 * Called once per catalog snapshot inside the worker INIT handler.
 */
export function buildSearchIndex(items: FuzzyIndexable[]): SearchIndex {
  const invertedIndex = new Map<string, Set<string>>();
  const trie          = makeTrieNode();

  const addToken = (token: string, id: string) => {
    if (!token) return;
    // Inverted index — exact token
    let set = invertedIndex.get(token);
    if (!set) { set = new Set(); invertedIndex.set(token, set); }
    set.add(id);

    // Trie — full token (prefix traversal handles partial queries)
    trieInsert(trie, token, id);

    // Inverted index — 3-gram prefix shortcut (avoids trie traversal for short q)
    if (token.length >= 4) {
      const prefix3 = token.slice(0, 3);
      let pset = invertedIndex.get(prefix3);
      if (!pset) { pset = new Set(); invertedIndex.set(prefix3, pset); }
      pset.add(id);
    }
  };

  for (const item of items) {
    const id = item.id;
    for (const raw of [item.nameAr, item.nameEn, item.category, item.code, item.barcode]) {
      if (!raw) continue;
      for (const tok of tokenise(raw)) addToken(tok, id);
      // Also insert phonetic form so cross-script queries hit the index
      const phon = toPhonetic(raw);
      for (const tok of tokenise(phon)) addToken(tok, id);
    }
  }

  return { invertedIndex, trie, productCount: items.length };
}

// Helper to call toPhonetic on a full string (not token-by-token)
function toPhoneticStr(s: string): string {
  const n = normalise(s);
  return HAS_ARABIC.test(n) ? arabicToLatin(n) : n;
}

// Rebuild buildSearchIndex with the correct helper
export function buildSearchIndexImpl(items: FuzzyIndexable[]): SearchIndex {
  const invertedIndex = new Map<string, Set<string>>();
  const trie          = makeTrieNode();

  const addToken = (token: string, id: string) => {
    if (!token) return;
    let set = invertedIndex.get(token);
    if (!set) { set = new Set(); invertedIndex.set(token, set); }
    set.add(id);

    trieInsert(trie, token, id);

    if (token.length >= 4) {
      const prefix3 = token.slice(0, 3);
      let pset = invertedIndex.get(prefix3);
      if (!pset) { pset = new Set(); invertedIndex.set(prefix3, pset); }
      pset.add(id);
    }
  };

  for (const item of items) {
    const id = item.id;
    const fieldValues: string[] = [
      item.nameAr ?? "", item.nameEn ?? "", item.category ?? "",
      item.code ?? "", item.barcode ?? "",
    ];

    for (const raw of fieldValues) {
      if (!raw) continue;
      const norm = normalise(raw);
      for (const tok of tokenise(norm)) addToken(tok, id);
      // Phonetic cross-script: also index Arabic→Latin and Latin→Arabic
      const phon = toPhoneticStr(raw);
      if (phon !== norm) {
        for (const tok of tokenise(phon)) addToken(tok, id);
      }
    }
  }

  return { invertedIndex, trie, productCount: items.length };
}

/**
 * Returns the candidate product ID set for a query using the index.
 *
 * Strategy:
 *  1. Tokenise query (same tokeniser as index build — guaranteed consistency).
 *  2. For each query token, union:
 *     a) invertedIndex exact match (covers full tokens)
 *     b) trieCollect prefix match (covers partial first token as the user types)
 *  3. Also expand via dictionary (medical/pharma terms) and phonetic forms.
 *
 * WHY union not intersection: medical queries like "مسكن صداع" (painkiller
 * headache) should return products matching EITHER term, ranked by how many
 * tokens they match (handled by fuzzyScore after this step).
 *
 * Returns an empty Set (not null) when no index entries match; the caller
 * should fall back to full linear scan in that case.
 */
export function queryIndexCandidates(
  index: SearchIndex,
  query: string,
): Set<string> {
  const { invertedIndex, trie } = index;
  const result = new Set<string>();

  const addFromSet = (s: ReadonlySet<string> | undefined) => {
    if (!s) return;
    for (const id of s) result.add(id);
  };

  const qNorm    = normalise(query);
  const qTokens  = tokenise(qNorm);
  const qPhonetic = toPhoneticStr(query);
  const qPhTokens = tokenise(qPhonetic);

  // Combine unique query token variants
  const allQueryTokens = Array.from(new Set([...qTokens, ...qPhTokens]));

  for (const tok of allQueryTokens) {
    // Exact inverted-index lookup
    addFromSet(invertedIndex.get(tok));
    // Prefix trie lookup (covers partial-word typing)
    addFromSet(trieCollect(trie, tok));
  }

  // Dictionary expansion: "مسكن" → "painkiller" → look up English tokens too
  const dictExpansions = getDictMatches(query);
  for (const expansion of dictExpansions) {
    for (const tok of tokenise(normalise(expansion))) {
      addFromSet(invertedIndex.get(tok));
      addFromSet(trieCollect(trie, tok));
    }
  }

  return result;
}

// ─── 7. Main-thread match cache (LRU, 4096 entries) ─────────────────────────

/**
 * WHY 4096 instead of 2048: with true LRU eviction (instead of bulk .clear())
 * a larger cap doesn't degrade performance — only the single LRU entry is ever
 * evicted, so increasing capacity only helps.
 */
const _matchCache = new LRUCache<string, boolean>(4096);
const _scoreCache = new LRUCache<string, number>(2048);

export function clearFuzzyCache(): void {
  _matchCache.clear();
  _scoreCache.clear();
}

// ─── 8. Public fuzzyMatch / fuzzyScore ───────────────────────────────────────

export interface FuzzySearchableFields {
  nameAr?:   string;
  nameEn?:   string;
  category?: string;
  code?:     string;
  barcode?:  string;
}

/**
 * Returns `true` if `query` matches any of the searchable fields.
 *
 * Results cached by (query + field fingerprint) in the LRU cache.
 * On a cache hit: O(1).  On a miss: O(fields × layers).
 * Cache key separator \x01 prevents collisions with field values.
 */
export function fuzzyMatch(
  query: string,
  fields: FuzzySearchableFields,
): boolean {
  if (!query) return true;
  const raw = query.trim();
  if (!raw) return true;

  const key = _buildCacheKey(raw, fields);
  const cached = _matchCache.get(key);
  if (cached !== undefined) return cached;

  const result = _doMatch(raw, _collectFieldValues(fields));
  _matchCache.set(key, result);
  return result;
}

/**
 * Returns a relevance score in [0, 1].  Call only after fuzzyMatch returns true.
 *
 * Score tiers:
 *   1.00  exact match (normalised)
 *   0.97  phonetic exact
 *   0.92  prefix (starts-with)
 *   0.82  substring
 *   0.75  dictionary cross-language match
 *   0.70  Levenshtein similarity cap
 */
export function fuzzyScore(
  query: string,
  fields: FuzzySearchableFields,
): number {
  if (!query.trim()) return 1;

  const key = _buildCacheKey(query.trim(), fields) + "\x02score";
  const cached = _scoreCache.get(key);
  if (cached !== undefined) return cached;

  const result = _doScore(query, fields);
  _scoreCache.set(key, result);
  return result;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function _buildCacheKey(raw: string, fields: FuzzySearchableFields): string {
  return (
    raw + "\x01" +
    (fields.nameAr  ?? "") + "\x01" +
    (fields.nameEn  ?? "") + "\x01" +
    (fields.category ?? "") + "\x01" +
    (fields.code    ?? "") + "\x01" +
    (fields.barcode ?? "")
  );
}

function _collectFieldValues(fields: FuzzySearchableFields): string[] {
  const out: string[] = [];
  const add = (v: string | undefined) => {
    if (!v) return;
    const n = normalise(v);
    if (n) out.push(n);
  };
  add(fields.nameAr);
  add(fields.nameEn);
  add(fields.category);
  if (fields.code)    out.push(fields.code.toLowerCase().trim());
  if (fields.barcode) out.push(fields.barcode.trim());
  return out;
}

function _doMatch(raw: string, fieldValues: string[]): boolean {
  const qNorm = normalise(raw);
  if (!qNorm) return false;

  // L1: Exact / substring
  for (const fv of fieldValues) {
    if (fv.includes(qNorm) || qNorm.includes(fv)) return true;
  }

  // L2: Medical dictionary
  const dictMatches = getDictMatches(raw);
  for (const dm of dictMatches) {
    const dmNorm = normalise(dm);
    for (const fv of fieldValues) {
      if (fv.includes(dmNorm) || dmNorm.includes(fv)) return true;
    }
  }

  // L3: Phonetic substring
  const qPhonetic = toPhonetic(qNorm);
  for (const fv of fieldValues) {
    const fvPhonetic = toPhonetic(fv);
    if (fvPhonetic.includes(qPhonetic) || qPhonetic.includes(fvPhonetic)) {
      return true;
    }
  }

  // L4: Levenshtein typo tolerance
  const qPhTokens = qPhonetic.split(/\s+/).filter((t) => t.length >= 4);
  if (qPhTokens.length === 0) return false;

  for (const fv of fieldValues) {
    const fvPhonetic = toPhonetic(fv);
    const fvTokens   = fvPhonetic.split(/\s+/).filter((t) => t.length >= 4);
    for (const ft of fvTokens) {
      for (const qt of qPhTokens) {
        const maxDist = Math.floor(Math.max(qt.length, ft.length) * 0.3);
        if (maxDist === 0) continue;
        if (levenshtein(qt, ft, maxDist) <= maxDist) return true;
      }
    }
  }

  return false;
}

function _doScore(query: string, fields: FuzzySearchableFields): number {
  const qNorm     = normalise(query);
  const qPhonetic = toPhoneticStr(query);
  let best = 0;

  const score = (v: string | undefined) => {
    if (!v || best >= 1) return;
    const n = normalise(v);
    if (!n) return;

    if (n === qNorm) { best = 1; return; }

    const np = toPhoneticStr(n);
    if (np === qPhonetic)                        { best = Math.max(best, 0.97); return; }
    if (n.startsWith(qNorm) || np.startsWith(qPhonetic)) { best = Math.max(best, 0.92); return; }
    if (n.includes(qNorm)   || np.includes(qPhonetic))   { best = Math.max(best, 0.82); return; }

    const maxLen = Math.max(qPhonetic.length, np.length);
    if (maxLen > 0) {
      const dist = levenshtein(qPhonetic, np, maxLen);
      best = Math.max(best, (1 - dist / maxLen) * 0.70);
    }
  };

  score(fields.nameAr);
  score(fields.nameEn);
  score(fields.category);
  score(fields.code);
  score(fields.barcode);

  // L2 dictionary boost
  if (best < 0.75) {
    const dictMatches = getDictMatches(query);
    outer: for (const dm of dictMatches) {
      const dmNorm = normalise(dm);
      for (const fv of [fields.nameAr, fields.nameEn, fields.category]) {
        if (!fv) continue;
        const fn = normalise(fv);
        if (fn.includes(dmNorm) || dmNorm.includes(fn)) {
          best = Math.max(best, 0.75);
          break outer;
        }
      }
    }
  }

  return best;
}