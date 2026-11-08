import Link from "next/link";
import { BookOpen, Eye, Feather, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_URDU } from "@/lib/site";

export type PoemItem = {
  id: string; title: string; content: string; category: string;
  poetName?: string | null; user?: { id: string; name: string; penName: string | null } | null;
  views?: number; createdAt?: string | Date; coverUrl?: string | null; topicImageUrl?: string | null;
};
export type ArticleItem = {
  id: string; title: string; excerpt?: string | null; content: string; category: string;
  authorName?: string | null; views?: number; createdAt?: string | Date;
  coverUrl?: string | null; topicImageUrl?: string | null;
};
export type BookItem = {
  id: string; title: string; author: string; category: string;
  description?: string | null; coverUrl?: string | null; year?: string | null; views?: number;
};

/** First 2 couplets / first lines of a poem for previews. */
export function poemPreview(content: string, lines = 2): string {
  const couplets = content.split(/\n\s*\n/).filter(Boolean);
  if (couplets.length > 1) return couplets.slice(0, lines).join("\n");
  const ls = content.split(/\n/).filter(Boolean);
  return ls.slice(0, lines * 2 + 1).join("\n");
}

export function excerptPreview(text: string, words = 42): string {
  const clean = (text ?? "").replace(/[#*_>]/g, "").replace(/\s+/g, " ").trim();
  const parts = clean.split(" ");
  return parts.length > words ? parts.slice(0, words).join(" ") + "…" : clean;
}

export function authorLabel(item: PoemItem | ArticleItem): string {
  if ("poetName" in item && item.poetName) return item.poetName;
  if ("authorName" in item && item.authorName) return item.authorName;
  if ("user" in item && item.user) return item.user.penName || item.user.name;
  return "گمنام";
}

function authorHref(item: PoemItem | ArticleItem): string {
  const pid = "poetId" in item ? (item as { poetId?: string }).poetId : undefined;
  return pid ? `/poets/${pid}` : `/search?q=${encodeURIComponent(authorLabel(item))}`;
}

/** Small circular author avatar with the name beside it (reference-card anatomy). */
function AuthorLine({
  label, href, views, showViews, badgePrefix,
}: {
  label: string; href: string; views?: number; showViews?: boolean; badgePrefix?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/50 bg-secondary font-nastaliq-tight text-base text-[color:var(--accent-text)]">
        {(label ?? "?").trim().charAt(0)}
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        {badgePrefix && <span className="block text-[10px] font-naskh text-muted-foreground">{badgePrefix}</span>}
        <Link
          href={href}
          className="block truncate text-[13.5px] font-naskh font-semibold text-[color:var(--accent-text)] hover:underline"
        >
          {label}
        </Link>
      </span>
      {showViews && (
        <span className="inline-flex shrink-0 items-center gap-1 font-latin text-[11px] text-muted-foreground" dir="ltr">
          <Eye className="h-3.5 w-3.5" /> {views ?? 0}
        </span>
      )}
    </div>
  );
}

/**
 * Poetry card (reference anatomy): image panel with the opening couplet set
 * over it like calligraphy artwork, title below, then the poet avatar row.
 */
export function PoemCard({ poem, badge, showViews = true }: { poem: PoemItem; badge?: string; showViews?: boolean }) {
  const cover = poem.coverUrl || poem.topicImageUrl;
  const verse = poemPreview(poem.content, 1);
  return (
    <article className="group manuscript-frame flex h-full flex-col overflow-hidden rounded-xl bg-card transition-shadow hover:shadow-lg">
      <Link href={`/poetry/${poem.id}`} className="relative block">
        {cover ? (
          <>
            <img src={cover} alt={poem.title} className="h-52 w-full object-cover" loading="lazy" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5" aria-hidden />
            <span className="absolute inset-x-4 bottom-3 line-clamp-2 whitespace-pre-line text-center font-nastaliq text-[13.5px] leading-7 text-white/95 drop-shadow-md">
              {verse}
            </span>
          </>
        ) : (
          <span className="flex h-52 w-full flex-col items-center justify-center gap-2 pattern-emerald px-5 text-center">
            <Feather className="h-5 w-5 text-[#e9cf8e]/80" />
            <span className="line-clamp-3 whitespace-pre-line font-nastaliq text-[15px] leading-8 text-[#f3ead2]">
              {verse}
            </span>
          </span>
        )}
        <span className="absolute start-2 top-2 rounded-full bg-primary/90 px-2.5 py-0.5 text-[11px] font-naskh text-[#f3ead2]">
          {badge || poem.category}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/poetry/${poem.id}`}>
          <h3 className="line-clamp-2 font-nastaliq-tight text-lg leading-8 text-foreground transition-colors group-hover:text-[color:var(--accent-text-hover)]">
            {poem.title}
          </h3>
        </Link>
        <div className="mt-2.5 flex-1">
          <AuthorLine
            label={authorLabel(poem)}
            href={authorHref(poem)}
            views={poem.views}
            showViews={showViews}
          />
        </div>
        <Link
          href={`/poetry/${poem.id}`}
          className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gold/40 py-1.5 text-[12.5px] font-naskh font-semibold text-[color:var(--accent-text)] transition-colors hover:bg-gold/15"
        >
          مزید پڑھیں <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

export function ArticleCard({ article, badge, showViews = true }: { article: ArticleItem; badge?: string; showViews?: boolean }) {
  return (
    <article className="group manuscript-frame flex h-full flex-col overflow-hidden rounded-xl bg-card transition-shadow hover:shadow-lg">
      <Link href={`/articles/${article.id}`} className="relative block">
        {article.coverUrl || article.topicImageUrl ? (
          <img
            src={(article.coverUrl || article.topicImageUrl)!}
            alt={article.title}
            className="h-44 w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="flex h-44 w-full items-center justify-center bg-secondary">
            <BookOpen className="h-8 w-8 text-gold" />
          </span>
        )}
        <span className="absolute start-2 top-2 rounded-full bg-primary/90 px-2.5 py-0.5 text-[11px] font-naskh text-[#f3ead2]">
          {badge || article.category}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/articles/${article.id}`}>
          <h3 className="line-clamp-2 font-nastaliq-tight text-lg leading-8 text-foreground transition-colors group-hover:text-[color:var(--accent-text-hover)]">
            {article.title}
          </h3>
        </Link>
        <p className="mt-1.5 flex-1 text-[14px] leading-7 text-foreground/70 font-naskh line-clamp-2">
          {excerptPreview(article.excerpt || article.content)}
        </p>
        <div className="mt-2.5">
          <AuthorLine
            label={authorLabel(article)}
            href={`/search?q=${encodeURIComponent(authorLabel(article))}`}
            views={article.views}
            showViews={showViews}
            badgePrefix="از قلم"
          />
        </div>
        <Link
          href={`/articles/${article.id}`}
          className="mt-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-gold/40 py-1.5 text-[12.5px] font-naskh font-semibold text-[color:var(--accent-text)] transition-colors hover:bg-gold/15"
        >
          مزید پڑھیں <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}

export function BookCard({ book, showViews = true }: { book: BookItem; showViews?: boolean }) {
  return (
    <article className="group manuscript-frame flex h-full flex-col overflow-hidden rounded-xl bg-card transition-shadow hover:shadow-lg">
      <Link href={`/books/${book.id}`} className="relative block">
        {book.coverUrl ? (
          <img src={book.coverUrl} alt={book.title} className="h-52 w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex h-52 w-full items-center justify-center bg-secondary">
            <BookOpen className="h-9 w-9 text-gold" />
          </span>
        )}
        <span className="absolute start-2 top-2 rounded-full bg-primary/90 px-2.5 py-0.5 text-[11px] font-naskh text-[#f3ead2]">
          {book.category}
        </span>
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <Link href={`/books/${book.id}`}>
          <h3 className="line-clamp-1 font-nastaliq-tight text-lg leading-8 text-foreground transition-colors group-hover:text-[color:var(--accent-text-hover)]">
            {book.title}
          </h3>
        </Link>
        <p className="text-[13px] font-naskh text-gold">بہ قلم: {book.author}</p>
        <p className="mt-1.5 flex-1 text-[14px] leading-7 text-foreground/70 font-naskh line-clamp-2">
          {excerptPreview(book.description ?? "", 26)}
        </p>
        {book.year && (
          <p className="mt-1 text-[11px] font-latin text-muted-foreground" dir="ltr">{book.year}</p>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-gold/20 pt-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-[13px] font-naskh font-semibold text-primary-foreground transition-colors group-hover:bg-emerald-deep">
            کتاب پڑھیں <ArrowLeft className="h-3.5 w-3.5" />
          </span>
          {showViews && (
            <span className="inline-flex items-center gap-1 font-latin text-xs text-muted-foreground">
              <Eye className="h-3.5 w-3.5" /> {book.views ?? 0}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export function PosterCard({
  title, description, posterUrl, meta, resultNote,
}: {
  title: string; description: string; posterUrl?: string | null;
  meta?: React.ReactNode; resultNote?: string | null;
}) {
  return (
    <article className="group manuscript-frame flex h-full flex-col overflow-hidden rounded-xl bg-card transition-shadow hover:shadow-lg">
      <div className="relative">
        {posterUrl ? (
          <img src={posterUrl} alt={title} className="h-64 w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-64 w-full flex-col items-center justify-center gap-2 pattern-emerald text-center">
            <Feather className="h-8 w-8 text-[#e2c57c]" />
            <p className="px-6 font-nastaliq-tight text-xl leading-8 text-[#f3ead2]">{title}</p>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-nastaliq-tight text-xl leading-9 text-foreground">{title}</h3>
        <p className="mt-1 flex-1 text-[15px] leading-8 text-foreground/75 font-naskh line-clamp-3">
          {excerptPreview(description, 28)}
        </p>
        {meta && <div className="mt-3 text-xs text-muted-foreground">{meta}</div>}
        {resultNote && (
          <p className="mt-2 rounded-md bg-accent px-3 py-2 text-xs font-naskh text-primary">{resultNote}</p>
        )}
      </div>
    </article>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    DRAFT: "bg-muted text-muted-foreground",
    PENDING: "bg-[#fdf3d7] text-[#8a6d1a]",
    REVISION: "bg-[#fde8cf] text-[#9a5b1f]",
    APPROVED: "bg-[#e3f0e6] text-[#2f6d46]",
    PUBLISHED: "bg-[#24558e]/25 text-[#c9dcf5]",
    REJECTED: "bg-[#fbe4e4] text-[#a03333]",
    SCHEDULED: "bg-[#e4ecfb] text-[#2a4d8f]",
    ARCHIVED: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-naskh", styles[status] ?? "bg-muted")}>
      {STATUS_URDU[status] ?? status}
    </span>
  );
}
