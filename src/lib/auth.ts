import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";

const SECRET = process.env.AUTH_SECRET || "payam-e-adab-secret-key-2024";
const COOKIE = "pea_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const candidate = scryptSync(password, salt, 64);
    return timingSafeEqual(candidate, Buffer.from(hash, "hex"));
  } catch {
    return false;
  }
}

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

export function createToken(userId: string): string {
  const payload = Buffer.from(JSON.stringify({ userId, ts: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readToken(token: string): string | null {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expected = sign(payload);
    if (sig.length !== expected.length) return null;
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (Date.now() - data.ts > MAX_AGE * 1000) return null;
    return data.userId;
  } catch {
    return null;
  }
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  penName: string | null;
  bio: string | null;
  photoUrl: string | null;
  role: string;
  status: string;
  emailVerified?: boolean;
  permissions?: string;
  mustChangePassword?: boolean;
  socials?: string | null;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (!token) return null;
    const userId = readToken(token);
    if (!userId) return null;
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user || user.status === "SUSPENDED") return null;
    const { passwordHash: _ph, ...safe } = user;
    return safe as SessionUser;
  } catch {
    return null;
  }
}

export async function setSessionCookie(userId: string, remember = false) {
  const store = await cookies();
  // When served over HTTPS (the published site and the chat preview iframe),
  // the app runs inside a cross-site context, so SameSite=Lax cookies are never
  // sent back — logins would "succeed" but the session never sticks. Pair
  // SameSite=None with Secure there; plain Lax is correct for local http.
  const proto = ((await headers()).get("x-forwarded-proto") ?? "").split(",")[0].trim();
  const https = proto === "https";
  store.set(COOKIE, createToken(userId), {
    httpOnly: true,
    sameSite: https ? "none" : "lax",
    secure: https,
    path: "/",
    // "remember me" → persistent 30-day cookie, otherwise a browser-session cookie
    ...(remember ? { maxAge: MAX_AGE } : {}),
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

/** Admin permission modules live in permission-modules.ts (client-safe data);
 * auth.ts re-exports for server code. */
export { PERMISSION_MODULES } from "@/lib/permission-modules";

/**
 * Server-side permission check for an admin module.
 * Owner (ownerEmail setting) and "*"-permission admins always pass.
 */
export async function hasAdminPerm(user: SessionUser, module: string): Promise<boolean> {
  if (user.role !== "ADMIN") return false;
  try {
    const owner = await db.setting.findUnique({ where: { key: "ownerEmail" } });
    if (owner?.value && owner.value.trim().toLowerCase() === user.email.toLowerCase()) return true;
  } catch { /* fall through */ }
  const perms = (user as { permissions?: string }).permissions ?? "*";
  if (!perms || perms === "*") return true;
  return perms.split(",").map((x) => x.trim()).includes(module);
}

/** requireAdmin + module permission in one step; returns null when denied. */
export async function requireAdminPerm(user: SessionUser, module: string): Promise<SessionUser | null> {
  if (await hasAdminPerm(user, module)) return user;
  return null;
}

export async function logActivity(action: string, detail: string, actorEmail?: string) {
  try {
    await db.activityLog.create({ data: { action, detail, actorEmail: actorEmail || null } });
  } catch {}
}
