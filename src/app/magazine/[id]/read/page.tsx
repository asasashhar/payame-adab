import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BookReader } from "@/app/books/[id]/read/reader-client";
import { FileQuestion } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "شمارہ مطالعہ" };

/** Online reading view for a magazine issue — same real PDF reader as books. */
export default async function MagazineReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const issue = await db.magazineIssue.findUnique({ where: { id } });
  if (!issue || !issue.published) notFound();

  return (
    <div className="min-h-screen bg-[#1c2431]">
      {issue.pdfUrl ? (
        <>
          <h1 className="sr-only">شمارہ — مطالعہ</h1>
          <BookReader
            pdfUrl={issue.pdfUrl}
            title={`شمارہ ${issue.issueNumber} — ${issue.title}`}
            author={issue.theme ?? "پیامِ ادب"}
            backHref={`/magazine/${issue.id}`}
          />
        </>
      ) : (
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center text-[#e5dfc9]">
          <FileQuestion className="h-14 w-14 text-[#e2c57c]" />
          <h1 className="font-nastaliq-tight text-2xl leading-[1.9]">اس شمارے کی PDF فائل ابھی اپلوڈ نہیں ہوئی</h1>
          <p className="font-naskh text-sm leading-7 text-[#e5dfc9]/80">
            ایڈمن پینل → ادبی رسالے میں جا کر مکمل شمارہ (PDF) اپلوڈ کریں۔
          </p>
          <Link href={`/magazine/${issue.id}`} className="rounded-full bg-[#e2c57c] px-6 py-2 font-naskh text-sm font-semibold text-[#101d38]">
            شمارے کی تفصیل پر واپس
          </Link>
        </div>
      )}
    </div>
  );
}
