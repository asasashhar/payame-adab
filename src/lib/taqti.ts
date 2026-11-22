/**
 * Urdu Taqti (تقطیع) & Behr (بحر) Analysis Engine
 *
 * Rule-based scansion implementing Urdu prosody (عروض) conventions:
 *  - Huroof-e-maddah & long/short vowels; aspirated digraphs as one consonant
 *  - Izafat (ِ) splitting the final syllable into two short syllables
 *  - Nasal closure (ں), hamza glides, silent final ہ
 *  - Classical convention: ہے ہیں کے کی کو نے سے میں بھی یہ وہ کہ نہ تھی scan short
 *  - Syllable assembly on the onset/coda model: a closed syllable (coda
 *    consonants) is always بلند (long); a bare onset before a following
 *    consonant+vowel closes it as long (درد = one long syllable); an onset
 *    immediately followed by a vowel-bearing letter stays کوتاہ (خدا = S L)
 *  - Meter identification against the canonical behr database (arkaan → S/L
 *    chains with their licensed variants), with an alignment that reports the
 *    exact syllables where the line departs from the meter, why, and how to
 *    correct it — honestly, with confidence levels (exact / probable / none).
 */

export type Syl = { text: string; long: boolean };
export type LineScan = { word: string; syllables: Syl[] }[];

import { rhymeTail, tailScore } from "./qafiya";

// ---------- normalization ----------
const IZAFAT = "\u0650";
const DIACRITICS = /[\u064B-\u064F\u0651\u0652-\u0655\u0670\u06D6-\u06ED\u0640]/g;

export function normalizeUrdu(text: string): string {
  return text
    .replace(DIACRITICS, "")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ﮮﯭ]/g, "ی")
    .replace(/ة/g, "ہ")
    .replace(/[”"«»]/g, "")
    .trim();
}

// ---------- special word dictionary ----------
// Classical conventions plus lexical overrides — syllable splits that
// orthography alone cannot decide (cluster choices, ع onset, خw- clusters…)
const SPECIAL: Record<string, string> = {
  "ہے": "S", "ہیں": "S", "ہوں": "S", "کے": "S", "کی": "S", "کو": "S",
  "نے": "S", "سے": "S", "میں": "S", "بھی": "S", "یہ": "S", "وہ": "S",
  "کہ": "S", "نہ": "S", "تھی": "S", "تھے": "S", "بہ": "S",
  "نہیں": "SL", "تھا": "L",
  "غزل": "SL", "دلبر": "LL", "گلزار": "LL", "خواب": "L", "شاعری": "LSL",
  "محبت": "SLL", "دنیا": "LL", "امید": "SLL", "مقام": "LL", "قسمت": "LL",
  "وصال": "LL", "فرصت": "LL", "دوستی": "LL", "جوانی": "SLL", "تنہائی": "SLL",
  "جدائی": "SLL", "منظر": "SLL", "مسافر": "SLL", "خدا": "SL", "ہوا": "SL",
  "دوا": "SL", "صدا": "SL", "گدا": "SL", "وفا": "SL", "دعا": "SL",
  "قضا": "SL", "جفا": "SL", "ادب": "SL", "زندگی": "LSL", "کہانی": "SLL",
  "پانی": "LL", "مگر": "SL", "لیکن": "SSL", "بلکہ": "SSL", "گویا": "SSL",
  "ایسا": "SLL", "جیسا": "SLL", "جہاں": "SL", "جب": "L", "تب": "L",
};

const ASPIRATED = new Set(["ب", "پ", "ت", "ٹ", "ج", "چ", "د", "ڈ", "ک", "گ", "ڑ"]);
const VOWELS = new Set(["ا", "آ", "و", "ی", "ے"]);
const CONSONANTS = new Set(
  "بپتٹثجچحخدڈذرڑزژسشصضطظعغفقکگلمنوںہھهءئ".split("")
);

// unit = phonemic piece with a char span in the original word
type Unit =
  | { k: "c"; c: string; s: number; e: number }            // consonant (onset or coda)
  | { k: "cv"; long: boolean; s: number; e: number; cl: number } // consonant (cl chars) + vowel letters
  | { k: "v"; long: boolean; s: number; e: number };       // standalone vowel

export function tokenizeWord(w: string): Unit[] | null {
  const chars = [...w];
  const units: Unit[] = [];
  let i = 0;
  const at = (n: number) => chars[i + n] ?? "";
  const push = (u: Unit, len: number) => { units.push(u); i += len; };

  while (i < chars.length) {
    const ch = chars[i];
    // aspirated digraph: consonant + ھ (do-chashmi he)
    if (ASPIRATED.has(ch) && at(1) === "ھ") {
      push({ k: "c", c: ch + "ھ", s: i, e: i + 2 }, 2);
      continue;
    }
    if (CONSONANTS.has(ch)) {
      const n1 = at(1);
      // special glide: C + ی + ا/آ  (کیا، لیا) = one long syllable
      if (ch !== "ی" && n1 === "ی" && (at(2) === "ا" || at(2) === "آ")) {
        push({ k: "cv", long: true, s: i, e: i + 3, cl: 1 }, 3);
        continue;
      }
      if (n1 === "آ" || (n1 === "ا" && ch !== "و")) {
        push({ k: "cv", long: true, s: i, e: i + 2, cl: 1 }, 2);
        continue;
      }
      if (n1 === "ا" && ch === "و") {
        // خواب: و = glide w + ā
        push({ k: "cv", long: true, s: i, e: i + 2, cl: 1 }, 2);
        continue;
      }
      if (n1 === "و") {
        const n2 = at(2);
        if (n2 === "ا" || n2 === "آ") {
          // ہوا pattern: consonant short + wā long
          const i0 = i;
          push({ k: "c", c: ch, s: i0, e: i0 + 1 }, 1);
          push({ k: "cv", long: true, s: i0 + 1, e: i0 + 3, cl: 0 }, 2);
          continue;
        }
        if (n2 === "") {
          // تو، لو، ہو: final و = long ū
          push({ k: "cv", long: true, s: i, e: i + 2, cl: 1 }, 2);
          continue;
        }
        if (n2 === "ء" || n2 === "ئ") {
          // کوئی، سوئے: و before hamza = open long syllable (کو-ئی)
          push({ k: "cv", long: true, s: i, e: i + 2, cl: 1 }, 2);
          continue;
        }
        // خدا: و = short u
        push({ k: "cv", long: false, s: i, e: i + 2, cl: 1 }, 2);
        continue;
      }
      if (n1 === "ی") {
        const n2 = at(2);
        if (n2 === "ا" || n2 === "آ") {
          const i0 = i;
          push({ k: "c", c: ch, s: i0, e: i0 + 1 }, 1);
          push({ k: "cv", long: true, s: i0 + 1, e: i0 + 3, cl: 0 }, 2);
          continue;
        }
        if (n2 === "") {
          // final ی = long ī
          push({ k: "cv", long: true, s: i, e: i + 2, cl: 1 }, 2);
          continue;
        }
        // میری: ی = short i
        push({ k: "cv", long: false, s: i, e: i + 2, cl: 1 }, 2);
        continue;
      }
      if (n1 === "ے") {
        // کے، گے: final ے = short e (classical convention)
        push({ k: "cv", long: false, s: i, e: i + 2, cl: 1 }, 2);
        continue;
      }
      if (n1 === "ں") {
        // میں-type: closed long
        push({ k: "cv", long: true, s: i, e: i + 2, cl: 1 }, 2);
        continue;
      }
      if (n1 === "ء" || n1 === "ئ") {
        push({ k: "c", c: ch, s: i, e: i + 1 }, 1);
        push({ k: "c", c: n1, s: i + 1, e: i + 2 }, 1);
        continue;
      }
      push({ k: "c", c: ch, s: i, e: i + 1 }, 1);
      continue;
    }
    if (ch === "آ") {
      push({ k: "v", long: true, s: i, e: i + 1 }, 1);
      continue;
    }
    if (ch === "ا") {
      // word-initial ا = short a (اگر، اثر); after a glide (سوال) = long ā
      push({ k: "v", long: i > 0, s: i, e: i + 1 }, 1);
      continue;
    }
    if (ch === "و") {
      // open-syllable و = long ū/ō (دوستی، اور); closed syllables are long via coda anyway
      push({ k: "v", long: true, s: i, e: i + 1 }, 1);
      continue;
    }
    if (ch === "ی") {
      const n1 = at(1);
      push({ k: "v", long: n1 === "" || n1 === "ں", s: i, e: i + 1 }, 1);
      continue;
    }
    if (ch === "ے") {
      push({ k: "v", long: false, s: i, e: i + 1 }, 1);
      continue;
    }
    if (ch === "ء" || ch === "ئ") {
      push({ k: "c", c: ch, s: i, e: i + 1 }, 1);
      continue;
    }
    if (ch === "ں") {
      // nasal closure – marker only; extends previous unit
      if (units.length) units[units.length - 1].e = i + 1;
      i += 1;
      continue;
    }
    if (ch === "ہ" || ch === "ه") {
      // gol he: closes previous syllable (جگہ، گاہ)
      push({ k: "c", c: "ہ", s: i, e: i + 1 }, 1);
      continue;
    }
    i += 1; // skip unknown
  }
  return units;
}

/**
 * Assemble units into syllables on the Urdu prosody model:
 *  - every vowel unit is a nucleus; the consonant run before it is distributed:
 *    last consonant → onset of that vowel's syllable; earlier consonants belong
 *    to the preceding syllable (as coda when one exists)
 *  - a word-initial consonant run with no preceding vowel forms an implicit
 *    syllable: bare → کوتاہ (خُ، کَ), with coda → بلند (کہ، درد، شرم)
 *  - a cv unit splits into its consonant (run) + vowel letters; a vowel part
 *    that starts with و followed by another vowel (وا، وو) puts the glide و
 *    into the run (دَ-وا، ہُ-وا) — while C+ی+ا glides stay one syllable (کیا)
 *  - trailing consonants merge into the final syllable's coda (استاد → اُس-تاد)
 *  - adjacent vowel units merge into one nucleus (اور)
 */
function assembleSyllables(w: string, units: Unit[]): Syl[] {
  const chars = [...w];
  const VOWEL_LETTERS = new Set(["ا", "آ", "و", "ی", "ے"]);
  type Part = { s: number; e: number; long: boolean };
  const parts: Part[] = [];
  let run: { s: number; e: number }[] = [];
  let pending: { s: number; e: number } | null = null;

  const pushVowel = (vs: number, ve: number, long: boolean) => {
    if (!pending && parts.length && parts[parts.length - 1].e === vs) {
      // adjacent vowels merge into one nucleus (اور، جاؤں)
      parts[parts.length - 1].e = ve;
      parts[parts.length - 1].long = parts[parts.length - 1].long || long;
      return;
    }
    const s = pending ? pending.s : vs;
    parts.push({ s, e: ve, long });
    pending = null;
  };

  /** distribute the consonant run before an upcoming vowel */
  const resolveRunBeforeVowel = () => {
    if (run.length === 0) return;
    const k = run.length;
    if (k === 1) {
      pending = run[0]; // onset of the upcoming vowel (خوش، پانی)
      run = [];
      return;
    }
    if (parts.length > 0 && parts[parts.length - 1].e === run[0].s) {
      // mid-word run right after a vowel: first consonant(s) codas it, last onsets
      const last = parts[parts.length - 1];
      last.e = run[k - 2].e;
      last.long = true;
      pending = run[k - 1];
      run = [];
      return;
    }
    // word-initial run: pairs form closed بلند syllables (زن-، سخ-)， a lone
    // consonant stays کوتاہ (خُ، دَ)， the last consonant onsets the vowel
    let idx = 0;
    while (idx < k - 1) {
      if (idx + 1 <= k - 2) {
        parts.push({ s: run[idx].s, e: run[idx + 1].e, long: true });
        idx += 2;
      } else {
        parts.push({ s: run[idx].s, e: run[idx].e, long: false });
        idx += 1;
      }
    }
    pending = run[k - 1];
    run = [];
  };

  /** word-end consonant run */
  const resolveRunAtEnd = () => {
    if (run.length === 0) return;
    const k = run.length;
    // final gol-hē right after a consonant = its own بلند syllable (ستارہ: رہ)
    if (k >= 2 && chars[chars.length - 1] === "ہ") {
      const rest = run.slice(0, k - 2);
      if (rest.length) {
        if (parts.length) {
          parts[parts.length - 1].e = rest[rest.length - 1].e;
          parts[parts.length - 1].long = true;
        } else {
          parts.push({ s: rest[0].s, e: rest[rest.length - 1].e, long: true });
        }
      }
      parts.push({ s: run[k - 2].s, e: run[k - 1].e, long: true });
      run = [];
      return;
    }
    if (parts.length > 0) {
      // merge the whole run as coda of the last syllable (استاد: تاد)
      parts[parts.length - 1].e = run[k - 1].e;
      parts[parts.length - 1].long = true;
      run = [];
      return;
    }
    // no vowel at all: consonant pairs form closed syllables (دل-بر، در+د)
    let idx = 0;
    while (idx < k) {
      if (idx + 1 < k) {
        parts.push({ s: run[idx].s, e: run[idx + 1].e, long: true });
        idx += 2;
      } else {
        // odd leftover merges into the previous closed syllable (درد، شرم)
        parts[parts.length - 1].e = run[idx].e;
        idx += 1;
      }
    }
    run = [];
  };

  for (let idx = 0; idx < units.length; idx++) {
    const u = units[idx];
    if (u.k === "c") {
      run.push({ s: u.s, e: u.e });
      continue;
    }
    if (u.k === "cv") {
      const cl = u.cl;
      if (cl > 0) run.push({ s: u.s, e: u.s + cl });
      let vs = u.s + cl, ve = u.e;
      // glide و before another vowel (دوا، ہوا) → onset consonant
      if (chars[vs] === "و" && ve - vs >= 2 && VOWEL_LETTERS.has(chars[vs + 1] ?? "")) {
        run.push({ s: vs, e: vs + 1 });
        vs += 1;
      }
      resolveRunBeforeVowel();
      pushVowel(vs, ve, u.long);
      continue;
    }
    // standalone vowel: a و / ی immediately before another vowel is a glide (سوال)
    const nextU = units[idx + 1];
    if ((chars[u.s] === "و" || chars[u.s] === "ی") && nextU && nextU.k === "v") {
      run.push({ s: u.s, e: u.e });
      continue;
    }
    resolveRunBeforeVowel();
    pushVowel(u.s, u.e, u.long);
  }
  resolveRunAtEnd();
  if (pending) {
    if (parts.length) {
      parts[parts.length - 1].e = pending.e;
      parts[parts.length - 1].long = true;
    } else {
      parts.push({ s: pending.s, e: pending.e, long: true });
    }
  }

  return parts.map((p) => ({ text: chars.slice(p.s, p.e).join(""), long: p.long }));
}

/** Scan a single word into syllables. */
export function scanWord(raw: string): Syl[] {
  let w = raw.replace(/[،؟!۔,."':;]/g, "").trim();
  if (!w) return [];

  const izafat = w.includes(IZAFAT);
  w = w.replace(new RegExp(IZAFAT, "g"), "");
  if (!w) return [{ text: raw, long: false }];

  const s = SPECIAL[w];
  if (s && !izafat) {
    return s.split("").map((p) => ({ text: raw, long: p === "L" }));
  }

  const units = tokenizeWord(w);
  if (!units || units.length === 0) return [];

  const syls = assembleSyllables(w, units);

  // izafat: splits the last closed syllable into two short ones
  // (دلِ = di-le : L → S S ; غزلِ = gha-za-le : SL → SSS)
  if (izafat && syls.length > 0) {
    const last = syls[syls.length - 1];
    if (last.long) {
      syls[syls.length - 1] = { text: last.text, long: false };
      syls.push({ text: "ِ" + last.text, long: false });
    } else {
      syls.push({ text: "ِ" + last.text, long: false });
    }
  }
  return syls;
}

/** Scan one misra (line) into word-wise syllables and a flat S/L pattern. */
export function scanLine(line: string): { words: LineScan; pattern: string } {
  const clean = normalizeUrdu(line);
  const words = clean.split(/\s+/).filter(Boolean);
  const scan: LineScan = [];
  let pattern = "";
  for (const w of words) {
    const syls = scanWord(w);
    scan.push({ word: w, syllables: syls });
    pattern += syls.map((s) => (s.long ? "L" : "S")).join("");
  }
  return { words: scan, pattern };
}

// ---------- arkan & behr database (canonical Urdu prosody) ----------
export const ARKAN_PATTERNS: Record<string, string> = {
  "مفاعیلن": "SLLL",   // ma-fā-ʼī-lun
  "فعلاتن": "SLLL",    // fa-lā-tun (hazaj muqta variant, same S/L shape)
  "فاعلاتن": "LSLL",   // fā-ʼi-lā-tun
  "مستفعلن": "LSSL",   // mus-taf-ʼi-lun
  "مفتعلن": "LSSL",    // makhbun form — same S/L chain
  "فعولن": "SLL",      // fa-ʼū-lun
  "فعِلن": "SSL",      // fa-ʼi-lun
  "فعلن": "SSL",       // alias
  "فاعلن": "LSL",      // fā-ʼi-lun
  "مفاعلتن": "SLSL",   // mu-fā-ʼi-la-tun
  "متفاعلن": "SSLL",   // mu-ta-fā-ʼi-lun
  "مفعول": "LLL",      // maf-ʼū-l
  "مفعولن": "LLL",     // alias
  "مفعولات": "LLLS",   // maf-ʼū-lā-t
  "فعْلن": "LL",        // faʼ-lun (mahzuf)
};

export type BehrDef = {
  name: string;
  nameEn: string;
  arkan: string; // display string
  rukns: string[]; // arkan names in order
  variations?: string[][]; // alternative rukn lists
};

export const BEHRS: BehrDef[] = [
  {
    name: "بحرِ طویل", nameEn: "Bahr-e-Taveel",
    arkan: "فاعلاتن فاعلاتن فاعلاتن فاعلن",
    rukns: ["فاعلاتن", "فاعلاتن", "فاعلاتن", "فاعلن"],
    variations: [
      ["فاعلاتن", "فاعلاتن", "فاعلاتن", "فاعلاتن"],
      ["فاعلاتن", "فاعلاتن", "فعْلن", "فاعلن"],
    ],
  },
  {
    name: "بحرِ مدید", nameEn: "Bahr-e-Madid",
    arkan: "فاعلاتن فاعلن فاعلاتن فاعلن",
    rukns: ["فاعلاتن", "فاعلن", "فاعلاتن", "فاعلن"],
    variations: [
      ["فاعلاتن", "فاعلن", "فاعلاتن", "فاعلاتن"],
      ["مفتعلن", "فاعلن", "مفتعلن", "فاعلن"],
    ],
  },
  {
    name: "بحرِ ہزج مثمن سالم", nameEn: "Hazaj Musamman Salim",
    arkan: "مفاعیلن مفاعیلن مفاعیلن مفاعیلن",
    rukns: ["مفاعیلن", "مفاعیلن", "مفاعیلن", "مفاعیلن"],
  },
  {
    name: "بحرِ ہزج مسدس محذوف", nameEn: "Hazaj Musaddas Mahzuf",
    arkan: "مفاعیلن مفاعیلن فعلاتن",
    rukns: ["مفاعیلن", "مفاعیلن", "فعلاتن"],
    variations: [["مفاعیلن", "مفاعیلن", "مفاعیلن"]],
  },
  {
    name: "بحرِ رجز مسدس محذوف", nameEn: "Rajaz Musaddas Mahzuf",
    arkan: "مستفعلن مستفعلن مستفعلن",
    rukns: ["مستفعلن", "مستفعلن", "مستفعلن"],
  },
  {
    name: "بحرِ رمل مثمن سالم", nameEn: "Ramal Musamman Salim",
    arkan: "فاعلاتن فاعلاتن فاعلاتن فاعلاتن",
    rukns: ["فاعلاتن", "فاعلاتن", "فاعلاتن", "فاعلاتن"],
  },
  {
    name: "بحرِ رمل مسدس محذوف مکفوف", nameEn: "Ramal Musaddas Mahzuf Makfuf",
    arkan: "فاعلاتن فاعلن فاعلاتن فاعلن",
    rukns: ["فاعلاتن", "فاعلن", "فاعلاتن", "فاعلن"],
    variations: [["فاعلاتن", "فاعلن", "مفتعلن", "فاعلن"]],
  },
  {
    name: "بحرِ رمل مسدس محذوف", nameEn: "Ramal Musaddas Mahzuf",
    arkan: "فاعلاتن فاعلاتن فاعلن",
    rukns: ["فاعلاتن", "فاعلاتن", "فاعلن"],
  },
  {
    name: "بحرِ سریع مثمن اخرب", nameEn: "Sarie Musamman Akhrab",
    arkan: "مستفعلن فاعلن مستفعلن فاعلن",
    rukns: ["مستفعلن", "فاعلن", "مستفعلن", "فاعلن"],
    variations: [["مستفعلن", "فاعلن", "مفتعلن", "فاعلن"]],
  },
  {
    name: "بحرِ سریع مسدس محذوف", nameEn: "Sarie Musaddas Mahzuf",
    arkan: "مستفعلن فاعلن مستفعلن فعْلن",
    rukns: ["مستفعلن", "فاعلن", "مستفعلن", "فعْلن"],
    variations: [["مفتعلن", "فاعلن", "مفتعلن", "فاعلن"]],
  },
  {
    name: "بحرِ منسرح مسدس محذوف", nameEn: "Munsarih Musaddas Mahzuf",
    arkan: "مستفعلن فاعلن مستفعلن فعلن",
    rukns: ["مستفعلن", "فاعلن", "مستفعلن", "فعلن"],
    variations: [["مستفعلن", "مفعولات", "مستفعلن", "فعْلن"]],
  },
  {
    name: "بحرِ خفیف مثمن", nameEn: "Khafif Musamman",
    arkan: "فاعلاتن مستفعلن فاعلاتن مستفعلن",
    rukns: ["فاعلاتن", "مستفعلن", "فاعلاتن", "مستفعلن"],
  },
  {
    name: "بحرِ خفیف مسدس محذوف", nameEn: "Khafif Musaddas Mahzuf",
    arkan: "فاعلاتن مستفعلن فاعلن",
    rukns: ["فاعلاتن", "مستفعلن", "فاعلن"],
  },
  {
    name: "بحرِ مضاری مثمن اخرب", nameEn: "Muzari Musamman Akhrab",
    arkan: "مفعول مفعول مفعول مفعول",
    rukns: ["مفعول", "مفعول", "مفعول", "مفعول"],
  },
  {
    name: "بحرِ مضاری مسدس مخبون محذوف مکفوف", nameEn: "Muzari Musaddas Makhbun Mahzuf Makfuf",
    arkan: "مفعول فعلن مفعول فعلن",
    rukns: ["مفعول", "فعلن", "مفعول", "فعلن"],
  },
  {
    name: "بحرِ مجتث مسدس مخبون محذوف", nameEn: "Mujtass Musaddas Makhbun Mahzuf",
    arkan: "مفتعلن فاعلاتن مفتعلن فاعلن",
    rukns: ["مفتعلن", "فاعلاتن", "مفتعلن", "فاعلن"],
    variations: [["مستفعلن", "فاعلاتن", "مستفعلن", "فاعلن"]],
  },
  {
    name: "بحرِ وافر مسدس محذوف", nameEn: "Wafir Musaddas Mahzuf",
    arkan: "مفاعلتن مفاعلتن مفاعلتن فعْلن",
    rukns: ["مفاعلتن", "مفاعلتن", "مفاعلتن", "فعْلن"],
    variations: [["مفاعلتن", "مفاعلتن", "مفاعلتن", "مفعولن"]],
  },
  {
    name: "بحرِ کامل مثمن سالم", nameEn: "Kamil Musamman Salim",
    arkan: "متفاعلن متفاعلن متفاعلن متفاعلن",
    rukns: ["متفاعلن", "متفاعلن", "متفاعلن", "متفاعلن"],
    variations: [
      ["متفاعلن", "متفاعلن", "متفاعلن", "مفعولن"],
      ["متفاعلن", "متفاعلن", "متفاعلن", "فعْلن"],
    ],
  },
  {
    name: "بحرِ متقارب مثمن", nameEn: "Mutaqarib Musamman",
    arkan: "فعِلن فعِلن فعِلن فعِلن",
    rukns: ["فعِلن", "فعِلن", "فعِلن", "فعِلن"],
    variations: [
      ["فعِلن", "فعِلن", "فعِلن", "فعْلن"],
      ["فعولن", "فعولن", "فعولن", "فعولن"],
      ["فعولن", "فعولن", "فعولن", "فعْلن"],
    ],
  },
  {
    name: "بحرِ متدارک مثمن اخرب", nameEn: "Mutadarik Musamman Akhrab",
    arkan: "فعِلن فعِلن فعِلن فعِلن (اخرب)",
    rukns: ["فعِلن", "فعِلن", "فعِلن", "فعِلن"],
    variations: [
      ["فعولن", "فعولن", "فعولن", "فعولن"],
      ["فعولن", "فعولن", "فعِلن", "فعِلن"],
    ],
  },
];

export function behrLinePatterns(rukns: string[]): string {
  return rukns.map((r) => ARKAN_PATTERNS[r] ?? "").join("");
}

export function allBehrForms(extra?: { name: string; pattern: string }[]) {
  const forms: { behr: BehrDef; pattern: string }[] = [];
  for (const b of BEHRS) {
    forms.push({ behr: b, pattern: behrLinePatterns(b.rukns) });
    for (const v of b.variations ?? []) {
      forms.push({ behr: b, pattern: behrLinePatterns(v) });
    }
  }
  for (const e of extra ?? []) {
    if (e.pattern) {
      forms.push({
        behr: {
          name: e.name, nameEn: "", arkan: e.pattern, rukns: [],
          variations: [],
        },
        pattern: e.pattern.replace(/[^SL]/g, ""),
      });
    }
  }
  return forms;
}

// ---------- alignment analysis ----------
type Op = { op: "sub" | "ins" | "del"; i: number; j: number };
// a = line pattern, b = meter form; i indexes a, j indexes b
function align(a: string, b: string): { dist: number; ops: Op[] } {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,                                              // delete from line (comi)
        dp[i][j - 1] + 1,                                              // extra in line (zaaid)
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)             // substitution
      );
    }
  }
  const ops: Op[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      if (a[i - 1] !== b[j - 1]) ops.push({ op: "sub", i: i - 1, j: j - 1 });
      i -= 1; j -= 1;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      ops.push({ op: "ins", i: i - 1, j }); // extra syllable in the line (زاائد)
      i -= 1;
    } else {
      ops.push({ op: "del", i, j: j - 1 }); // missing syllable in the line (کمی)
      j -= 1;
    }
  }
  return { dist: dp[m][n], ops };
}

export function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

/** Segment a flat pattern by the rukn sequence of a behr. */
export function segmentRukns(pattern: string, rukns: string[]) {
  const segs: { name: string; pattern: string }[] = [];
  let i = 0;
  for (const r of rukns) {
    const p = ARKAN_PATTERNS[r] ?? "";
    if (!p) break;
    if (i + p.length <= pattern.length) {
      segs.push({ name: r, pattern: pattern.slice(i, i + p.length) });
      i += p.length;
    } else {
      const rest = pattern.slice(i);
      if (rest) segs.push({ name: r + " (محذوف)", pattern: rest });
      i = pattern.length;
      break;
    }
  }
  if (i < pattern.length) segs.push({ name: "زاائد", pattern: pattern.slice(i) });
  return segs;
}

export type TaqtiError = {
  word: string;
  wordIndex: number;
  syllableText: string;
  position: number;
  kind: "sub" | "ins" | "del"; // ins = زاائد ہجہ (extra), del = کمی (missing)
  expected: string; // "بلند" | "کوتاہ" | "+"
  got: string;      // "بلند" | "کوتاہ" | "-"
  note: string;     // Urdu explanation
};

export type LineResult = {
  line: string;
  pattern: string;
  words: { word: string; scan: { text: string; long: boolean }[] }[];
  match: {
    behr: string;
    nameEn: string;
    arkan: string;
    confidence: "exact" | "probable" | "none";
    distance: number;
    segments: { name: string; pattern: string }[];
  } | null;
  errors: TaqtiError[];
  suggestions: string[];
};

export type PoetryCheck = {
  qafiyaOk: boolean | null;
  qafiyaNote: string;
  radif: string | null;
  radifNote: string;
};

export type TaqtiResult = {
  lines: LineResult[];
  verdict: string;
  sameMeter: boolean | null;
  detectedBehr: string | null;
  confidence: "exact" | "probable" | "none";
  poetryCheck: PoetryCheck | null;
};

function buildErrors(
  words: LineScan,
  pattern: string,
  form: string,
  ops: Op[]
): TaqtiError[] {
  // flat syllable index → owning word
  const owner: number[] = [];
  words.forEach((w, wi) => w.syllables.forEach(() => owner.push(wi)));
  const sylText = (k: number) => {
    let n = 0;
    for (const w of words) {
      for (const s of w.syllables) {
        if (n === k) return s.text;
        n++;
      }
    }
    return "";
  };
  const errors: TaqtiError[] = [];
  for (const { op, i, j } of ops) {
    const wi = owner[i] ?? words.length - 1;
    const word = words[wi]?.word ?? "";
    if (op === "sub") {
      const expected = form[j] === "L" ? "بلند" : "کوتاہ";
      const got = pattern[i] === "L" ? "بلند" : "کوتاہ";
      errors.push({
        word, wordIndex: wi,
        syllableText: sylText(i),
        position: i, kind: "sub", expected, got,
        note: `یہاں «${expected}» ہجہ درکار ہے، مگر «${word}» کے مقام پر «${got}» ہجہ آ گیا — وزن یہیں ٹوٹتا ہے۔`,
      });
    } else if (op === "ins") {
      errors.push({
        word, wordIndex: wi,
        syllableText: sylText(i),
        position: i, kind: "ins", expected: "-", got: "زاائد",
        note: `زاائد ہجہ — «${word}» کے مقام پر ایک ہجہ بحر کے سانچے سے زیادہ ہے۔`,
      });
    } else {
      errors.push({
        word, wordIndex: wi,
        syllableText: sylText(Math.max(0, i - 1)),
        position: i, kind: "del", expected: "ہجہ", got: "-",
        note: `کمی — «${word}» کے مقام کے قریب ایک ہجہ بحر کے سانچے کے مطابق کم ہے۔`,
      });
    }
  }
  return errors;
}

function buildSuggestions(errors: TaqtiError[]): string[] {
  if (errors.length === 0) return ["وزن درست ہے — کوئی تبدیلی درکار نہیں۔"];
  const out: string[] = [];
  const sub = errors.filter((e) => e.kind === "sub");
  const ins = errors.filter((e) => e.kind === "ins");
  const del = errors.filter((e) => e.kind === "del");
  for (const e of sub) {
    out.push(
      e.expected === "بلند"
        ? `«${e.word}» کی جگہ کوئی ایسا لفظ رکھیں جو «${e.expected}» ہجہ فراہم کرے (لمبا ہجہ — بند ہجہ یا آ، و، ی، ے جیسے لمبے مصوتے)۔`
        : `«${e.word}» کی جگہ کوئی ایسا لفظ رکھیں جو «${e.expected}» ہجہ فراہم کرے (چھوٹا ہجہ)۔`
    );
  }
  if (ins.length) out.push("کسی زاائد ہجے والے لفظ کو ہلکا کریں — ایک ہجہ حذف کرنے سے مصرع بحر میں آ جائے گا۔");
  if (del.length) out.push("ایک ہجہ شامل کرنے کی ضرورت ہے — کوئی ایسا لفظ بڑھائیں جو کم ہجے والے مقام پر بلندی/کوتاہی پوری کرے۔");
  return out;
}

// ---------- poetry checker: qafiya & radif ----------
function analyzePoetryCheck(rawLines: string[]): PoetryCheck | null {
  if (rawLines.length < 2) return null;
  const w1 = normalizeUrdu(rawLines[0]).replace(/[،؟!۔,."':;]/g, "").split(/\s+/).filter(Boolean);
  const w2 = normalizeUrdu(rawLines[rawLines.length - 1]).replace(/[،؟!۔,."':;]/g, "").split(/\s+/).filter(Boolean);
  if (!w1.length || !w2.length) return null;

  const last1 = w1[w1.length - 1];
  const last2 = w2[w2.length - 1];
  const { rhymeTail, tailScore } = require("./qafiya") as typeof import("./qafiya");

  let radif: string | null = null;
  let qafiya1 = last1, qafiya2 = last2;
  if (last1 === last2 && w1.length >= 2 && w2.length >= 2) {
    radif = last1;
    qafiya1 = w1[w1.length - 2];
    qafiya2 = w2[w2.length - 2];
  }

  const t1 = rhymeTail(qafiya1);
  const t2 = rhymeTail(qafiya2);
  const score = tailScore(t1, t2);
  const qafiyaOk = score >= 2;
  const qafiyaNote = qafiyaOk
    ? `قافیہ منظم ہے — دونوں مصرعے «${qafiya1} / ${qafiya2}» پر ایک ہی قافیے (${t1}) کے ساتھ ختم ہوتے ہیں۔`
    : `قافیے میں بےترتیبی — پہلا مصرع «${qafiya1}» (${t1}) پر اور دوسرا «${qafiya2}» (${t2}) پر ختم ہوتا ہے؛ دونوں کا آخری حروف ایک جیسے نہیں۔`;
  const radifNote = radif
    ? `ردیف «${radif}» — دونوں مصرعوں کے آخر میں ایک ہی لفظ بار بار آیا ہے (درست روایت)۔`
    : "ردیف نہیں ملتی — دونوں مصرعوں کے آخری لفظ مختلف ہیں (قافیہ بذاتِ خود موجود ہے)۔";
  return { qafiyaOk, qafiyaNote, radif, radifNote };
}

// ---------- main analysis ----------
export function analyzeTaqti(
  text: string,
  extraBehrs?: { name: string; pattern: string }[]
): TaqtiResult {
  const rawLines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  const forms = allBehrForms(extraBehrs);
  const lines: LineResult[] = rawLines.map((line) => {
    const { words, pattern } = scanLine(line);
    let best: { behr: BehrDef | null; dist: number; form: string; ops: Op[] } | null = null;
    for (const f of forms) {
      const { dist, ops } = align(pattern, f.pattern);
      if (!best || dist < best.dist) best = { behr: f.behr, dist, form: f.pattern, ops };
    }
    let match: LineResult["match"] = null;
    let errors: TaqtiError[] = [];
    let suggestions: string[] = [];
    if (best && best.behr) {
      const lenDiff = Math.abs(pattern.length - best.form.length);
      let confidence: "exact" | "probable" | "none" = "none";
      if (best.dist === 0) confidence = "exact";
      else if (best.dist <= 2 && lenDiff <= 2) confidence = "probable";
      match = {
        behr: best.behr.name,
        nameEn: best.behr.nameEn,
        arkan: best.behr.arkan,
        confidence,
        distance: best.dist,
        segments:
          confidence !== "none"
            ? segmentRukns(pattern, best.behr.rukns)
            : [],
      };
      if (confidence !== "none") {
        errors = buildErrors(words, pattern, best.form, best.ops);
        suggestions = buildSuggestions(errors);
      }
    }
    return {
      line,
      pattern,
      words: words.map((w) => ({ word: w.word, scan: w.syllables })),
      match,
      errors,
      suggestions,
    };
  });

  const named = lines.map((l) => l.match?.behr ?? "").filter(Boolean);
  const exact = lines.filter((l) => l.match?.confidence === "exact");
  const probable = lines.filter((l) => l.match?.confidence === "probable");

  let detected: string | null = null;
  let confidence: "exact" | "probable" | "none" = "none";
  if (exact.length === lines.length && lines.length > 0) {
    detected = exact[0].match!.behr;
    confidence = "exact";
  } else if (exact.length + probable.length >= Math.max(1, lines.length - 1)) {
    detected = (exact[0] ?? probable[0]).match!.behr;
    confidence = exact.length > 0 ? "exact" : "probable";
  } else if (probable.length > 0) {
    detected = probable[0].match!.behr;
    confidence = "probable";
  }

  const meters = new Set(named);
  const sameMeter = named.length === lines.length ? meters.size === 1 : null;

  let verdict: string;
  if (confidence === "exact") {
    verdict = `تمام مصرعوں کی تقطیع کے مطابق یہ شعر «${detected}» میں ہے۔`;
  } else if (confidence === "probable") {
    verdict = `تقطیع کے نتائج پر غور کرتے ہوئے یہ «${detected}» کے قریب ترین معلوم ہوتا ہے، مگر یقینی تعین ممکن نہیں۔ ہجے کی ادائیگی میں فرق نتیجہ کو بدل سکتا ہے۔`;
  } else {
    verdict = "اس مصرعے کی بحر کی نشاندہی یقینی طور پر ممکن نہیں۔ نیچے ہجائے کوتاہ و بلند کی تفصیل اور نمایاں کردہ غلطیاں دیکھیے۔";
  }
  if (lines.length > 1 && sameMeter === false) {
    verdict += " نوٹ: مصرعوں کے سانچے مختلف معلوم ہوتے ہیں — پہلے مصرعے کی بحر دوسرے سے مطابق نہیں۔";
  }

  const poetryCheck = analyzePoetryCheck(rawLines);
  if (poetryCheck) {
    verdict += " " + poetryCheck.qafiyaNote;
    if (poetryCheck.radif) verdict += " " + poetryCheck.radifNote;
  }

  return { lines, verdict, sameMeter, detectedBehr: detected, confidence, poetryCheck };
}
