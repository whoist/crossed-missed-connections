import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { adminAuth } from "./firebase-admin";
export const sha256 = (s: string) =>
  createHash("sha256").update(s).digest("hex");
function local(host: string) {
  return (
    !process.env.VERCEL &&
    /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)
  );
}
export const cookieName = (host: string) =>
  local(host) ? "crossed_session" : "__Host-crossed_session";
export function sessionCookie(req: Request, token: string, clear = false) {
  const host = new URL(req.url).host;
  return `${cookieName(host)}=${clear ? "" : token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear ? 0 : 432000}${local(host) ? "" : "; Secure"}`;
}
export async function currentUser() {
  const h = await headers();
  const prefix = cookieName(h.get("host") ?? "") + "=";
  const token = (h.get("cookie") ?? "")
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(prefix))
    ?.slice(prefix.length);
  if (!token || token.length > 8192) return null;
  try {
    const u = await adminAuth().verifySessionCookie(token, true);
    return u.email_verified
      ? { id: u.uid, email: u.email ?? "", authTime: u.auth_time }
      : null;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (
      code &&
      /^(auth\/(session-cookie|id-token|argument-error|user-not-found|user-disabled|invalid-argument))/.test(
        code,
      )
    )
      return null;
    throw error;
  }
}
export function rateIdentity(req: Request) {
  // Vercel overwrites x-vercel-forwarded-for. Do not trust arbitrary forwarded-for headers.
  const ip = process.env.VERCEL
    ? (req.headers.get("x-vercel-forwarded-for") ?? "unavailable")
    : (req.headers.get("cf-connecting-ip") ?? "local");
  return sha256(ip + new Date().toISOString().slice(0, 10));
}
