import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { BookReader } from "./reader-client";
import { FileQuestion } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "مطالعہ" };

export default async function BookReadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const book = await db.book.findUnique({ where: { id } });
  if (!book) notFound();

  return (
    <div className="flex min-h-screen flex-col bg-[#1c2431]">
      <main className="flex-1">
        {book.pdfUrl ? (
          <BookReader
            pdfUrl={book.pdfUrl}
            title={book.title}
            author={book.author}
            backHref={`/books/${book.id}`}
          />
        ) : (
          <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center text-[#e5dfc9]">
            <FileQuestion className="h-14 w-14 text-[#e2c57c]" />
            <h1 className="font-nastaliq-tight text-2xl leading-[1.9]">اس کتاب کی ڈیجیٹل فائل ابھی اپلوڈ نہیں ہوئی</h1>
            <p className="font-naskh text-sm leading-7 text-[#e5dfc9]/80">
              ایڈمن پینل → کتب خانہ میں جا کر «ڈیجیٹل ایڈیشن (PDF)» اپلوڈ کریں — پھر یہ قاری فوراً دستیاب ہو جائے گا۔
            </p>
            <Link href={`/books/${book.id}`} className="rounded-full bg-[#e2c57c] px-6 py-2 font-naskh text-sm font-semibold text-[#101d38]">
              کتاب کی تفصیل پر واپس
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

