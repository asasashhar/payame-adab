import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { rhymeTail, tailScore } from "@/lib/qafiya";

/**
 * AI Qafiya Finder (اے آئی قافیہ فائنڈر) — POST /api/qafiya/ai
 *
 * Takes an Urdu word and returns rhyming suggestions judged by Urdu POETIC
 * pronunciation (the rhyming syllable / aakhri haja), not spelling: each item
 * carries the rhyme word, meanings (Urdu + English), pronunciation, the rhyme
 * relationship (exact قافیہ vs approximate قریبی) and a usage example.
 *
 * Responses are cached in the QafiyaAIQuery table (one row per normalized
 * word) so repeat searches are instant and the tool keeps working from cache
 * even when the AI service is unreachable. If no cache exists and the AI
 * call fails, it degrades to the curated QafiyaEntry dictionary with the
 * same tail-scoring the public page uses — the endpoint never hard-fails.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ITEMS = 12;
const AI_TIMEOUT_MS = 45_000;

type Rhyme = {
  word: string;
  meaningUrdu?: string;
  meaningEnglish?: string;
  pronunciation?: string;
  rhymeType: "exact" | "approximate";
  example?: string;
};

const globalForZai = globalThis as unknown as {
  zai: Awaited<ReturnType<typeof import("z-ai-web-dev-sdk").default.create>> | undefined;
};

async function getZai() {
  if (!globalForZai.zai) {
    const { default: ZAI } = await import("z-ai-web-dev-sdk");
    globalForZai.zai = await ZAI.create();
  }
  return globalForZai.zai;
}

/** Normalize an Urdu search word: strip diacritics/tatweel, unify variants. */
function normalizeWord(raw: string): string {
  return [...raw]
    .filter((c) => !/[\u064B-\u0652\u0670\u0640]/.test(c))
    .join("")
    .replace(/[يى]/g, "ی")
    .replace(/[هة]/g, "ہ")
    .replace(/[أإٱ]/g, "ا")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim();
}

const SYSTEM_PROMPT = `You are an Ustad of Urdu poetry (اردو شاعری کے استاد) and an Urdu lexicographer. A poet gives you an Urdu word and you suggest suitable QAFIYA (قافیہ) rhymes for ghazal/nazm use.

Rules of Urdu qafiya you MUST follow:
- Qafiya is judged by the SOUND of the rhyming syllable(s) at the end of the word (aakhri haja — آخری ہجے کا تلفظ), NEVER by spelling alone.
- Urdu poetic pronunciation matters: final ہ is pronounced "a/h", کوئی has a glide, و may be silent in دوا/ہوا, final ے is "e".
- "exact" rhyme (قافیہِ کامل): the rhyming syllable matches in both consonant(s) and vowel sound, e.g. for یاد: شاد، آباد، برباد، فریاد، آزاد، invalidated-spellings like یاد itself must not appear.
- "approximate" rhyme (قریبی قافیہ): same ending vowel family but a differing consonant, usable as weak qafiya (e.g. for دل: جل، بل، کل، دلِ نادان-style usages).
- Do NOT include the searched word itself, its plural/reduplication, or compound words that merely CONTAIN it.
- Prefer words actually used in classical and modern Urdu poetry (Ghalib, Iqbal, Faiz, Mir, Faraz ...).

Respond with ONLY a valid JSON array (no markdown fences, no commentary) of at most 12 objects, exact rhymes first:
[{"word":"شاد","meaningUrdu":"خوش، مطمئن","meaningEnglish":"happy, joyful","pronunciation":"shaad","rhymeType":"exact","example":"غمِ ہجراں میں دل کا ہونا کم نہ ہو — example misra or natural usage phrase in Urdu"}]
- meaningUrdu: short Urdu meaning
- meaningEnglish: English meaning if available ("" otherwise)
- pronunciation: roman-Urdu pronunciation of the rhyme word
- example: a short poetic usage (misra' fragment or phrase) in Urdu; "" if none fits`;

function extractJsonArray(text: string): unknown[] | null {
  if (!text) return null;
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function sanitizeItems(parsed: unknown[], searched: string, tail: string): Rhyme[] {
  const seen = new Set<string>();
  const out: Rhyme[] = [];
  for (const it of parsed) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    const word = typeof o.word === "string" ? normalizeWord(o.word) : "";
    if (!word || word === searched || seen.has(word)) continue;
    const wordTail = rhymeTail(word);
    if (tail && tailScore(wordTail, tail) < 1) continue; // reject non-rhyming noise
    seen.add(word);
    // Deterministic exact/approximate classification from the tail engine
    // (do NOT trust the AI's own label): exact = identical tails, or both
    // tails are the minimal 2-char shape sharing the same final vowel-carrier
    // (خدا/وفا/دعا — the classical single-sakin long-vowel qafiya family).
    const exact =
      wordTail === tail ||
      (wordTail.length === 2 && tail.length === 2 && wordTail.slice(-1) === tail.slice(-1));
    out.push({
      word,
      meaningUrdu: typeof o.meaningUrdu === "string" ? o.meaningUrdu.slice(0, 200) : "",
      meaningEnglish: typeof o.meaningEnglish === "string" ? o.meaningEnglish.slice(0, 160) : "",
      pronunciation: typeof o.pronunciation === "string" ? o.pronunciation.slice(0, 60) : "",
      rhymeType: exact ? "exact" : "approximate",
      example: typeof o.example === "string" ? o.example.slice(0, 300) : "",
    });
    if (out.length >= MAX_ITEMS) break;
  }
  // exact first, then alphabetical by Urdu collation
  out.sort((a, b) => (a.rhymeType === b.rhymeType ? a.word.localeCompare(b.word, "ur") : a.rhymeType === "exact" ? -1 : 1));
  return out;
}

/** Curated-dictionary fallback when the AI is unreachable — same tail scoring as the public page. */
async function localFallback(searched: string, tail: string): Promise<Rhyme[]> {
  const entries = await (db as unknown as {
    qafiyaEntry: { findMany: (q: { select: { word: boolean; meaning: boolean; rhymes: boolean } }) => Promise<{ word: string; meaning: string | null; rhymes: string }[]> };
  }).qafiyaEntry.findMany({ select: { word: true, meaning: true, rhymes: true } });
  const scored: { rhyme: Rhyme; score: number }[] = [];
  const seen = new Set<string>();
  for (const e of entries) {
    let rhymes: string[] = [];
    try { rhymes = JSON.parse(e.rhymes || "[]"); } catch { /* ignore malformed */ }
    for (const w of [e.word, ...rhymes]) {
      const word = normalizeWord(w ?? "");
      if (!word || word === searched || seen.has(word)) continue;
      const score = tailScore(rhymeTail(word), tail);
      // Score 2+ is a solid tail match; score 1 (shared final letter only)
      // is still a real Urdu qafiya when tails are short (دل/جل/بل — the
      // rhyming syllable is the single final consonant), so accept it then.
      const shortTail = tail.length <= 2 && rhymeTail(word).length <= 2;
      if (score < 2 && !(shortTail && score >= 1)) continue;
      seen.add(word);
      scored.push({
        score,
        rhyme: {
          word,
          meaningUrdu: e.meaning ?? "",
          meaningEnglish: "",
          pronunciation: "",
          rhymeType: score >= 3 ? "exact" : "approximate",
          example: "",
        },
      });
    }
  }
  scored.sort((a, b) => b.score - a.score || a.rhyme.word.localeCompare(b.rhyme.word, "ur"));
  return scored.slice(0, MAX_ITEMS).map((s) => s.rhyme);
}

export async function POST(req: NextRequest) {
  let body: { word?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "غلط درخواست" }, { status: 400 });
  }
  const searched = normalizeWord(typeof body.word === "string" ? body.word.slice(0, 40) : "");
  if (!searched) {
    return NextResponse.json({ ok: false, error: "براہِ کرم کوئی اردو لفظ لکھیں" }, { status: 400 });
  }
  const tail = rhymeTail(searched);

  // 1) cache — instant and works offline; labels are recomputed through
  // sanitizeItems so classification always follows the current tail engine
  try {
    const cached = await db.qafiyaAIQuery.findUnique({ where: { word: searched } });
    if (cached) {
      const items = JSON.parse(cached.response) as unknown[];
      const rhymes = Array.isArray(items) ? sanitizeItems(items, searched, tail) : [];
      if (rhymes.length > 0) {
        db.qafiyaAIQuery
          .update({ where: { word: searched }, data: { hits: { increment: 1 } } })
          .catch(() => {});
        return NextResponse.json({ ok: true, source: "cache", word: searched, rhymes });
      }
    }
  } catch {
    /* cache table may not exist yet — fall through to AI */
  }

  // 2) AI
  try {
    const ask = (async () => {
      const zai = await getZai();
      const completion = await zai.chat.completions.create({
        messages: [
          { role: "assistant", content: SYSTEM_PROMPT },
          { role: "user", content: `لفظ: ${searched}\n\nاس لفظ کے مطابق قافیے JSON میں دیں۔` },
        ],
        thinking: { type: "disabled" },
      });
      const text = completion.choices[0]?.message?.content ?? "";
      const parsed = extractJsonArray(text);
      if (!parsed || parsed.length === 0) throw new Error("AI returned no usable JSON");
      return sanitizeItems(parsed, searched, tail);
    })();

    const timeout = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("AI timeout")), AI_TIMEOUT_MS));
    const rhymes = await Promise.race([ask, timeout]);

    if (rhymes.length === 0) throw new Error("AI returned no valid rhymes");
    db.qafiyaAIQuery
      .upsert({
        where: { word: searched },
        create: { word: searched, response: JSON.stringify(rhymes) },
        update: { response: JSON.stringify(rhymes) },
      })
      .catch(() => {});
    return NextResponse.json({ ok: true, source: "ai", word: searched, rhymes });
  } catch (e) {
    console.error("[qafiya-ai] AI path failed for", searched, ":", String(e).slice(0, 300));
    /* fall through to local dictionary */
  }

  // 3) curated dictionary fallback
  try {
    const rhymes = await localFallback(searched, tail);
    if (rhymes.length === 0) {
      return NextResponse.json({
        ok: false,
        source: "none",
        word: searched,
        rhymes: [],
        error: "ابھی کوئی تجویز دستیاب نہیں — قافیہ ذخیرہ بڑھ رہا ہے، کچھ دیر بعد دوبارہ کوشش کریں",
      });
    }
    return NextResponse.json({ ok: true, source: "local", word: searched, rhymes });
  } catch {
    return NextResponse.json(
      { ok: false, source: "none", word: searched, rhymes: [], error: "سروس میں خرابی — تھوڑی دیر بعد دوبارہ کوشش کریں" },
      { status: 500 }
    );
  }
}
