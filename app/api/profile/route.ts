import { currentUser, sessionCookie } from "@/lib/auth";
import { adminAuth } from "@/lib/firebase-admin";
import { body, db, guard, identity, json, HttpError } from "@/lib/server";
import { clean, publicText } from "@/lib/domain";
import type { Query } from "firebase-admin/firestore";
export const GET = () =>
  guard(async () => {
    const u = await currentUser(),
      p = u ? (await db().collection("profiles").doc(u.id).get()).data() : null;
    return json({
      signedIn: !!u,
      profile: p && !p.deleting ? { alias: p.alias } : null,
      email: u?.email,
    });
  });
async function deleteQuery(query: Query) {
  while (true) {
    const batch = await query.limit(200).get();
    if (batch.empty) return;
    await Promise.all(batch.docs.map((d) => db().recursiveDelete(d.ref)));
  }
}
export const POST = (req: Request) =>
  guard(async () => {
    const b = await body(req),
      id = await identity(),
      ref = db().collection("profiles").doc(id);
    if (b.action === "delete-account") {
      if (b.confirm !== "DELETE")
        throw new HttpError("Type DELETE to confirm.");
      const user = await currentUser();
      if (!user || Date.now() / 1000 - user.authTime > 300)
        throw new HttpError(
          "Sign out and sign in again before deleting your account.",
          401,
        );
      // A tombstone blocks writes; a retry safely resumes partially completed cleanup.
      await ref.set({ deleting: true }, { merge: true });
      await deleteQuery(
        db().collection("threads").where("members", "array-contains", id),
      );
      await deleteQuery(db().collection("encounters").where("owner", "==", id));
      await deleteQuery(db().collectionGroup("saved").where("owner", "==", id));
      await deleteQuery(db().collection("reports").where("user", "==", id));
      await deleteQuery(db().collection("reports").where("owner", "==", id));
      await deleteQuery(
        db().collection("blocks").where("members", "array-contains", id),
      );
      await db().recursiveDelete(ref);
      await adminAuth().deleteUser(id);
      const res = json({ ok: true });
      res.headers.set("Set-Cookie", sessionCookie(req, "", true));
      return res;
    }
    let alias;
    try {
      alias = publicText(clean(b.alias, 2, 28, "Display name"));
    } catch (e) {
      throw new HttpError((e as Error).message);
    }
    if (b.adult !== true)
      throw new HttpError("Crossed is for adults 18 and older.");
    await db().runTransaction(async (tx) => {
      const p = await tx.get(ref);
      if (p.data()?.deleting)
        throw new HttpError("Account deletion is in progress.", 403);
      tx.set(
        ref,
        { alias, adult: true, ...(!p.exists ? { created: Date.now() } : {}) },
        { merge: true },
      );
    });
    return json({ profile: { alias } });
  });
