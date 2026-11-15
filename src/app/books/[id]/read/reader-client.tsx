"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, BookOpen, Download, Grid3X3, List, Loader2,
  Maximize, Minus, Plus, X, ZoomIn,
} from "lucide-react";

/**
 * Digital book reader (spec §9): real PDF rendering via pdf.js with a
 * page-flip animation, RTL page order, table of contents (PDF outline when
 * present + page grid), chapter jump, zoom and true fullscreen. The pages
 * come from the uploaded file — nothing here is decorative.
 */

type OutlineItem = { title: string; page: number | null; depth: number };

export function BookReader({
  pdfUrl, title, author, backHref,
}: {
  pdfUrl: string; title: string; author: string; backHref: string;
}) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [flip, setFlip] = useState<"next" | "prev" | null>(null);
  const [showToc, setShowToc] = useState(false);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [rendering, setRendering] = useState(false);

  const docRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pageCache = useRef<Map<number, any>>(new Map());

  /* ---------------- load the document ---------------- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
        const doc = await pdfjs.getDocument({ url: pdfUrl }).promise;
        if (cancelled) { doc.destroy(); return; }
        docRef.current = doc;
        setNumPages(doc.numPages);
        setLoading(false);
        // table of contents: PDF outline resolved to page numbers when available
        try {
          const raw = await doc.getOutline();
          if (raw?.length) {
            const items: OutlineItem[] = [];
            const walk = async (nodes: any[], depth: number) => {
              for (const n of nodes) {
                let page: number | null = null;
                try {
                  const dest = typeof n.dest === "string" ? await doc.getDestination(n.dest) : n.dest;
                  if (Array.isArray(dest) && dest[0]) {
                    const idx = await doc.getPageIndex(dest[0]);
                    page = idx + 1;
                  }
                } catch { /* outline entry without resolvable page */ }
                items.push({ title: String(n.title ?? "—"), page, depth });
                if (n.items?.length && depth < 2) await walk(n.items, depth + 1);
              }
            };
            await walk(raw, 0);
            if (!cancelled) setOutline(items);
          }
        } catch { /* outline is optional */ }
      } catch (e) {
        if (!cancelled) { setError("PDF فائل کھولی نہیں جا سکی"); setLoading(false); }
      }
    })();
    return () => { cancelled = true; docRef.current?.destroy?.(); };
  }, [pdfUrl]);

  /* ---------------- render the current page to canvas ---------------- */
  const renderPage = useCallback(async (n: number) => {
    const doc = docRef.current; const canvas = canvasRef.current;
    if (!doc || !canvas) return;
    setRendering(true);
    try {
      let pdfPage = pageCache.current.get(n);
      if (!pdfPage) {
        pdfPage = await doc.getPage(n);
        pageCache.current.set(n, pdfPage);
        if (pageCache.current.size > 24) pageCache.current.delete(pageCache.current.keys().next().value);
      }
      const base = pdfPage.getViewport({ scale: 1 });
      // measure the stage (the scrollable area), not the shrink-wrapped canvas box
      const stage = canvas.closest(".pea-reader-stage") as HTMLElement | null;
      const stageW = stage ? stage.clientWidth - 28 : 720;
      const stageH = stage ? stage.clientHeight - 28 : 920;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const target = Math.min(2.5, Math.max(0.5, scale));
      // fit page: width respects zoom, height never overflows the stage
      let cssWidth = Math.min(stageW, base.width * target);
      let cssHeight = cssWidth * (base.height / base.width);
      if (cssHeight > stageH) {
        cssHeight = stageH;
        cssWidth = cssHeight * (base.width / base.height);
      }
      const renderScale = (cssWidth / base.width) * dpr;
      const vp = pdfPage.getViewport({ scale: renderScale });
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      canvas.style.width = `${Math.floor(cssWidth)}px`;
      canvas.style.height = `${Math.floor(cssHeight)}px`;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fffdf7";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await pdfPage.render({ canvasContext: ctx, viewport: vp }).promise;
    } catch { /* transient render errors are retried on the next turn */ }
    finally { setRendering(false); }
  }, [scale]);

  useEffect(() => {
    if (numPages) renderPage(page);
  }, [numPages, page, renderPage]);

  // re-render on resize (fit-to-width)
  useEffect(() => {
    if (!numPages) return;
    let t: ReturnType<typeof setTimeout>;
    const onR = () => { clearTimeout(t); t = setTimeout(() => renderPage(page), 250); };
    window.addEventListener("resize", onR);
    return () => { window.removeEventListener("resize", onR); clearTimeout(t); };
  }, [numPages, page, renderPage]);

  /* ---------------- turn pages with the flip animation ---------------- */
  const turn = useCallback(async (dir: "next" | "prev") => {
    setPage((p) => {
      const next = dir === "next" ? Math.min(numPages, p + 1) : Math.max(1, p - 1);
      if (next !== p) {
        setFlip(dir);
        setTimeout(() => setFlip(null), 480);
        sessionStorage.setItem(`pea-reader-${pdfUrl}`, String(next));
      }
      return next;
    });
  }, [numPages, pdfUrl]);

  useEffect(() => {
    const saved = sessionStorage.getItem(`pea-reader-${pdfUrl}`);
    if (saved) setPage(Math.min(Math.max(1, Number(saved) || 1), 9999));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* keyboard: RTL — right arrow goes back, left arrow advances */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight") turn("prev");
      if (e.key === "ArrowLeft") turn("next");
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(2.5, s + 0.15));
      if (e.key === "-") setScale((s) => Math.max(0.5, s - 0.15));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [turn]);

  const fullscreen = () => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };

  const jump = (p: number) => {
    if (p >= 1 && p <= numPages) {
      setPage(p);
      sessionStorage.setItem(`pea-reader-${pdfUrl}`, String(p));
    }
  };

  const flipClass = flip === "next"
    ? "pea-flip-next"
    : flip === "prev" ? "pea-flip-prev" : "";

  const downloadName = useMemo(() => {
    const base = pdfUrl.split("/").pop() || "book.pdf";
    return `${title}-${base}`.replace(/\s+/g, "-");
  }, [pdfUrl, title]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center text-[#e5dfc9]">
        <p className="font-naskh text-lg">{error}</p>
        <Link href={backHref} className="rounded-full bg-[#e2c57c] px-6 py-2 font-naskh text-sm font-semibold text-[#101d38]">واپس</Link>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="flex h-screen flex-col bg-[#1c2431]">
      {/* top bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e2c57c]/25 bg-[#141c29] px-3 py-2.5 text-[#e5dfc9]">
        <div className="flex min-w-0 items-center gap-2">
          <BookOpen className="h-5 w-5 shrink-0 text-[#e2c57c]" />
          <div className="min-w-0">
            <p className="truncate font-nastaliq-tight text-lg leading-8">{title}</p>
            <p className="truncate font-naskh text-[11px] text-[#e5dfc9]/70">{author}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button onClick={() => { setScale((s) => Math.max(0.5, s - 0.15)); }} className="rounded-md p-2 hover:bg-white/10" aria-label="زوم کم"><Minus className="h-4 w-4" /></button>
          <span className="inline-flex items-center gap-1 px-1 font-latin text-xs text-[#e5dfc9]/80" dir="ltr"><ZoomIn className="h-3.5 w-3.5" />{Math.round(scale * 100)}%</span>
          <button onClick={() => { setScale((s) => Math.min(2.5, s + 0.15)); }} className="rounded-md p-2 hover:bg-white/10" aria-label="زوم زیادہ"><Plus className="h-4 w-4" /></button>
          <span className="mx-1 h-4 w-px bg-[#e5dfc9]/25" aria-hidden />
          <button onClick={() => setShowToc((v) => !v)} className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-naskh text-xs hover:bg-white/10 ${showToc ? "bg-white/15" : ""}`}>
            {outline.length ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />} فہرست
          </button>
          <a href={pdfUrl} download={downloadName} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-naskh text-xs hover:bg-white/10">
            <Download className="h-4 w-4" /> PDF
          </a>
          <button onClick={fullscreen} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-naskh text-xs hover:bg-white/10">
            <Maximize className="h-4 w-4" /> فُل اسکرین
          </button>
          <Link href={backHref} className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-naskh text-xs hover:bg-white/10">
            <X className="h-4 w-4" /> بند کریں
          </Link>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* table of contents / page grid */}
        {showToc && (
          <aside className="nice-scroll max-h-[70vh] w-64 shrink-0 overflow-y-auto border-e border-[#e2c57c]/20 bg-[#141c29] p-3 max-lg:absolute max-lg:end-0 max-lg:top-[57px] max-lg:z-30 max-lg:shadow-2xl">
            <p className="mb-2 font-naskh text-xs font-bold text-[#e2c57c]">
              {outline.length ? "فہرستِ مطالب" : "صفحات"}
            </p>
            {outline.length ? (
              <ul className="space-y-0.5">
                {outline.map((o, i) => (
                  <li key={i}>
                    <button
                      onClick={() => { if (o.page) { jump(o.page); setShowToc(false); } }}
                      className={`w-full truncate rounded px-2 py-1.5 text-start font-naskh text-[13px] leading-6 hover:bg-white/10 ${o.page ? "text-[#e5dfc9]" : "text-[#e5dfc9]/50"}`}
                      style={{ paddingInlineStart: 8 + o.depth * 12 }}
                      disabled={!o.page}
                    >
                      {o.title}{o.page ? <span className="ms-1 font-latin text-[10px] text-[#e2c57c]"> — ص {o.page}</span> : null}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => { jump(p); setShowToc(false); }}
                    className={`rounded border px-1 py-2 font-latin text-[11px] ${p === page ? "border-[#e2c57c] bg-[#e2c57c]/15 text-[#e2c57c]" : "border-white/15 text-[#e5dfc9]/80 hover:bg-white/10"}`}
                    dir="ltr"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </aside>
        )}

        {/* stage */}
        <div className="pea-reader-stage relative flex flex-1 items-start justify-center overflow-auto p-4 nice-scroll min-h-0" style={{ perspective: "1600px" }}>
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-24 text-[#e5dfc9]">
              <Loader2 className="h-8 w-8 animate-spin text-[#e2c57c]" />
              <p className="font-naskh text-sm">کتاب کھولی جا رہی ہے…</p>
            </div>
          ) : (
            <div className={`pea-reader-page relative mx-auto rounded-lg bg-[#fffdf7] shadow-2xl transition-shadow ${flipClass}`}>
              <canvas ref={canvasRef} className="block max-w-full" />
              {rendering && <div className="absolute inset-0 flex items-center justify-center bg-white/40"><Loader2 className="h-6 w-6 animate-spin text-[#8a6d1a]" /></div>}
              {/* click zones: RTL — right third = previous, left third = next */}
              <button aria-label="پچھلا صفحہ" onClick={() => turn("prev")} className="absolute inset-y-0 end-0 w-1/4 cursor-w-resize opacity-0" />
              <button aria-label="اگلا صفحہ" onClick={() => turn("next")} className="absolute inset-y-0 start-0 w-1/4 cursor-e-resize opacity-0" />
            </div>
          )}
        </div>
      </div>

      {/* bottom bar */}
      <div className="flex items-center justify-between gap-3 border-t border-[#e2c57c]/25 bg-[#141c29] px-4 py-2.5 text-[#e5dfc9]">
        {/* RTL: the "next" control sits at the start (right) side */}
        <button onClick={() => turn("next")} disabled={page >= numPages} className="inline-flex items-center gap-1.5 rounded-full bg-[#e2c57c] px-4 py-2 font-naskh text-sm font-semibold text-[#101d38] disabled:opacity-40">
          اگلا صفحہ <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 font-latin text-sm" dir="ltr">
          <input
            type="number" min={1} max={numPages} value={page}
            onChange={(e) => jump(Number(e.target.value))}
            className="w-16 rounded border border-[#e5dfc9]/30 bg-[#1c2431] px-2 py-1 text-center"
            aria-label="صفحہ نمبر"
          />
          <span className="text-[#e5dfc9]/70">/ {numPages || "…"}</span>
        </div>
        <button onClick={() => turn("prev")} disabled={page <= 1} className="inline-flex items-center gap-1.5 rounded-full border border-[#e5dfc9]/40 px-4 py-2 font-naskh text-sm disabled:opacity-40">
          <ArrowRight className="h-4 w-4" /> پچھلا صفحہ
        </button>
      </div>
    </div>
  );
}
