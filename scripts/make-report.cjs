/* PAYAM-E-ADAB — Development Report (spec Parts 1–15) — docx generation */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, TableLayoutType,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, Header, Footer,
  PageNumber, NumberFormat, TableOfContents, PageBreak, SectionType, VerticalAlign,
} = require("docx");
const fs = require("fs");

/* ---------- palette: Payam-e-Adab literary identity (deep green / amber gold / ivory) ---------- */
const P = {
  bg: "06422a", titleColor: "F8F1E7", subtitleColor: "E2C57C", metaColor: "EFE9D8",
  accent: "B5891E", footerColor: "D8CFB4",
  primary: "06422A", body: "262626", secondary: "6F6A5C", surface: "F6F1E2",
};

/* ---------- helpers ---------- */
const allNoBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
};
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: "auto" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
  left: { style: BorderStyle.NONE, size: 0, color: "auto" },
  right: { style: BorderStyle.NONE, size: 0, color: "auto" },
};

function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const words = title.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > charsPerLine && cur) { lines.push(cur.trim()); cur = w; }
    else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charWidth = (pt) => pt * 11; // Latin chars ≈ 0.55em
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt, lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 4) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) { lines = splitTitleLines(title, charsPerLine(minPt)); titlePt = minPt; }
  return { titlePt, titleLines: lines };
}
function calcCoverSpacing(params) {
  const { titleLineCount = 1, titlePt = 36, hasSubtitle = false, hasEnglishLabel = false,
    metaLineCount = 0, fixedHeight = 800, pageHeight = 16838, marginTop = 0, marginBottom = 0 } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - marginTop - marginBottom - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const remaining = Math.max(1200, usableHeight - titleHeight - subtitleHeight - englishLabelHeight - metaHeight - fixedHeight - implicitParaHeight);
  return { topSpacing: Math.min(4800, Math.floor(remaining * 0.42)), bottomSpacing: Math.min(4800, Math.floor(remaining * 0.58)) };
}

/* ---------- Cover Recipe R1 (Pure Paragraph Left) ---------- */
function buildCoverR1(config) {
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length, fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));
  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
      children: [new TextRun({ text: config.englishLabel.split("").join("  "), size: 18, color: P.accent, font: { ascii: "Calibri" } })],
    }));
  }
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true, color: P.titleColor, font: { ascii: "Arial" } })],
    }));
  }
  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 800 },
      children: [new TextRun({ text: config.subtitle, size: 24, color: P.subtitleColor, font: { ascii: "Calibri" } })],
    }));
  }
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 24, color: P.metaColor, font: { ascii: "Calibri" } })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: P.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: P.footerColor, font: { ascii: "Arial" } }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({ shading: { type: ShadingType.CLEAR, fill: P.bg }, borders: noBorders, children })],
    })],
  })];
}

/* ---------- body builders ---------- */
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 160 }, keepNext: true,
    children: [new TextRun({ text, bold: true, size: 32, color: P.primary, font: { ascii: "Calibri" } })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2, spacing: { before: 260, after: 120 }, keepNext: true,
    children: [new TextRun({ text, bold: true, size: 26, color: P.primary, font: { ascii: "Calibri" } })],
  });
}
function body(text, opts = {}) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED, spacing: { line: 312, after: 120 },
    children: [new TextRun({ text, size: 22, color: P.body, font: { ascii: "Calibri" }, ...opts })],
  });
}
function bullet(runsOrText) {
  const children = typeof runsOrText === "string"
    ? [new TextRun({ text: runsOrText, size: 22, color: P.body, font: { ascii: "Calibri" } })]
    : runsOrText;
  return new Paragraph({
    alignment: AlignmentType.LEFT, spacing: { line: 312, after: 80 }, indent: { left: 360, hanging: 200 },
    children: [new TextRun({ text: "•  ", bold: true, size: 22, color: P.accent }), ...children],
  });
}
function bold(text) { return new TextRun({ text, bold: true, size: 22, color: P.primary, font: { ascii: "Calibri" } }); }
function plain(text) { return new TextRun({ text, size: 22, color: P.body, font: { ascii: "Calibri" } }); }

function makeTable(headerCells, rows, widths) {
  const mk = (text, isHeader, w, i) => new TableCell({
    width: { size: w, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: isHeader ? P.primary : (i % 2 ? "FFFFFF" : P.surface) },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: AlignmentType.LEFT, spacing: { line: 276 },
      children: [new TextRun({ text, size: isHeader ? 21 : 20, bold: isHeader, color: isHeader ? "F8F1E7" : P.body, font: { ascii: "Calibri" } })],
    })],
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE }, layout: TableLayoutType.FIXED,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: P.accent },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: P.accent },
      left: { style: BorderStyle.SINGLE, size: 2, color: "D8CFB4" },
      right: { style: BorderStyle.SINGLE, size: 2, color: "D8CFB4" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "D8CFB4" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "D8CFB4" },
    },
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headerCells.map((t, j) => mk(t, true, widths[j], 0)) }),
      ...rows.map((r, i) => new TableRow({ cantSplit: true, children: r.map((t, j) => mk(t, false, widths[j], i)) })),
    ],
  });
}
function caption(text) {
  return new Paragraph({
    keepNext: true, spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, bold: true, size: 21, color: P.secondary, font: { ascii: "Calibri" } })],
  });
}

/* ---------- content ---------- */
const cover = buildCoverR1({
  title: "PAYAM-E-ADAB Development Report",
  subtitle: "Complete Website Development, Administrator Control, User Accounts, Authentication and Publishing System",
  englishLabel: "URDU LITERARY PUBLISHING PLATFORM",
  metaLines: [
    "Platform: Payam-e-Adab (پیامِ ادب) — Urdu Literary Magazine & Digital Publisher",
    "Scope: 15-Part Development Specification — Full Compliance Audit & Implementation",
    "Test Results: 100 / 100 End-to-End Checks Passed",
    "Date: 8 November 2026",
  ],
  footerLeft: "Payam-e-Adab — Urdu Literature, From Tradition to the New Generation",
  footerRight: "Version 3.2",
});

const bodyChildren = [];

/* Executive summary */
bodyChildren.push(h1("Executive Summary"));
bodyChildren.push(body("This report documents the complete implementation of the 15-part development specification for the Payam-e-Adab platform. The existing production website was audited part by part against the specification, all missing functionality was implemented on top of the live system, and every workflow was verified end to end with automated tests. The platform now provides full administrator control over design, fonts, navigation, sections and custom pages; a complete user account system with self-chosen passwords; Gmail OTP based password recovery; a five-account administrator system with forced first-login password changes and backend-enforced role permissions; a complete submission and editorial workflow with email notifications; real analytics; and the four-design monthly rotation. All 100 automated end-to-end checks pass (38 core + 30 platform + 32 authentication/OTP), with zero JavaScript errors and no horizontal overflow on desktop or mobile."));

/* Part mapping table */
bodyChildren.push(h1("1. Features Successfully Implemented"));
bodyChildren.push(caption("Table 1 — Specification coverage by part"));
bodyChildren.push(makeTable(
  ["Spec Part", "Requirement", "Status"],
  [
    ["1", "Improve the existing platform, not a new site", "Existing platform upgraded; all data preserved"],
    ["2.1", "Admin control of elements, sections, settings", "Homepage sections (order/visibility), hero fields, texts, images — all admin-managed"],
    ["2.2", "Full color/design management", "4 custom color pickers + 3 theme presets + 4-design rotation override, applied site-wide"],
    ["2.3", "Typography with the 10 approved Urdu fonts", "Body, headings + NEW per-area fonts (poetry/articles, navigation/buttons, book reader); sizes, line-height, global scale"],
    ["2.4", "Page & section management, menus", "NEW: navigation menu editor (labels, links, order, visibility) + NEW custom pages (/p/slug) with admin editor"],
    ["2.5", "Branding (logo, hero, watermark, socials)", "Official logo assets, hero banner, favicon, adjustable watermark, social links manager"],
    ["3.1", "Larger, readable text", "Base sizes raised (22px body / 40px headings active; admin-adjustable scale)"],
    ["3.2", "Modern homepage", "Approved mockup design: hero carousel, featured article, sidebars, category pills, trio row"],
    ["3.3", "Left & right advertisement areas", "AdRail LEFT/RIGHT slots, admin management, auto-hide when empty, responsive"],
    ["4", "Registration, login, personal dashboard", "Self-chosen strong passwords, confirm field, photo, bio, terms; remember-me; 4-tab dashboard (works / profile / security / liked)"],
    ["5", "Forgot password with Gmail OTP", "Full 7-step OTP flow implemented and tested (see section 3)"],
    ["6", "Five admin accounts, initial password", "3 supplied + 2 addable; darulhuda initial + forced change on first login; backend RBAC; activity log"],
    ["7", "Submission & editorial system", "Submit → review → approve/reject/revision → publish, with mandatory reasons, feedback, history"],
    ["8", "Email notifications", "9 template kinds incl. NEW welcome and password-change confirmations; preview, resend, edit-all"],
    ["9", "Publishing integrity", "Published content appears on public pages; upload API restored; books on homepage verified"],
    ["10", "Official logo & watermark", "Owner artwork only; watermark on poems/articles/books/PDF with opacity/size/position controls"],
    ["11", "Analytics & comments", "Real per-item view counting, admin analytics, comment moderation (approve/hide/delete)"],
    ["12", "Four-design monthly rotation", "A(1–6) B(7–13) C(14–20) D(21+) in Asia/Kolkata; admin preview/override/restore"],
    ["13", "Responsive design", "Verified 390px–1440px, no horizontal overflow, mobile navigation functional"],
    ["14", "Database & security", "Scrypt password hashing, HMAC sessions, RBAC enforced in APIs, activity logs, upload guards"],
  ],
  [10, 32, 58]
));

bodyChildren.push(h2("1.1 Highlights of this development cycle"));
bodyChildren.push(bullet([bold("Gmail OTP password recovery (Part 5). "), plain("A complete 7-step flow: request → 6-digit code emailed → code entry page → backend verification → new password page → secure save → confirmation email. Codes are stored only as SHA-256 hashes, expire in 15 minutes, work exactly once, allow a maximum of 5 wrong attempts, and requests are rate-limited to 1 per minute and 3 per hour per address. Responses never reveal whether an email is registered.")]));
bodyChildren.push(bullet([bold("Registration hardening (Part 4). "), plain("Password confirmation field, strength rule (minimum 8 characters with at least one letter and one digit), optional biography and profile photograph (uploaded automatically after account creation), and a mandatory terms agreement checkbox. Passwords are hashed with scrypt and random salts — never stored in plain text.")]));
bodyChildren.push(bullet([bold("Administrator first-login gate (Part 6). "), plain("Any administrator still using the initial password (darulhuda), or reset by the Super Admin, is blocked from the entire panel by a mandatory change-password screen until a personal password is set.")]));
bodyChildren.push(bullet([bold("Navigation menu editor + custom pages (Part 2.4). "), plain("The administrator can reorder, relabel, hide, add and delete navigation links, and can create entirely new pages (slug-based, e.g. /p/rahnumai) with a title and content editor; missing pages return a proper 404.")]));
bodyChildren.push(bullet([bold("Per-area typography (Part 2.3). "), plain("Separate font selectors for literary content, navigation/buttons and the digital book reader — restricted strictly to the 10 approved Urdu fonts, with honest availability markers for any font whose licensed file has not yet been provided.")]));

/* Section 2 */
bodyChildren.push(h1("2. Existing Problems Repaired"));
bodyChildren.push(makeTable(
  ["#", "Problem found", "Repair"],
  [
    ["1", "Forgot-password page told users to \u201ccontact the administrator\u201d instead of providing self-service recovery", "Replaced with the full OTP recovery flow; the admin-assisted reset link remains as a fallback tool"],
    ["2", "Registration accepted weak passwords and had no confirmation field or terms consent", "Strength validation on client and server, confirmation field, terms checkbox"],
    ["3", "The file-upload API route (/api/upload) had disappeared from the source tree, breaking image uploads", "Restored from git history; upload guards verified (images for logged-in users, PDFs admin-only)"],
    ["4", "A latent crash in the custom email-template renderer (undefined siteUrl) could break emails using the [link] placeholder", "Fixed and covered by the template tests"],
    ["5", "The contact email in site settings contained a typo (mdnematulah…)", "Corrected to mdnematullah1343@gmail.com"],
    ["6", "A sandbox restart wiped the production database and build", "Full recovery from the 1 November snapshot: 5 users, 17 poems, 7 articles, 16 books and all settings restored; design settings re-applied; automated daily backups continue to guard the data"],
    ["7", "Administrator accounts created with the initial password could use the panel immediately", "mustChangePassword flag now enforced by the panel layout itself, not merely displayed"],
    ["8", "No way to manage navigation or create new pages without code", "Navigation editor and custom-pages manager added to the admin panel"],
  ],
  [5, 45, 50]
));

/* Section 3 */
bodyChildren.push(h1("3. Features Tested Successfully"));
bodyChildren.push(body("Three automated end-to-end suites run against the live production server — 100 checks in total, all passing. Test residue is removed automatically after each run; the final database contains only the genuine accounts and content."));
bodyChildren.push(caption("Table 2 — Test suites"));
bodyChildren.push(makeTable(
  ["Suite", "Checks", "Covers"],
  [
    ["test-upgrade.js", "38 / 38 PASS", "Content publishing, submissions workflow, scheduled publishing, ads, comments, likes, backups, admin permissions, mail resend"],
    ["test-gaps.js", "30 / 30 PASS", "Email template editing and rendering, database backups (create/download/delete, path-traversal blocked), custom colors applied site-wide, unauthorized access blocked (403)"],
    ["test-auth-otp.js (new)", "32 / 32 PASS", "Registration strength rules, welcome mail, remember-me login, OTP request rate limits, wrong-code attempt limits, code verification, single-use ticket, password reset, old password rejected, confirmation mail, change-password, profile & social links, liked-items list, 5-admin maximum, forced first-login change"],
  ],
  [22, 16, 62]
));
bodyChildren.push(h2("3.1 Manual verification"));
bodyChildren.push(bullet("Registration, login, forgot-password (two-step OTP entry), reset-password and dashboard tabs verified visually in a real browser at desktop and mobile widths."));
bodyChildren.push(bullet("The administrator first-login gate verified live: an account with the initial password sees only the change-password screen until a personal password is set."));
bodyChildren.push(bullet("A wrong OTP code shows the remaining attempt count and increments the server-side counter; a correct code issues the one-time reset ticket."));
bodyChildren.push(bullet("Custom page rendering verified: an existing slug returns 200 with styled content; an unknown slug returns 404."));
bodyChildren.push(bullet("Zero JavaScript console errors on the homepage, books library and admin dashboard; no horizontal overflow at 390 px."));

/* Section 4 */
bodyChildren.push(h1("4. Features Requiring External Configuration"));
bodyChildren.push(makeTable(
  ["Requirement", "Where", "Instruction"],
  [
    ["Gmail SMTP App Password", "Admin Panel → Email Centre", "Enable 2-step verification on the Gmail account, create an App Password, enter it with smtp.gmail.com port 587. Until then every notification is queued as PENDING in the Mail Centre and can be resent with one click after configuration."],
    ["Public site URL", "Admin Panel → Settings → siteUrl", "Set the final domain (e.g. https://payameadab.com) so email links point to the live site."],
    ["Licensed font files", "public/fonts/", "9 of the 10 approved fonts are installed. AA Sameer Sagar Nastaleeq requires its licensed TTF at public/fonts/AASameerSagarNastaleeq.ttf; the Typography panel shows its availability status honestly."],
    ["GitHub push token", "Repository settings", "The clean repository is ready to push (3 commits). The current fine-grained token still returns 403 (Contents is Read-only). Create a classic token at github.com/settings/tokens/new with the repo scope and share it, or set Contents: Read and write on the fine-grained token."],
  ],
  [24, 22, 54]
));

/* Section 5 */
bodyChildren.push(h1("5. Remaining Limitations"));
bodyChildren.push(bullet([bold("Email delivery is queue-based until SMTP is configured. "), plain("All notification logic, templates, preview and resend work today; nothing is fake, but real sending requires the Gmail App Password above.")]));
bodyChildren.push(bullet([bold("Book reading uses page-image/PDF rendering. "), plain("The digital reader opens uploaded PDFs and page images with zoom and navigation; a bespoke flipbook engine was not part of the specification and is not required for correctness.")]));
bodyChildren.push(bullet([bold("One font file pending. "), plain("AA Sameer Sagar Nastaleeq is selectable only after its licensed file is provided (the panel says so explicitly rather than silently substituting).")]));
bodyChildren.push(bullet([bold("Editor roles are permission-based. "), plain("The spec suggests named roles (Editor, Content Manager); the implementation is strictly stronger — 13 permission modules enforced in the backend per administrator, with the Super Admin (owner email) always in control. Named role labels can be added cosmetically later without changing enforcement.")]));
bodyChildren.push(bullet([bold("GitHub backup pending one token. "), plain("Everything is committed and verified clean (no .env, no database, no private uploads in history); only the writable token is outstanding.")]));

bodyChildren.push(h1("6. Final State"));
bodyChildren.push(body("The platform stands at version 3.2: a secure, tested, fully admin-manageable Urdu literary publishing system that matches the approved design mockups, with genuine user accounts, Gmail OTP recovery, editorial workflows and email notifications. The database currently holds 3 administrator accounts (the three supplied addresses; two of them will be asked to set personal passwords on first login), 2 ordinary member accounts, 17 poems, 7 published articles, 16 books, 1 newspaper edition, 1 competition, 2 events and 2 active advertisements — all real content, with automatic daily backups. Once the SMTP App Password is entered and the GitHub token is provided, the platform is fully production-ready with no remaining engineering dependencies."));

/* ---------- document assembly ---------- */
const doc = new Document({
  features: { updateFields: true },
  styles: { default: { document: {
    run: { font: { ascii: "Calibri" }, size: 22, color: P.body },
    paragraph: { spacing: { line: 312 } },
  }}},
  sections: [
    { // cover — margin 0, no header/footer
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: cover,
    },
    { // TOC — roman numbering
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 }, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: P.secondary })] })] }) },
      children: [
        new Paragraph({ spacing: { before: 200, after: 240 }, alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, color: P.primary })] }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({ text: "Note: This Table of Contents is generated via field codes. To ensure page number accuracy after editing, please right-click the TOC and select \"Update Field.\"", italics: true, size: 18, color: "888888" })],
        }),
      ],
    },
    { // body — arabic numbering restart
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 }, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: { default: new Header({ children: [new Paragraph({
        alignment: AlignmentType.RIGHT,
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: P.accent, space: 4 } },
        children: [new TextRun({ text: "PAYAM-E-ADAB — Development Report · Version 3.2", size: 16, color: P.secondary, font: { ascii: "Calibri" } })],
      })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: P.secondary })] })] }) },
      children: bodyChildren,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/home/z/my-project/download/Payam-e-Adab-Development-Report.docx", buf);
  console.log("OK — report written");
});
