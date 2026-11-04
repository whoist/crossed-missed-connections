import { body, db, guard, json, limit, HttpError } from "@/lib/server";
import { adminAuth } from "@/lib/firebase-admin";
import { currentUser, rateIdentity, sessionCookie } from "@/lib/auth";
import { clean, publicText } from "@/lib/domain";
export const runtime = "nodejs";
export const POST = (req: Request) =>
  guard(async () => {
    const b = await body(req);
    if (b.action === "logout") {
      const u = await currentUser();
      if (u) await adminAuth().revokeRefreshTokens(u.id);
      const res = json({ ok: true });
      res.headers.set("Set-Cookie", sessionCookie(req, "", true));
      return res;
    }
    if (
      b.action !== "session" ||
      typeof b.idToken !== "string" ||
      b.idToken.length > 8192
    )
      throw new HttpError("Unknown account action.");
    await limit(rateIdentity(req), "session", 20, 900);
    let u;
    try {
      u = await adminAuth().verifyIdToken(b.idToken, true);
    } catch {
      throw new HttpError("Please sign in again.", 401);
    }
    if (!u.email_verified)
      throw new HttpError("Verify your email, then sign in to continue.", 403);
    if (Date.now() / 1000 - u.auth_time > 300)
      throw new HttpError("Please sign in again.", 401);
    let profile = (await db().collection("profiles").doc(u.uid).get()).data();
    if (profile?.deleting)
      throw new HttpError("Account deletion is in progress.", 403);
    if (!profile && b.adult === true && b.alias) {
      let alias;
      try {
        alias = publicText(clean(b.alias, 2, 28, "Display name"));
      } catch (e) {
        throw new HttpError((e as Error).message);
      }
      const ref = db().collection("profiles").doc(u.uid);
      await db().runTransaction(async (tx) => {
        if (!(await tx.get(ref)).exists)
          tx.set(ref, { alias, adult: true, created: Date.now() });
      });
      profile = (await ref.get()).data();
    }
    const session = await adminAuth().createSessionCookie(b.idToken, {
      expiresIn: 5 * 86400000,
    });
    const res = json({
      signedIn: true,
      profile: profile ? { alias: profile.alias } : null,
      email: u.email,
    });
    res.headers.set("Set-Cookie", sessionCookie(req, session));
    return res;
  });
