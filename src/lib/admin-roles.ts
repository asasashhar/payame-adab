/**
 * Role presets for administrator accounts (spec §4).
 * A role is a named permission profile mapped onto the enforced module keys
 * (see PERMISSION_MODULES in lib/auth). The server still enforces the
 * resulting permissions CSV — roles are safe shortcuts, not a separate authority.
 * The owner account (@admin) always keeps "*" regardless of role.
 */

import { PERMISSION_MODULES } from "@/lib/auth";

export type RoleId = "super-admin" | "admin" | "editor" | "content-manager";

const ALL_KEYS = PERMISSION_MODULES.map((m) => m.key);

export const ROLE_PRESETS: {
  id: RoleId;
  labelUrdu: string;
  labelEn: string;
  descriptionUrdu: string;
  permissions: string[] | "*";
}[] = [
  {
    id: "super-admin",
    labelUrdu: "سپر ایڈمن",
    labelEn: "Super Admin",
    descriptionUrdu: "پورے پینل پر مکمل اختیار — ایڈمنسٹریٹرز اور سیکیورٹی سمیت",
    permissions: "*",
  },
  {
    id: "admin",
    labelUrdu: "ایڈمن",
    labelEn: "Admin",
    descriptionUrdu: "تمام عملی حصے؛ ایڈمنسٹریٹرز کا انتظام اور سیکیورٹی لاگ شامل نہیں",
    permissions: ALL_KEYS.filter((k) => k !== "admins" && k !== "security"),
  },
  {
    id: "editor",
    labelUrdu: "ایڈیٹر",
    labelEn: "Editor",
    descriptionUrdu: "منظوری مرکز، مواد، اخبار، ہوم پیج، تبصرے اور ادبی اوزار",
    permissions: ["submissions", "content", "newspaper", "homepage", "engagement", "tools"],
  },
  {
    id: "content-manager",
    labelUrdu: "مواد مینیجر",
    labelEn: "Content Manager",
    descriptionUrdu: "مواد اور جمع کرانہ جات، اشتہارات اور ہوم پیج سیکشنز",
    permissions: ["content", "submissions", "ads", "homepage", "engagement"],
  },
];

export function rolePermissions(id: RoleId): string {
  const role = ROLE_PRESETS.find((r) => r.id === id);
  if (!role) return "*";
  return role.permissions === "*" ? "*" : role.permissions.join(",");
}

/** Best-effort human label for a permissions CSV (used in lists). */
export function permissionsLabel(perms: string | undefined): string {
  const p = (perms ?? "*").trim();
  if (!p || p === "*") return "سپر ایڈمن — تمام اجازتیں";
  const keys = p.split(",").map((x) => x.trim()).filter(Boolean);
  for (const r of ROLE_PRESETS) {
    if (r.permissions !== "*" && r.permissions.length === keys.length && r.permissions.every((k) => keys.includes(k))) {
      return `${r.labelUrdu} (${r.labelEn})`;
    }
  }
  return `${keys.length} حصے`;
}
