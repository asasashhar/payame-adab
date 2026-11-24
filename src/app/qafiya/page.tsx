"use client";

import { useMemo, useState } from "react";
import { SiteHeader } from "@/components/site/header";
import { SiteFooter } from "@/components/site/footer";
import { SectionHeading } from "@/components/site/section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Search, Copy } from "lucide-react";
import { rhymeTail, tailScore } from "@/lib/qafiya";

type QafiyaEntry = {
  id: string; word: string; meaning?: string | null; pattern?: string | null; wazan?: string | null; rhymes: string;
};

type AiRhyme = {
  word: string; meaningUrdu?: string; meaningEnglish?: string; pronunciation?: string;
  rhymeType: "exact" | "approximate"; example?: string;
};

type AiResponse = {
  ok: boolean; source?: "ai" | "cache" | "local" | "none"; word?: string;
  rhymes?: AiRhyme[]; error?: string;
};

export default function QafiyaPage() {
  const [word, setWord] = useState("");
  const [wazan, setWazan] = useState("");
  const [entries, setEntries] = useState<QafiyaEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState("");
  const [searchedWazan, setSearchedWazan] = useState("");

  // اے آئی قافیہ فائنڈر کی حالت
  const [aiWord, setAiWord] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<AiResponse | null>(null);
  const [aiError, setAiError] = useState("");
  const [aiSearched, setAiSearched] = useState("");

  const aiFind = async (e?: React.FormEvent, preset?: string) => {
    e?.preventDefault();
    const q = (preset ?? aiWord).trim();
    if (!q) return;
    if (preset) setAiWord(preset);
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/qafiya/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: q }),
      });
      const data: AiResponse = await res.json().catch(() => ({ ok: false, error: "سروس سے رابطہ نہ ہو سکا" }));
      if (data.ok && (data.rhymes?.length ?? 0) > 0) {
        setAiResult(data);
        setAiSearched(data.word ?? q);
        setAiError("");
      } else {
        setAiResult(null);
        setAiSearched(q);
        setAiError(data.error || "ابھی کوئی تجویز دستیاب نہیں — دوبارہ کوشش کریں");
      }
    } catch {
      setAiResult(null);
      setAiError("سروس سے رابطہ نہ ہو سکا — انٹرنیٹ چیک کر کے دوبارہ کوشش کریں");
    } finally {
      setAiLoading(false);
    }
  };

  // وزن (بحر) سے تلاش: جس گروہ کا wazan اس بحر سے ملتا ہے وہ سب دکھائیں
  const wazanResults = useMemo(() => {
    if (!entries || !searchedWazan) return null;
    const q = searchedWazan.trim();
    return entries.filter((e) => (e.wazan ?? "").includes(q) || e.word === q);
  }, [entries, searchedWazan]);

  const results = useMemo(() => {
    if (!entries || !searched) return null;
    const tail = rhymeTail(searched);
    const scored: { word: string; meaning?: string | null; score: number; group: string }[] = [];
    for (const e of entries) {
      let rhymes: string[] = [];
      try { rhymes = JSON.parse(e.rhymes); } catch {}
      const groupWords = [e.word, ...rhymes];
      for (const w of groupWords) {
        if (!w) continue;
        const s = tailScore(rhymeTail(w), tail);
        if (w !== searched && s >= 2) {
          scored.push({ word: w, meaning: e.meaning, score: s, group: e.word, wazan: e.wazan ?? null });
        }
      }
    }
    scored.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word, "ur"));
    const seen = new Set<string>();
    return { tail, list: scored.filter((x) => !seen.has(x.word) && seen.add(x.word)).slice(0, 36) };
  }, [entries, searched]);

  const find = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!word.trim() && !wazan.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/qafiya");
      const data = await res.json();
      setEntries(data);
      setSearched(word.trim());
      setSearchedWazan(wazan.trim());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="flex-1 paper-bg">
        <div className="mx-auto max-w-4xl px-4 py-10">
          <SectionHeading
            title="قافیہ تلاش"
            subtitle="لفظ لکھیں اور مطابق قافیے حاصل کریں — تلفظ اور قافیے کے سانچے کی بنیاد پر"
          />

          {/* اے آئی قافیہ فائنڈر — AI analyzes poetic pronunciation, returns
              rhymes with meanings, pronunciation, rhyme type and examples */}
          <div className="mt-8 manuscript-frame rounded-xl bg-card p-6 ring-1 ring-gold/40">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gold" />
              <h2 className="font-nastaliq-tight text-2xl leading-10 text-primary">اے آئی قافیہ فائنڈر</h2>
              <Badge className="bg-gold/15 font-nastaliq-tight text-sm text-gold">ذہانی تلاش</Badge>
            </div>
            <p className="mt-1 text-xs font-naskh leading-6 text-muted-foreground">
              کوئی بھی اردو لفظ لکھیں — اے آئی شاعرانہ تلفظ کی بنیاد پر قافیے، ان کے معنی (اردو و انگریزی)، تلفظ اور استعمال کی مثالیں فراہم کرتا ہے۔
            </p>
            <form onSubmit={aiFind} className="mt-4 flex gap-3">
              <Input
                dir="rtl"
                value={aiWord}
                onChange={(e) => setAiWord(e.target.value)}
                placeholder="لفظ لکھیں: یاد، محبت، وفا، چاند…"
                className="h-12 font-nastaliq-tight text-xl text-right"
                aria-label="اے آئی قافیہ تلاش کے لیے لفظ"
              />
              <Button type="submit" disabled={aiLoading} className="h-12 shrink-0 gap-2 bg-gold px-6 font-naskh text-[15px] text-primary hover:bg-gold/90">
                <Sparkles className="h-4.5 w-4.5" /> {aiLoading ? "اے آئی سوچ رہا ہے…" : "قافیہ دریافت کریں"}
              </Button>
            </form>
            <div className="mt-3 flex flex-wrap gap-2">
              {["یاد", "دل", "وفا", "محبت", "چاند", "آنکھ", "زندگی", "خواب"].map((w) => (
                <button
                  key={w}
                  onClick={() => aiFind(undefined, w)}
                  className="rounded-full border border-gold/40 bg-secondary px-3.5 py-1 text-sm font-nastaliq-tight text-primary hover:bg-accent"
                >
                  {w}
                </button>
              ))}
            </div>

            {aiLoading && (
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            )}

            {!aiLoading && aiError && (
              <div className="mt-5 rounded-xl border border-dashed border-gold/40 bg-card p-8 text-center font-naskh text-sm leading-7 text-muted-foreground">
                {aiError}
              </div>
            )}

            {!aiLoading && aiResult && (
              <div className="mt-5">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-naskh text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-gold" />
                  «<span className="font-nastaliq-tight text-lg text-primary">{aiSearched}</span>» کے قافیے
                  <span>({aiResult.rhymes?.length ?? 0} تجاویز)</span>
                  {aiResult.source === "local" && (
                    <span className="text-[11px] text-gold">· اے آئی عارضیاً دستیاب نہیں — مقامی قافیہ ذخیرے سے تجاویز</span>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {aiResult.rhymes?.map((r) => (
                    <div key={r.word} className="manuscript-frame rounded-xl bg-card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(r.word).catch(() => {})}
                          className="font-nastaliq-tight text-2xl leading-10 text-emerald-ink hover:text-primary"
                          title="کاپی کرنے کے لیے کلک کریں"
                        >
                          {r.word}
                        </button>
                        {r.rhymeType === "exact" ? (
                          <Badge className="shrink-0 bg-primary font-nastaliq-tight text-xs text-primary-foreground">مکمل قافیہ</Badge>
                        ) : (
                          <Badge variant="outline" className="shrink-0 border-gold/50 font-nastaliq-tight text-xs text-gold">قریبی قافیہ</Badge>
                        )}
                      </div>
                      {r.meaningUrdu && <p className="mt-1 text-sm font-naskh leading-6 text-foreground/90">معنی: {r.meaningUrdu}</p>}
                      {r.meaningEnglish && <p dir="ltr" className="mt-0.5 text-left text-[11px] font-naskh leading-5 text-muted-foreground">{r.meaningEnglish}</p>}
                      {r.pronunciation && <p dir="ltr" className="mt-0.5 text-left text-[11px] font-naskh italic leading-5 text-primary/80">talfuz: {r.pronunciation}</p>}
                      {r.example && (
                        <p className="mt-2 border-r-2 border-gold/50 pr-2 text-xs font-nastaliq-tight leading-7 text-foreground/75">{r.example}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="manuscript-frame rounded-xl bg-card p-6">
            <form onSubmit={find} className="flex gap-3">
              <Input
                dir="rtl"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="قافیے کے لیے لفظ: دل، چمن، ہستی…"
                className="h-12 font-nastaliq-tight text-xl text-right"
                aria-label="قافیے کے لیے لفظ"
              />
              <Input
                dir="rtl"
                value={wazan}
                onChange={(e) => setWazan(e.target.value)}
                placeholder="وزن/بحر: طویل، رمل…"
                className="h-12 w-44 font-nastaliq-tight text-lg text-right"
                aria-label="وزن سے تلاش"
              />
              <Button type="submit" disabled={loading} className="h-12 shrink-0 gap-2 bg-primary px-6 font-naskh text-[15px] hover:bg-emerald-deep">
                <Search className="h-4.5 w-4.5" /> {loading ? "تلاش…" : "تلاش کریں"}
              </Button>
            </form>

            <div className="mt-4 flex flex-wrap gap-2">
              {["دل", "چمن", "ہستی", "شام", "پیار", "دعا", "کہانی", "بہار"].map((w) => (
                <button
                  key={w}
                  onClick={() => { setWord(w); setEntries(null); setTimeout(() => { setWord(w); }, 0); }}
                  className="rounded-full border border-gold/40 bg-secondary px-3.5 py-1 text-sm font-nastaliq-tight text-primary hover:bg-accent"
                >
                  {w}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          )}

          {wazanResults && !loading && (
            <div className="mt-8">
              <div className="mb-4 flex items-center gap-2 text-sm font-naskh text-muted-foreground">
                <Sparkles className="h-4 w-4 text-gold" />
                وزن «{searchedWazan}» کے قافیے: <span>({wazanResults.length} گروہ)</span>
              </div>
              {wazanResults.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gold/40 bg-card p-10 text-center font-naskh text-sm text-muted-foreground">
                  اس وزن کا کوئی قافیہ گروہ ابھی موجود نہیں — منتظم نئے گروہ شامل کر رہا ہے۔
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {wazanResults.map((e) => (
                    <div key={e.id} className="manuscript-frame rounded-xl bg-card p-4">
                      <p className="font-nastaliq-tight text-xl leading-8 text-emerald-ink">{e.word}</p>
                      {e.wazan && <p className="mt-0.5 text-[11px] font-naskh font-semibold text-gold">وزن: {e.wazan}</p>}
                      {e.meaning && <p className="mt-1 text-xs font-naskh leading-6 text-muted-foreground">{e.meaning}</p>}
                      <p className="mt-1.5 text-[11px] font-naskh text-primary/80">
                        {(JSON.parse(e.rhymes || "[]") as string[]).slice(0, 6).join("، ")}
                        {(JSON.parse(e.rhymes || "[]") as string[]).length > 6 ? "…" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {results && !loading && (
            <div className="mt-8">
              <div className="mb-4 flex items-center gap-2 text-sm font-naskh text-muted-foreground">
                <Sparkles className="h-4 w-4 text-gold" />
                «{searched}» کا قافیہ: <Badge variant="outline" className="border-gold/50 font-nastaliq-tight text-base text-primary">{results.tail}</Badge>
                <span>({results.list.length} تجاویز)</span>
              </div>

              {results.list.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gold/40 bg-card p-10 text-center font-naskh text-sm text-muted-foreground">
                  اس قافیے کے لیے ابھی کوئی تجویز دستیاب نہیں۔ قافیہ ذخیرہ مسلسل بڑھ رہا ہے۔
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {results.list.map((r) => (
                    <button
                      key={r.word}
                      onClick={() => navigator.clipboard.writeText(r.word).catch(() => {})}
                      className="group manuscript-frame flex items-center justify-between gap-2 rounded-xl bg-card px-4 py-3 text-start transition-shadow hover:shadow-md"
                      title="کاپی کرنے کے لیے کلک کریں"
                    >
                      <span>
                        <span className="block font-nastaliq-tight text-xl leading-8 text-emerald-ink">{r.word}</span>
                        {r.meaning && <span className="block truncate text-[11px] font-naskh text-muted-foreground">{r.meaning}</span>}
                      </span>
                      <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {!results && !loading && (
            <div className="mt-8 manuscript-frame rounded-xl bg-card p-8 text-center">
              <p className="font-nastaliq-tight text-lg leading-9 text-foreground/70">
                قافیہ اردو شاعری کی روح ہے۔ اوپر لکھیے اور اپنے کلام کے لیے مناسب قافیے دریافت کیجیے۔
              </p>
              <p className="mt-2 text-xs font-naskh text-muted-foreground">
                تجاویز حروف کی مماثلت نہیں بلکہ آخری ہجے کے تلفظ کی بنیاد پر دی جاتی ہیں۔
              </p>
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
