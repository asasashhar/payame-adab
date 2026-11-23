/**
 * Boot-time database schema healer — GENERATED FILE, do not edit by hand.
 * Source of truth: prisma/schema.prisma, transformed by
 * scripts/build-schema-ensure.js (re-run it after schema changes).
 *
 * Deployments can point the app at a database (Turso/libSQL) whose schema
 * predates the current Prisma schema: missing tables/columns make every
 * Prisma query over them throw, so whole pages return 500 while unrelated
 * tables keep working. ensureSchema() applies ONLY the missing pieces with
 * idempotent DDL (CREATE TABLE IF NOT EXISTS, guarded ADD COLUMN) through a
 * direct @libsql/client connection — zero writes when the schema is current,
 * a handful of fast statements when it drifted.
 *
 * Local SQLite deployments (no TURSO_DATABASE_URL) are managed with
 * `prisma db push` and are skipped here.
 */

const SCHEMA_SQL = `CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "penName" TEXT,
    "bio" TEXT,
    "photoUrl" TEXT,
    "role" TEXT NOT NULL DEFAULT 'USER',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "emailVerified" BOOLEAN NOT NULL DEFAULT true,
    "verifyToken" TEXT,
    "verifyTokenExpiry" DATETIME,
    "permissions" TEXT NOT NULL DEFAULT '*',
    "lastLoginAt" DATETIME,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "resetToken" TEXT,
    "resetTokenExpiry" DATETIME,
    "resetAttempts" INTEGER NOT NULL DEFAULT 0,
    "resetRequestedAt" DATETIME,
    "socials" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Poem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'غزل',
    "poetName" TEXT,
    "poetId" TEXT,
    "userId" TEXT,
    "coverUrl" TEXT,
    "topicImageUrl" TEXT,
    "tags" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME,
    "publishAt" DATETIME,
    CONSTRAINT "Poem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Poet" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "takhallus" TEXT,
    "photoUrl" TEXT,
    "bio" TEXT,
    "era" TEXT,
    "style" TEXT,
    "works" TEXT,
    "awards" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'ادبی مضامین',
    "authorName" TEXT,
    "userId" TEXT,
    "coverUrl" TEXT,
    "topicImageUrl" TEXT,
    "tags" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME,
    "publishAt" DATETIME,
    CONSTRAINT "Article_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "News" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "sourceName" TEXT,
    "category" TEXT NOT NULL DEFAULT 'ادبی خبریں',
    "authorName" TEXT,
    "userId" TEXT,
    "coverUrl" TEXT,
    "topicImageUrl" TEXT,
    "tags" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "publishedAt" DATETIME,
    "publishAt" DATETIME,
    CONSTRAINT "News_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT,
    "guestName" TEXT,
    "guestEmail" TEXT,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "Like" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "userId" TEXT,
    "visitorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Like_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "PageView" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "path" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "visitorId" TEXT,
    "referrer" TEXT,
    "day" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "DeletedItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "deletedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Book" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "translator" TEXT,
    "category" TEXT NOT NULL DEFAULT 'شاعری',
    "description" TEXT,
    "coverUrl" TEXT,
    "pdfUrl" TEXT,
    "year" TEXT,
    "pages" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "MagazineIssue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "issueNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "theme" TEXT,
    "coverUrl" TEXT,
    "editorial" TEXT,
    "pdfUrl" TEXT,
    "toc" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "archive" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'SUGGESTION',
    "name" TEXT,
    "email" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "pageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "NewspaperEdition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "editionNumber" TEXT,
    "weekLabel" TEXT,
    "pdfUrl" TEXT NOT NULL,
    "coverUrl" TEXT,
    "notes" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "WordOfDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "word" TEXT NOT NULL,
    "meaning" TEXT NOT NULL,
    "englishMeaning" TEXT,
    "synonyms" TEXT,
    "antonyms" TEXT,
    "example" TEXT,
    "usage" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "date" DATETIME
);

CREATE TABLE "DailySher" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "poetName" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "date" DATETIME
);

CREATE TABLE "Competition" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rules" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "posterUrl" TEXT,
    "posterSize" TEXT NOT NULL DEFAULT 'A4 عمودی (2480×3508 پکسل، 300 DPI)',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "resultNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME,
    "time" TEXT,
    "venue" TEXT,
    "eventType" TEXT NOT NULL DEFAULT 'مشاعرہ',
    "posterUrl" TEXT,
    "posterSize" TEXT NOT NULL DEFAULT 'A4 زمینی (3508×2480 پکسل، 300 DPI)',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Banner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "position" TEXT NOT NULL DEFAULT 'SIDE',
    "recommendedSize" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "QafiyaEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "word" TEXT NOT NULL,
    "meaning" TEXT,
    "pattern" TEXT,
    "wazan" TEXT,
    "notes" TEXT,
    "rhymes" TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE "Behr" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "arkan" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "example" TEXT,
    "notes" TEXT
);

CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

CREATE TABLE "Advertisement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "linkUrl" TEXT,
    "slot" TEXT NOT NULL DEFAULT 'LEFT',
    "width" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "MailLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "bodyHtml" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" DATETIME
);

CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "actorEmail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Memory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "date" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");



-- AddColumn (guarded at runtime; only missing columns are applied)
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN "name" TEXT;
ALTER TABLE "User" ADD COLUMN "penName" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT;
ALTER TABLE "User" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "verifyToken" TEXT;
ALTER TABLE "User" ADD COLUMN "verifyTokenExpiry" DATETIME;
ALTER TABLE "User" ADD COLUMN "permissions" TEXT NOT NULL DEFAULT '*';
ALTER TABLE "User" ADD COLUMN "lastLoginAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "resetToken" TEXT;
ALTER TABLE "User" ADD COLUMN "resetTokenExpiry" DATETIME;
ALTER TABLE "User" ADD COLUMN "resetAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "resetRequestedAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "socials" TEXT;
ALTER TABLE "User" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "updatedAt" DATETIME;
ALTER TABLE "Poem" ADD COLUMN "title" TEXT;
ALTER TABLE "Poem" ADD COLUMN "content" TEXT;
ALTER TABLE "Poem" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'غزل';
ALTER TABLE "Poem" ADD COLUMN "poetName" TEXT;
ALTER TABLE "Poem" ADD COLUMN "poetId" TEXT;
ALTER TABLE "Poem" ADD COLUMN "userId" TEXT;
ALTER TABLE "Poem" ADD COLUMN "coverUrl" TEXT;
ALTER TABLE "Poem" ADD COLUMN "topicImageUrl" TEXT;
ALTER TABLE "Poem" ADD COLUMN "tags" TEXT;
ALTER TABLE "Poem" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Poem" ADD COLUMN "feedback" TEXT;
ALTER TABLE "Poem" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Poem" ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Poem" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "Poem" ADD COLUMN "updatedAt" DATETIME;
ALTER TABLE "Poem" ADD COLUMN "publishedAt" DATETIME;
ALTER TABLE "Poem" ADD COLUMN "publishAt" DATETIME;
ALTER TABLE "Poet" ADD COLUMN "name" TEXT;
ALTER TABLE "Poet" ADD COLUMN "takhallus" TEXT;
ALTER TABLE "Poet" ADD COLUMN "photoUrl" TEXT;
ALTER TABLE "Poet" ADD COLUMN "bio" TEXT;
ALTER TABLE "Poet" ADD COLUMN "era" TEXT;
ALTER TABLE "Poet" ADD COLUMN "style" TEXT;
ALTER TABLE "Poet" ADD COLUMN "works" TEXT;
ALTER TABLE "Poet" ADD COLUMN "awards" TEXT;
ALTER TABLE "Poet" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Poet" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "Article" ADD COLUMN "title" TEXT;
ALTER TABLE "Article" ADD COLUMN "excerpt" TEXT;
ALTER TABLE "Article" ADD COLUMN "content" TEXT;
ALTER TABLE "Article" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'ادبی مضامین';
ALTER TABLE "Article" ADD COLUMN "authorName" TEXT;
ALTER TABLE "Article" ADD COLUMN "userId" TEXT;
ALTER TABLE "Article" ADD COLUMN "coverUrl" TEXT;
ALTER TABLE "Article" ADD COLUMN "topicImageUrl" TEXT;
ALTER TABLE "Article" ADD COLUMN "tags" TEXT;
ALTER TABLE "Article" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Article" ADD COLUMN "feedback" TEXT;
ALTER TABLE "Article" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Article" ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Article" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "Article" ADD COLUMN "updatedAt" DATETIME;
ALTER TABLE "Article" ADD COLUMN "publishedAt" DATETIME;
ALTER TABLE "Article" ADD COLUMN "publishAt" DATETIME;
ALTER TABLE "News" ADD COLUMN "title" TEXT;
ALTER TABLE "News" ADD COLUMN "excerpt" TEXT;
ALTER TABLE "News" ADD COLUMN "content" TEXT;
ALTER TABLE "News" ADD COLUMN "sourceName" TEXT;
ALTER TABLE "News" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'ادبی خبریں';
ALTER TABLE "News" ADD COLUMN "authorName" TEXT;
ALTER TABLE "News" ADD COLUMN "userId" TEXT;
ALTER TABLE "News" ADD COLUMN "coverUrl" TEXT;
ALTER TABLE "News" ADD COLUMN "topicImageUrl" TEXT;
ALTER TABLE "News" ADD COLUMN "tags" TEXT;
ALTER TABLE "News" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "News" ADD COLUMN "feedback" TEXT;
ALTER TABLE "News" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "News" ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "News" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "News" ADD COLUMN "updatedAt" DATETIME;
ALTER TABLE "News" ADD COLUMN "publishedAt" DATETIME;
ALTER TABLE "News" ADD COLUMN "publishAt" DATETIME;
ALTER TABLE "Comment" ADD COLUMN "resourceType" TEXT;
ALTER TABLE "Comment" ADD COLUMN "resourceId" TEXT;
ALTER TABLE "Comment" ADD COLUMN "userId" TEXT;
ALTER TABLE "Comment" ADD COLUMN "guestName" TEXT;
ALTER TABLE "Comment" ADD COLUMN "guestEmail" TEXT;
ALTER TABLE "Comment" ADD COLUMN "body" TEXT;
ALTER TABLE "Comment" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Comment" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "Like" ADD COLUMN "resourceType" TEXT;
ALTER TABLE "Like" ADD COLUMN "resourceId" TEXT;
ALTER TABLE "Like" ADD COLUMN "userId" TEXT;
ALTER TABLE "Like" ADD COLUMN "visitorId" TEXT;
ALTER TABLE "Like" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "PageView" ADD COLUMN "path" TEXT;
ALTER TABLE "PageView" ADD COLUMN "resourceType" TEXT;
ALTER TABLE "PageView" ADD COLUMN "resourceId" TEXT;
ALTER TABLE "PageView" ADD COLUMN "visitorId" TEXT;
ALTER TABLE "PageView" ADD COLUMN "referrer" TEXT;
ALTER TABLE "PageView" ADD COLUMN "day" TEXT;
ALTER TABLE "PageView" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "DeletedItem" ADD COLUMN "resourceType" TEXT;
ALTER TABLE "DeletedItem" ADD COLUMN "resourceId" TEXT;
ALTER TABLE "DeletedItem" ADD COLUMN "title" TEXT;
ALTER TABLE "DeletedItem" ADD COLUMN "payload" TEXT;
ALTER TABLE "DeletedItem" ADD COLUMN "deletedBy" TEXT;
ALTER TABLE "DeletedItem" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "Book" ADD COLUMN "title" TEXT;
ALTER TABLE "Book" ADD COLUMN "author" TEXT;
ALTER TABLE "Book" ADD COLUMN "translator" TEXT;
ALTER TABLE "Book" ADD COLUMN "category" TEXT NOT NULL DEFAULT 'شاعری';
ALTER TABLE "Book" ADD COLUMN "description" TEXT;
ALTER TABLE "Book" ADD COLUMN "coverUrl" TEXT;
ALTER TABLE "Book" ADD COLUMN "pdfUrl" TEXT;
ALTER TABLE "Book" ADD COLUMN "year" TEXT;
ALTER TABLE "Book" ADD COLUMN "pages" TEXT;
ALTER TABLE "Book" ADD COLUMN "featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Book" ADD COLUMN "views" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Book" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "MagazineIssue" ADD COLUMN "issueNumber" TEXT;
ALTER TABLE "MagazineIssue" ADD COLUMN "title" TEXT;
ALTER TABLE "MagazineIssue" ADD COLUMN "theme" TEXT;
ALTER TABLE "MagazineIssue" ADD COLUMN "coverUrl" TEXT;
ALTER TABLE "MagazineIssue" ADD COLUMN "editorial" TEXT;
ALTER TABLE "MagazineIssue" ADD COLUMN "pdfUrl" TEXT;
ALTER TABLE "MagazineIssue" ADD COLUMN "toc" TEXT;
ALTER TABLE "MagazineIssue" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MagazineIssue" ADD COLUMN "archive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "MagazineIssue" ADD COLUMN "publishedAt" DATETIME;
ALTER TABLE "MagazineIssue" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "MagazineIssue" ADD COLUMN "updatedAt" DATETIME;
ALTER TABLE "Feedback" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'SUGGESTION';
ALTER TABLE "Feedback" ADD COLUMN "name" TEXT;
ALTER TABLE "Feedback" ADD COLUMN "email" TEXT;
ALTER TABLE "Feedback" ADD COLUMN "subject" TEXT;
ALTER TABLE "Feedback" ADD COLUMN "message" TEXT;
ALTER TABLE "Feedback" ADD COLUMN "pageUrl" TEXT;
ALTER TABLE "Feedback" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'NEW';
ALTER TABLE "Feedback" ADD COLUMN "notes" TEXT;
ALTER TABLE "Feedback" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "Feedback" ADD COLUMN "updatedAt" DATETIME;
ALTER TABLE "NewspaperEdition" ADD COLUMN "title" TEXT;
ALTER TABLE "NewspaperEdition" ADD COLUMN "editionNumber" TEXT;
ALTER TABLE "NewspaperEdition" ADD COLUMN "weekLabel" TEXT;
ALTER TABLE "NewspaperEdition" ADD COLUMN "pdfUrl" TEXT;
ALTER TABLE "NewspaperEdition" ADD COLUMN "coverUrl" TEXT;
ALTER TABLE "NewspaperEdition" ADD COLUMN "notes" TEXT;
ALTER TABLE "NewspaperEdition" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "NewspaperEdition" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "WordOfDay" ADD COLUMN "word" TEXT;
ALTER TABLE "WordOfDay" ADD COLUMN "meaning" TEXT;
ALTER TABLE "WordOfDay" ADD COLUMN "englishMeaning" TEXT;
ALTER TABLE "WordOfDay" ADD COLUMN "synonyms" TEXT;
ALTER TABLE "WordOfDay" ADD COLUMN "antonyms" TEXT;
ALTER TABLE "WordOfDay" ADD COLUMN "example" TEXT;
ALTER TABLE "WordOfDay" ADD COLUMN "usage" TEXT;
ALTER TABLE "WordOfDay" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "WordOfDay" ADD COLUMN "date" DATETIME;
ALTER TABLE "DailySher" ADD COLUMN "text" TEXT;
ALTER TABLE "DailySher" ADD COLUMN "poetName" TEXT;
ALTER TABLE "DailySher" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "DailySher" ADD COLUMN "date" DATETIME;
ALTER TABLE "Competition" ADD COLUMN "title" TEXT;
ALTER TABLE "Competition" ADD COLUMN "description" TEXT;
ALTER TABLE "Competition" ADD COLUMN "rules" TEXT;
ALTER TABLE "Competition" ADD COLUMN "startDate" DATETIME;
ALTER TABLE "Competition" ADD COLUMN "endDate" DATETIME;
ALTER TABLE "Competition" ADD COLUMN "posterUrl" TEXT;
ALTER TABLE "Competition" ADD COLUMN "posterSize" TEXT NOT NULL DEFAULT 'A4 عمودی (2480×3508 پکسل، 300 DPI)';
ALTER TABLE "Competition" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Competition" ADD COLUMN "resultNote" TEXT;
ALTER TABLE "Competition" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "Event" ADD COLUMN "title" TEXT;
ALTER TABLE "Event" ADD COLUMN "description" TEXT;
ALTER TABLE "Event" ADD COLUMN "date" DATETIME;
ALTER TABLE "Event" ADD COLUMN "time" TEXT;
ALTER TABLE "Event" ADD COLUMN "venue" TEXT;
ALTER TABLE "Event" ADD COLUMN "eventType" TEXT NOT NULL DEFAULT 'مشاعرہ';
ALTER TABLE "Event" ADD COLUMN "posterUrl" TEXT;
ALTER TABLE "Event" ADD COLUMN "posterSize" TEXT NOT NULL DEFAULT 'A4 زمینی (3508×2480 پکسل، 300 DPI)';
ALTER TABLE "Event" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "Banner" ADD COLUMN "title" TEXT;
ALTER TABLE "Banner" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Banner" ADD COLUMN "linkUrl" TEXT;
ALTER TABLE "Banner" ADD COLUMN "position" TEXT NOT NULL DEFAULT 'SIDE';
ALTER TABLE "Banner" ADD COLUMN "recommendedSize" TEXT;
ALTER TABLE "Banner" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Banner" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Banner" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "QafiyaEntry" ADD COLUMN "word" TEXT;
ALTER TABLE "QafiyaEntry" ADD COLUMN "meaning" TEXT;
ALTER TABLE "QafiyaEntry" ADD COLUMN "pattern" TEXT;
ALTER TABLE "QafiyaEntry" ADD COLUMN "wazan" TEXT;
ALTER TABLE "QafiyaEntry" ADD COLUMN "notes" TEXT;
ALTER TABLE "QafiyaEntry" ADD COLUMN "rhymes" TEXT NOT NULL DEFAULT '[]';
ALTER TABLE "Behr" ADD COLUMN "name" TEXT;
ALTER TABLE "Behr" ADD COLUMN "nameEn" TEXT;
ALTER TABLE "Behr" ADD COLUMN "arkan" TEXT;
ALTER TABLE "Behr" ADD COLUMN "pattern" TEXT;
ALTER TABLE "Behr" ADD COLUMN "example" TEXT;
ALTER TABLE "Behr" ADD COLUMN "notes" TEXT;
ALTER TABLE "Setting" ADD COLUMN "value" TEXT;
ALTER TABLE "Advertisement" ADD COLUMN "title" TEXT;
ALTER TABLE "Advertisement" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Advertisement" ADD COLUMN "linkUrl" TEXT;
ALTER TABLE "Advertisement" ADD COLUMN "slot" TEXT NOT NULL DEFAULT 'LEFT';
ALTER TABLE "Advertisement" ADD COLUMN "width" TEXT;
ALTER TABLE "Advertisement" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Advertisement" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Advertisement" ADD COLUMN "clicks" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Advertisement" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "Advertisement" ADD COLUMN "updatedAt" DATETIME;
ALTER TABLE "MailLog" ADD COLUMN "toEmail" TEXT;
ALTER TABLE "MailLog" ADD COLUMN "subject" TEXT;
ALTER TABLE "MailLog" ADD COLUMN "bodyHtml" TEXT;
ALTER TABLE "MailLog" ADD COLUMN "kind" TEXT;
ALTER TABLE "MailLog" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "MailLog" ADD COLUMN "error" TEXT;
ALTER TABLE "MailLog" ADD COLUMN "relatedType" TEXT;
ALTER TABLE "MailLog" ADD COLUMN "relatedId" TEXT;
ALTER TABLE "MailLog" ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "MailLog" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "MailLog" ADD COLUMN "sentAt" DATETIME;
ALTER TABLE "ActivityLog" ADD COLUMN "action" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN "detail" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN "actorEmail" TEXT;
ALTER TABLE "ActivityLog" ADD COLUMN "createdAt" DATETIME;
ALTER TABLE "Memory" ADD COLUMN "title" TEXT;
ALTER TABLE "Memory" ADD COLUMN "date" TEXT;
ALTER TABLE "Memory" ADD COLUMN "description" TEXT;
ALTER TABLE "Memory" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Memory" ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Memory" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Memory" ADD COLUMN "createdAt" DATETIME;`;

// split the DDL into individual statements (no semicolons inside table bodies)
const statements = SCHEMA_SQL
  .split(/;\s*\n/)
  .map((s) => s.trim())
  .filter(Boolean);

export type SchemaEnsureReport = {
  ran: boolean;
  mode: "turso" | "local-sqlite";
  createdTables: string[];
  createdIndexes: string[];
  addedColumns: string[];
  rebuiltTables: string[];
  errors: string[];
  checkedAt: string;
};

let report: SchemaEnsureReport = {
  ran: false,
  mode: "local-sqlite",
  createdTables: [],
  createdIndexes: [],
  addedColumns: [],
  rebuiltTables: [],
  errors: [],
  checkedAt: "",
};

let ran = false;

type LibsqlClient = {
  execute: (stmt: { sql: string; args?: unknown[] }) => Promise<unknown>;
};

function classify(stmt: string):
  | { kind: "table"; name: string; sql: string }
  | { kind: "index"; name: string; sql: string }
  | { kind: "column"; table: string; column: string; sql: string }
  | null {
  const table = stmt.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`\"]?([\w]+)[`\"]?/i);
  if (table) {
    // make idempotent
    const sql = stmt.replace(/^CREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS)/i, "CREATE TABLE IF NOT EXISTS ");
    return { kind: "table", name: table[1], sql };
  }
  const index = stmt.match(/^CREATE\s+(UNIQUE\s+)?INDEX\s+[`\"]?([\w]+)[`\"]?/i);
  if (index) {
    const sql = stmt.replace(/^CREATE\s+(UNIQUE\s+)?INDEX\s+(?!IF\s+NOT\s+EXISTS)/i, (_m, uniq) => `CREATE ${uniq ?? ""}INDEX IF NOT EXISTS `);
    return { kind: "index", name: index[2], sql };
  }
  const col = stmt.match(/^ALTER\s+TABLE\s+[`\"]?([\w]+)[`\"]?\s+ADD\s+COLUMN\s+[`\"]?([\w]+)[`\"]?/i);
  if (col) return { kind: "column", table: col[1], column: col[2], sql: stmt };
  return null;
}

function columnsFromDdl(createSql: string): Set<string> {
  const cols = new Set<string>();
  const body = createSql.slice(createSql.indexOf("(") + 1, createSql.lastIndexOf(")"));
  for (const m of body.matchAll(/[`\"]?([\w]+)[`\"]?\s+[\w\"]+/g)) cols.add(m[1].toLowerCase());
  return cols;
}

// ordered column names from a CREATE TABLE body
function columnListFromDdl(createSql: string): string[] {
  const body = createSql.slice(createSql.indexOf("(") + 1, createSql.lastIndexOf(")"));
  const cols: string[] = [];
  for (const line of body.split("\n")) {
    const def = line.trim().replace(/,$/, "");
    const m = def.match(/^[`\"]?(\w+)[`\"]?\s+/);
    if (m && !/^(PRIMARY|FOREIGN|CONSTRAINT|UNIQUE|CHECK)$/i.test(m[1])) cols.push(m[1]);
  }
  return cols;
}

// primary-key column(s) declared in a CREATE TABLE statement (inline or
// table-level), lower-cased
function primaryKeyFromDdl(createSql: string): Set<string> {
  const pk = new Set<string>();
  const body = createSql.slice(createSql.indexOf("(") + 1, createSql.lastIndexOf(")"));
  const tableLevel = body.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
  if (tableLevel) {
    for (const m of tableLevel[1].matchAll(/[`\"]?(\w+)[`\"]?/g)) pk.add(m[1].toLowerCase());
    return pk;
  }
  for (const line of body.split("\n")) {
    const m = line.trim().match(/^[`\"]?(\w+)[`\"]?\s+[^,]*PRIMARY\s+KEY/i);
    if (m) pk.add(m[1].toLowerCase());
  }
  return pk;
}

async function ensureSchema(): Promise<SchemaEnsureReport> {
  if (ran) return report;
  ran = true;
  const useTurso =
    Boolean(process.env.TURSO_DATABASE_URL) &&
    (process.env.VERCEL === "1" || process.env.USE_TURSO === "1");
  const { resolveLocalSqliteUrl } = await import("@/lib/db");
  const url = useTurso ? process.env.TURSO_DATABASE_URL! : resolveLocalSqliteUrl();
  report = {
    ...report,
    ran: true,
    mode: useTurso ? "turso" : "local-sqlite",
    checkedAt: new Date().toISOString(),
  };
  try {
    if (!useTurso && url.startsWith("file:")) {
      const fs = (await import(/* webpackIgnore: true */ "fs")) as typeof import("fs");
      const path = (await import(/* webpackIgnore: true */ "path")) as typeof import("path");
      const dbPath = url.slice(5).split("?")[0];
      fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    }
    const { createClient } = await import("@libsql/client");
    const client = createClient(
      useTurso ? { url, authToken: process.env.TURSO_AUTH_TOKEN ?? "" } : { url }
    ) as unknown as LibsqlClient;

    // one introspection round-trip: existing tables, their DDL, existing indexes
    const master = (await client.execute({
      sql: "SELECT name, type, sql FROM sqlite_master WHERE type IN ('table','index')",
    })) as { rows: { name: string; type: string; sql: string | null }[] };
    const tables = new Set<string>();
    const tableDdl = new Map<string, string>();
    const indexes = new Set<string>();
    for (const r of master.rows) {
      if (r.type === "table") {
        tables.add(r.name.toLowerCase());
        if (r.sql) tableDdl.set(r.name.toLowerCase(), r.sql);
      } else if (r.type === "index" && r.name && !r.name.startsWith("sqlite_")) {
        indexes.add(r.name.toLowerCase());
      }
    }

    // ---- primary-key drift: rebuild tables whose PK shape changed ----
    // (e.g. Setting moved from an `id` PK to `key` as PK — the legacy id
    // column then breaks every Prisma create/upsert with a null-constraint
    // error, because the current client no longer supplies it)
    const currentTables = new Map<string, string>();
    for (const stmt of statements) {
      const m = stmt.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`\"]?(\w+)[`\"]?/i);
      if (m) currentTables.set(m[1].toLowerCase(), stmt);
    }
    for (const [name, createSql] of currentTables) {
      if (!tables.has(name)) continue;
      const oldDdl = tableDdl.get(name);
      if (!oldDdl) continue;
      const oldPk = primaryKeyFromDdl(oldDdl);
      const newPk = primaryKeyFromDdl(createSql);
      if (oldPk.size === 0 || newPk.size === 0) continue;
      const same = oldPk.size === newPk.size && [...oldPk].every((c) => newPk.has(c));
      if (same) continue;
      const oldCols = columnsFromDdl(oldDdl);
      const allCols = columnListFromDdl(createSql);
      const common = allCols.filter((c) => oldCols.has(c.toLowerCase()));
      if (common.length === 0) continue;
      try {
        const tmp = "__rebuild_" + name;
        const colsSql = common.map((c) => '"' + c + '"').join(",");
        const renamed = createSql.replace(/^CREATE\s+TABLE\s+"([^"]+)"/i, 'CREATE TABLE "' + tmp + '"');
        await client.execute({ sql: renamed });
        await client.execute({ sql: 'INSERT INTO "' + tmp + '" (' + colsSql + ') SELECT ' + colsSql + ' FROM "' + name + '"' });
        await client.execute({ sql: 'DROP TABLE "' + name + '"' });
        await client.execute({ sql: 'ALTER TABLE "' + tmp + '" RENAME TO "' + name + '"' });
        tableDdl.set(name, createSql);
        report.rebuiltTables.push(name);
      } catch (e) {
        report.errors.push(`rebuild:${name}: ${String(e).slice(0, 160)}`);
        console.error(`[schema-ensure] rebuild of ${name} failed:`, String(e).slice(0, 200));
      }
    }

    // two passes: tables + columns first, indexes last — an index may target
    // a column that only exists after its ALTER TABLE ADD COLUMN runs (the
    // column statements sit at the tail of the embedded script)
    const stmts = statements
      .map((s) => classify(s))
      .filter((c): c is NonNullable<ReturnType<typeof classify>> => Boolean(c));

    for (const c of stmts) {
      if (c.kind === "index") continue;
      try {
        if (c.kind === "table") {
          if (!tables.has(c.name.toLowerCase())) {
            await client.execute({ sql: c.sql });
            tables.add(c.name.toLowerCase());
            report.createdTables.push(c.name);
          }
        } else {
          const ddl = tableDdl.get(c.table.toLowerCase());
          if (!ddl) continue; // table missing — the CREATE TABLE above brings it with all columns
          if (!columnsFromDdl(ddl).has(c.column.toLowerCase())) {
            await client.execute({ sql: c.sql });
            tableDdl.set(c.table.toLowerCase(), ddl.replace(/\)\s*$/, `, ${c.sql.slice(c.sql.indexOf("ADD COLUMN") + 11)})`));
            report.addedColumns.push(`${c.table}.${c.column}`);
          }
        }
      } catch (e) {
        report.errors.push(`${c.kind}:${"name" in c ? c.name : c.table + "." + c.column}: ${String(e).slice(0, 160)}`);
      }
    }

    for (const c of stmts) {
      if (c.kind !== "index") continue;
      try {
        if (!indexes.has(c.name.toLowerCase())) {
          await client.execute({ sql: c.sql });
          indexes.add(c.name.toLowerCase());
          report.createdIndexes.push(c.name);
        }
      } catch (e) {
        report.errors.push(`index:${c.name}: ${String(e).slice(0, 160)}`);
      }
    }
    if (report.createdTables.length || report.createdIndexes.length || report.addedColumns.length || report.rebuiltTables.length) {
      console.log(
        `[schema-ensure] healed: +${report.createdTables.length} tables, +${report.createdIndexes.length} indexes, +${report.addedColumns.length} columns, rebuilt: ${report.rebuiltTables.join(", ") || "none"}`
      );
    }
    for (const e of report.errors) console.error("[schema-ensure] statement error:", e);
  } catch (e) {
    report.errors.push(String(e).slice(0, 300));
    console.error("[schema-ensure] failed:", String(e).slice(0, 300));
  }
  return report;
}

export { ensureSchema, report as schemaReport };
