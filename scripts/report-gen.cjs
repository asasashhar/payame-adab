// Payam-e-Adab Website Inspection Report — docx generator (English, R1 cover, DS-1 palette)
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, NumberFormat, AlignmentType, HeadingLevel,
  WidthType, BorderStyle, ShadingType, TableOfContents, PageBreak,
  TableLayoutType, SectionType,
} = require("docx");
const fs = require("fs");

// ---------- palette (DS-1 Deep Sea) ----------
const P = {
  bg: "0B1C2C", accent: "529286",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  table: { headerBg: "529286", headerText: "FFFFFF", accentLine: "529286", innerLine: "BECFCC", surface: "E8ECEB" },
};
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

// ---------- cover helpers (from design-system.md) ----------
function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([..."\uff0c\u3002\u3001\uff1b\uff1a\uff01\uff1f", ..."-_\u2014\u2013\u00b7/", ..." \t"]);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    lines[lines.length - 1] += last;
  }
  return lines;
}
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  // English title: average glyph ~0.55x CJK width
  const charWidth = (pt) => pt * 20 * 0.55;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt, lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) { lines = splitTitleLines(title, charsPerLine(minPt)); titlePt = minPt; }
  return { titlePt, titleLines: lines };
}
function calcCoverSpacing(params) {
  const { titleLineCount = 1, titlePt = 36, hasSubtitle = false, hasEnglishLabel = false,
    metaLineCount = 0, fixedHeight = 800, pageHeight = 16838 } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight + metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = usableHeight - contentHeight;
  const safeRemaining = Math.max(remainingSpace, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  return { topSpacing, midSpacing: Math.max(safeRemaining - topSpacing - bottomSpacing, 0), bottomSpacing };
}
function buildCoverR1(config) {
  const C = config.palette;
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length, fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: C.accent, space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));
  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.accent, space: 8 } },
      children: [new TextRun({ text: config.englishLabel.split("").join("  "), size: 18, color: C.accent, font: { ascii: "Calibri", eastAsia: "SimHei" }, characterSpacing: 40 })],
    }));
  }
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true, color: C.cover.titleColor, font: { eastAsia: "SimHei", ascii: "Arial" } })],
    }));
  }
  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 800 },
      children: [new TextRun({ text: config.subtitle, size: 24, color: C.cover.subtitleColor, font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
    }));
  }
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 24, color: C.cover.metaColor, font: { eastAsia: "Microsoft YaHei", ascii: "Arial" } })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: C.cover.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: C.cover.footerColor, font: { ascii: "Arial" } }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({ shading: { type: ShadingType.CLEAR, fill: C.bg }, borders: noBorders, children })],
    })],
  })];
}

// ---------- body helpers ----------
const EN = { ascii: "Times New Roman", eastAsia: "Times New Roman" };
function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160, line: 312 }, children: [new TextRun({ text, bold: true, size: 32, color: "0B1220", font: EN })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 120, line: 312 }, children: [new TextRun({ text, bold: true, size: 28, color: "0B1220", font: EN })] });
}
function p(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 140, line: 312 },
    children: [new TextRun({ text, size: 24, color: "000000", font: EN, ...opts })],
  });
}
function pRuns(runs) {
  return new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 140, line: 312 }, children: runs });
}
function cell(text, { bold = false, fill = null, width = 20, color = "000000", size = 20 } = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.PERCENTAGE },
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({ spacing: { line: 276 }, children: [new TextRun({ text, bold, size, color, font: EN })] })],
  });
}
function findingsTable(rows) {
  const header = new TableRow({
    tableHeader: true, cantSplit: true,
    children: [
      cell("ID", { bold: true, fill: P.table.headerBg, color: P.table.headerText, width: 6 }),
      cell("Page / location", { bold: true, fill: P.table.headerBg, color: P.table.headerText, width: 22 }),
      cell("What is wrong", { bold: true, fill: P.table.headerBg, color: P.table.headerText, width: 39 }),
      cell("Severity", { bold: true, fill: P.table.headerBg, color: P.table.headerText, width: 13 }),
      cell("Status", { bold: true, fill: P.table.headerBg, color: P.table.headerText, width: 20 }),
    ],
  });
  const body = rows.map(r => new TableRow({
    cantSplit: true,
    children: [
      cell(r.id, { width: 6 }),
      cell(r.where, { width: 22 }),
      cell(r.what, { width: 39 }),
      cell(r.sev, { width: 13 }),
      cell(r.status, { width: 20 }),
    ],
  }));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
      left: NB, right: NB,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine },
      insideVertical: NB,
    },
    rows: [header, ...body],
  });
}
function tableTitle(text) {
  return new Paragraph({ keepNext: true, spacing: { before: 120, after: 80, line: 312 }, children: [new TextRun({ text, bold: true, size: 21, color: "333333", font: EN })] });
}

// ---------- findings data ----------
const F = [
  { id: "F-01", where: "/admin/admins (src/lib/admin-roles.ts -> src/lib/auth.ts)", what: "Production build failed: the Admins page (a client component) pulled server-only code (next/headers) into the browser bundle through admin-roles importing auth.ts. The page showed a build-error overlay and the whole site could not be deployed.", sev: "Critical", status: "FIXED - permissions data moved to client-safe src/lib/permission-modules.ts; build passes; page renders with the 4-admin table" },
  { id: "F-02", where: "src/lib/auto-seed.ts (via src/instrumentation.ts)", what: "Production build failed under Next 16: static imports of child_process/fs/path in the boot-time self-heal module are rejected in the edge bundle. Deployments using a fresh build would fail.", sev: "Critical", status: "FIXED - node builtins now resolved at runtime only; build passes; DB self-heal verified" },
  { id: "F-03", where: "src/app/api/upload/route.ts (admin image/PDF upload)", what: "The hosting sandbox periodically rolls source files back to an older snapshot. The upload endpoint file was deleted twice during the audit, making admin uploads return 404 again.", sev: "Critical", status: "MITIGATED - file restored and committed to git (3e01118); hosting-level protection still needed" },
  { id: "F-04", where: "/poetry, /articles, /magazine - section hero banner", what: "Listing-page hero banners render the page title nearly invisible: cream text on a cream parchment banner (washed-out contrast). Visitors cannot read the page title.", sev: "High", status: "OPEN - use ink/dark title colour or add a scrim behind the title" },
  { id: "F-05", where: "/feedback", what: "The feedback page has no site navigation header and no footer - it is a standalone form detached from the rest of the site, so users cannot navigate away.", sev: "High", status: "OPEN - wrap the page in SiteHeader/SiteFooter like other pages" },
  { id: "F-06", where: "Site header on mobile (all content pages)", what: "The mobile header shows the logo twice - a small brand block and a large logo image sit side by side, which looks duplicated and crowds the bar.", sev: "Medium", status: "OPEN - keep a single logo mark in the mobile header" },
  { id: "F-07", where: "/newspaper list + /newspaper/[id] + admin Newspaper", what: "The newspaper edition shows an impossible date: 2026-47-20 (month 47). Seed/data corruption or a broken date format.", sev: "Medium", status: "OPEN - correct the edition date and validate month/day at input" },
  { id: "F-08", where: "/dictionary - word card", what: "Wrong English gloss: naakaam (means unsuccessful/failed) is glossed as hard work, painstaking effort (the meaning of mehnat).", sev: "Medium", status: "OPEN - correct the gloss in the words data" },
  { id: "F-09", where: "/books/[id] (mobile), magazine issue detail", what: "Oversized image placeholders: the book-cover placeholder occupies about 70% of the mobile viewport height before any text; the magazine issue placeholder is similarly huge.", sev: "Medium", status: "OPEN - cap placeholder height and show the title inside it" },
  { id: "F-10", where: "/poetry/[id] (mobile)", what: "The PAYAM-E-ADAB watermark sits directly behind the poem verses at a readability-affecting opacity on small screens.", sev: "Medium", status: "OPEN - reduce opacity below 6% or hide the watermark under 640px" },
  { id: "F-11", where: "/admin/analytics (mobile 390px)", what: "Horizontal overflow: the analytics chart renders 514px wide inside a 390px viewport, forcing sideways scrolling on the Admin Panel.", sev: "Medium", status: "OPEN - make the chart width fluid (100% container)" },
  { id: "F-12", where: "/poetry/[id]/print (desktop 1366px)", what: "Horizontal overflow of 16px (1382 vs 1366): the print sheet exceeds the viewport and shifts layout.", sev: "Medium", status: "OPEN - constrain the print sheet max-width" },
  { id: "F-13", where: "/competitions, /dictionary, /events, /newspaper, /poets, /search, /taqti, /submit, both readers", what: "Pages render without an h1 heading - every listing page should have one main heading for accessibility and SEO.", sev: "Low", status: "OPEN - add a page-level h1 to each" },
  { id: "F-14", where: "/admin/likes", what: "The Likes page renders an empty content area with no empty-state message, unlike other admin pages.", sev: "Low", status: "OPEN - add an empty-state card" },
  { id: "F-15", where: "/news/[id]", what: "News items without an image show a disproportionately large megaphone icon placeholder in the middle of the article.", sev: "Low", status: "OPEN - smaller, framed placeholder or hide when no image" },
  { id: "F-16", where: "/dictionary", what: "Sparse layout: a single word card floats in a large empty region before the footer on desktop and mobile.", sev: "Low", status: "OPEN - give the word-of-day a designed block layout" },
  { id: "F-17", where: "Admin Panel - Users list", what: "Test/probe accounts created by the automated test suite remain in the live users table (some with suspended badges).", sev: "Low", status: "PARTIAL - suite cleanup improved; delete remaining probe rows before publishing" },
];

// ---------- document ----------
const doc = new Document({
  styles: {
    default: {
      document: { run: { font: EN, size: 24, color: "000000" }, paragraph: { spacing: { line: 312 } } },
      heading1: { run: { font: EN, size: 32, bold: true, color: "0B1220" }, paragraph: { spacing: { before: 360, after: 160, line: 312 } } },
      heading2: { run: { font: EN, size: 28, bold: true, color: "0B1220" }, paragraph: { spacing: { before: 260, after: 120, line: 312 } } },
      heading3: { run: { font: EN, size: 24, bold: true, color: "0B1220" }, paragraph: { spacing: { before: 200, after: 100, line: 312 } } },
    },
  },
  sections: [
    // ---- Section 1: cover (no page number) ----
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: buildCoverR1({
        title: "Payam-e-Adab Website Inspection Report",
        subtitle: "Complete technical and design audit - homepage to the last page, desktop and mobile",
        englishLabel: "WEBSITE AUDIT 2026",
        metaLines: [
          "Site: Payam-e-Adab (payameadab.zite.so - live preview domain verified)",
          "Scope: 63 routes crawled - 33 public pages, 30 admin panel pages",
          "Coverage: images, fonts, layout, links, navigation, responsiveness, admin panel",
          "Date: 16 November 2026",
        ],
        footerLeft: "Prepared by the site agent", footerRight: "Confidential - site owner only",
        palette: P,
      }),
    },
    // ---- Section 2: TOC (roman) ----
    {
      properties: { type: SectionType.NEXT_PAGE, page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 }, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "666666", font: EN })] })] }) },
      children: [
        new Paragraph({ spacing: { before: 240, after: 200, line: 920, lineRule: "atLeast" }, children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, color: "0B1220", font: EN })] }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({ spacing: { before: 200, line: 312 }, children: [new TextRun({ text: "Note: after opening the document in Word, right-click the table of contents and choose Update Field to refresh the page numbers.", italics: true, size: 20, color: "888888", font: EN }), new PageBreak()] }),
      ],
    },
    // ---- Section 3: body (arabic, start 1) ----
    {
      properties: { type: SectionType.CONTINUOUS, page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 }, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Payam-e-Adab Website Inspection Report", size: 16, color: "999999", font: EN })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "666666", font: EN })] })] }) },
      children: [
        h1("1. Executive Summary"),
        p("This report is the result of a complete, page-by-page inspection of the Payam-e-Adab website. Every public page from the homepage through the content listings (poetry, articles, books, magazine, newspaper), the interactive tools (qafiya, taqti, dictionary, search), the account pages (login, register, dashboard, profile) and all thirty Admin Panel pages was tested on desktop (1366px) and mobile (390px) viewports, with every internal link and every image source verified programmatically, every rendered page checked for JavaScript errors and broken images in a real browser, and the Urdu font rendering confirmed on every view."),
        p("The inspection found 17 distinct issues. Two of them were critical build blockers: the site could not be compiled for production at all, because the Admins page imported server-only code into the browser bundle, and the database self-heal module used Node builtins in a way the new bundler rejects. Both were corrected during the audit and verified with a clean production build and the full 72-test automated suite running against the production server. One further critical problem is environmental rather than code-based: the hosting sandbox periodically rolls source files back, which twice deleted the admin upload endpoint during the audit; the file is now restored and committed, but hosting-level protection is still needed."),
        pRuns([
          new TextRun({ text: "The remaining 14 issues are visual and layout defects that need correction in the theme and content: the most visible are the washed-out section banners on the poetry, articles and magazine listings (titles are nearly invisible), the feedback page that has lost its site navigation and footer, the duplicated logo in the mobile header, an impossible newspaper date (2026-47-20), a wrong English gloss in the dictionary, and oversized image placeholders on book and magazine pages. ", size: 24, color: "000000", font: EN }),
          new TextRun({ text: "Nothing in the inspection found broken internal links, broken images, missing alt text or login failures: those areas verified healthy.", bold: true, size: 24, color: "000000", font: EN }),
        ]),
        h1("2. Scope and Method"),
        p("The audit covered the full route map of the application: 33 public pages including every dynamic detail page (a real poem, article, news item, book, magazine issue, newspaper edition, poet and user profile), the print views, the PDF book reader and the newspaper PDF viewer; and all 30 Admin Panel pages entered through the @admin account. Automated crawls fetched every page and extracted every internal href (all status-checked) and every image source (all status-checked, plus missing-alt detection). A real-browser pass then visited each page twice - desktop 1366x850 and mobile 390x844 - measuring horizontal overflow, detecting images that failed to render (naturalWidth zero), checking for error text, and verifying that the Nastaliq/Urdu fonts actually load. The production build was compiled twice to surface bundling errors, and the 72-test end-to-end suite (authentication, uploads, publishing workflows, scheduling, permissions, cleanup) was executed against the production server as the final regression gate."),
        p("Two methodological notes. First, screenshots taken mid-audit when the dev server crashed were discarded and re-taken, so no finding in this report rests on an error page. Second, the published domain payameadab.zite.so serves a static Cloudflare snapshot and cannot execute the login backend at all (see section 7); all server-dependent testing therefore ran against the live preview domain, which executes the real application."),
        h1("3. Critical Issues Found and Fixed"),
        p("Three critical issues were found. The first two blocked the production build entirely - meaning the site could not have been republished or deployed in its current state; both are now fixed and verified. The third is a hosting-environment defect that repeatedly deletes committed source files and needs attention beyond the codebase."),
        tableTitle("Table 1. Critical issues (all related to build, deployment and hosting integrity)"),
        findingsTable([F[0], F[1], F[2]]),
        p("Verification detail: after the two code fixes, npm run build completes with exit code 0, the standalone production server boots, /admin/admins renders the administrator table correctly (it previously showed a build-error overlay), the upload endpoint returns 201, and the full automated suite reports 72 passed, 0 failed against the production server. The fixes are committed to git so the recurring file rollback cannot silently revert them."),

        h1("4. Public Site Findings, Page by Page"),
        p("This section lists every defect found on the public site, ordered by severity. Each row names the page and the exact area, describes what is wrong, and states the correction. The subsections group the findings by page so the corrections can be applied one page at a time."),

        h2("4.1 Listing pages: /poetry, /articles, /magazine"),
        p("The three main content listings share a hero banner component, and on all three the page title is almost invisible - cream-coloured text on the cream parchment banner, with only a decorative gold rule below. On /magazine the single seeded issue also renders as a lone card pushed to the far edge of a wide empty band. The same banner appears correct on /books (which has a photo background), so the defect is specific to the banner variant these three pages use. Correction: render the banner title in the ink/primary colour or add a translucent scrim behind the title; constrain the magazine card row so cards do not drift to the edge."),
        tableTitle("Table 2. Listing-page findings"),
        findingsTable([F[3], F[4], F[5]]),

        h2("4.2 Newspaper and dictionary (data and content defects)"),
        p("Two content defects need data correction rather than CSS. The newspaper edition card and its detail page show the publication date as 2026-47-20 - month 47 does not exist, which suggests the seed row or a date formatter is corrupted; the same value appears in the admin Newspaper list. The dictionary page glosses the Urdu word naakaam (which means unsuccessful or failed) with the English phrase hard work, painstaking effort - that is the meaning of mehnat, a different word entirely; a reader using the dictionary to learn would be misled. The dictionary page also feels unfinished on both viewports: one word card floats in a large empty region before the footer."),
        tableTitle("Table 3. Newspaper and dictionary findings"),
        findingsTable([F[6], F[7], F[15]]),

        h2("4.3 Detail pages: books, magazine, poetry, news"),
        p("The detail pages work functionally - the PDF.js book reader opens, pages turn, the newspaper viewer plays the scanned edition, and poems render in correct Nastaliq with like/comment/view controls. The defects are visual proportioning: on mobile the book-cover placeholder occupies roughly seventy percent of the viewport height before any text appears, the magazine issue detail shows a similarly oversized beige placeholder box, the poem watermark sits directly behind the verses at a strength that interferes with reading on small screens, and news items without a photo show a huge megaphone icon. The poem print view also overflows the desktop viewport by sixteen pixels."),
        tableTitle("Table 4. Detail-page findings"),
        findingsTable([F[8], F[9], F[10], F[14]]),

        h2("4.4 Site-wide: header, headings, print"),
        p("Three findings affect many pages at once. The mobile header carries two logo elements side by side - a small brand block and a large logo image - making the bar crowded and the branding duplicated on every content page. Nine pages begin their content without an h1 heading (competitions, dictionary, events, newspaper, poets, search, taqti, submit and both readers), which weakens accessibility and search-engine structure. The print view overflow is listed with the detail pages but is also site-wide in nature since any print attempt inherits it."),
        tableTitle("Table 5. Site-wide findings"),
        findingsTable([F[5], F[12], F[13]]),

        h1("5. Admin Panel Findings"),
        p("After the build fix, all thirty Admin Panel pages render correctly on desktop and mobile: the dashboard shows live statistics, the analytics charts draw, every resource manager (poems, articles, books, poets, news, magazine, newspaper, competitions, events, behrs, qafiya, shers, words, banners, ads) lists its rows with action buttons, the approvals, scheduled, deleted-item recovery, mail, logs, users and administrators pages all work, and the appearance and settings forms are complete. Three smaller defects remain: the analytics page overflows its mobile viewport because the chart keeps a fixed pixel width; the Likes page shows a blank content area instead of an empty-state message; and the users table still contains suspended test accounts left by the automated suite. The newspaper admin also shows the corrupted 2026-47-20 date noted in section 4.2."),
        tableTitle("Table 6. Admin Panel findings"),
        findingsTable([F[10], F[13], F[16]]),

        h1("6. Verified Healthy Areas"),
        p("The following areas were tested and passed without reservation, and are listed so the owner knows what does not need attention. Every internal link discovered by the crawler returned a valid response - zero broken links across all pages. Every image source resolved - zero broken images - and no img element is missing alt text. No page produced a JavaScript application error in any of the roughly one hundred thirty browser visits, and the Urdu typography (PFA Jameel Noori Nastaleeq with Noto Nastaliq Urdu fallback) loaded successfully on every single view. Mobile layout is overflow-free on every public page except the print view, and on the admin side only the analytics chart overflows. The three login paths work on the server-backed domain: email/password registration, login, session persistence and logout were re-verified end to end; the dedicated @admin login opens the full Admin Dashboard directly; and Google login is implemented correctly but intentionally refuses to operate until real Google OAuth credentials are saved in the admin settings - the exact setup steps are in section 7. The book reader, the newspaper viewer, comments, likes, contact and feedback forms, the search, the qafiya and taqti tools and the submission flow all rendered and responded correctly."),

        h1("7. Hosting and Configuration Requirements"),
        p("Two environment-level requirements sit outside the code and must be completed by the owner. First, the published domain payameadab.zite.so currently serves a static Cloudflare snapshot: pages display, but every /api request is intercepted by a generic endpoint layer that returns 404 or 405, so login, comments, posting and the admin panel cannot function there regardless of code quality. The site must be republished through the full-stack application option so the Next.js server runs behind the domain; until then, the preview URL (the live app inside this workspace) is the only address where accounts and the admin panel actually work. Second, enabling the Continue-with-Google button requires a Google Cloud OAuth client of type Web Application with the authorized redirect URI set to https://payameadab.zite.so/api/auth/google (plus the corresponding preview-domain URI while testing); the Client ID and Secret are then saved in Admin Panel - Site Settings - Google section, with Google sign-in enabled. Without those credentials the button correctly reports that Google sign-in is not configured rather than silently pretending to log the user in."),
        p("Finally, the hosting sandbox itself periodically rolls the workspace back to an older file snapshot; during this audit it twice deleted the admin upload route and once reverted the build fixes. All current work is committed to git (most recently commit 3e01118 and the E2E-path fix), which makes recovery a one-line checkout, but the rollback mechanism should be raised with the hosting provider, because any future file created between snapshots remains at risk."),

        h1("8. Prioritized Correction Plan"),
        p("The recommended order of work, taking deployment integrity and visitor-visible impact first. The two build fixes and the upload restoration are already done and verified, so the plan starts from the highest-visibility open defect."),
        tableTitle("Table 7. Recommended order of corrections"),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
            bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
            left: NB, right: NB,
            insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine },
            insideVertical: NB,
          },
          rows: [
            new TableRow({ tableHeader: true, cantSplit: true, children: [
              cell("Priority", { bold: true, fill: P.table.headerBg, color: P.table.headerText, width: 12 }),
              cell("Work", { bold: true, fill: P.table.headerBg, color: P.table.headerText, width: 58 }),
              cell("Findings", { bold: true, fill: P.table.headerBg, color: P.table.headerText, width: 12 }),
              cell("Effort", { bold: true, fill: P.table.headerBg, color: P.table.headerText, width: 18 }),
            ]}),
            new TableRow({ cantSplit: true, children: [
              cell("P0", { width: 12 }), cell("Republish through the full-stack option so the backend runs on payameadab.zite.so; then create and save the Google OAuth credentials.", { width: 58 }), cell("Env", { width: 12 }), cell("Owner action, 15 min", { width: 18 }),
            ]}),
            new TableRow({ cantSplit: true, children: [
              cell("P1", { width: 12 }), cell("Fix the washed-out hero banners on poetry/articles/magazine; restore site header and footer on /feedback; single logo in the mobile header.", { width: 58 }), cell("F-04, F-05, F-06", { width: 12 }), cell("Small CSS/component edits", { width: 18 }),
            ]}),
            new TableRow({ cantSplit: true, children: [
              cell("P2", { width: 12 }), cell("Correct the newspaper edition date and the dictionary gloss; cap placeholder heights on book and magazine pages; soften the poem watermark on mobile.", { width: 58 }), cell("F-07 to F-10", { width: 12 }), cell("Data + CSS edits", { width: 18 }),
            ]}),
            new TableRow({ cantSplit: true, children: [
              cell("P3", { width: 12 }), cell("Fluid analytics chart width; print-sheet max-width; add h1 headings; Likes empty-state; news placeholder; dictionary layout; delete leftover test accounts.", { width: 58 }), cell("F-11 to F-17", { width: 12 }), cell("Half a session", { width: 18 }),
            ]}),
          ],
        }),
        p("Once P0 through P2 are applied, a fresh production build plus the same 72-test suite and a visual pass of the listing pages will confirm the corrections without repeating the whole audit."),
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.mkdirSync("/home/z/my-project/download", { recursive: true });
  fs.writeFileSync("/home/z/my-project/download/Payam-e-Adab-Website-Inspection-Report.docx", buf);
  console.log("report written:", buf.length, "bytes");
});
