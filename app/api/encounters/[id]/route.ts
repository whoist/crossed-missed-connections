import {
  body,
  db,
  guard,
  member,
  json,
  HttpError,
  limit,
  blocked,
  pairKey,
} from "@/lib/server";
import { clean } from "@/lib/domain";
export const POST = (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) =>
  guard(async () => {
    const b = await body(req),
      user = await member(),
      { id } = await params;
    const ref = db().collection("encounters").doc(id),
      post = (await ref.get()).data();
    if (!post || post.status !== "active" || (await blocked(user, post.owner)))
      throw new HttpError("This note is not available.", 404);
    if (b.action === "save") {
      const saved = db()
        .collection("profiles")
        .doc(user)
        .collection("saved")
        .doc(id);
      const result = await db().runTransaction(async (tx) => {
        const exists = (await tx.get(saved)).exists;
        if (exists) tx.delete(saved);
        else tx.set(saved, { encounter: id, owner: post.owner });
        return !exists;
      });
      return json({ saved: result });
    }
    if (b.action === "delete") {
      if (post.owner !== user)
        throw new HttpError("You can only remove your own note.", 403);
      await ref.update({ status: "removed" });
      return json({ ok: true });
    }
    if (b.action === "report") {
      if (post.owner === user)
        throw new HttpError("You can remove your own note instead.");
      let reason;
      try {
        reason = clean(b.reason, 5, 500, "Reason");
      } catch (e) {
        throw new HttpError((e as Error).message);
      }
      await limit(user, "report", 20, 86400);
      await db()
        .collection("reports")
        .doc(pairKey(user, id))
        .set({
          user,
          owner: post.owner,
          encounter: id,
          reason,
          created: Date.now(),
        });
      return json({ ok: true });
    }
    if (b.action === "reply") {
      if (post.owner === user) throw new HttpError("This is your own note.");
      let message;
      try {
        message = clean(b.message, 10, 1500, "Reply");
      } catch (e) {
        throw new HttpError((e as Error).message);
      }
      await limit(user, "reply", 20, 86400);
      const thread = db().collection("threads").doc(pairKey(id, user)),
        now = Date.now();
      await db().runTransaction(async (tx) => {
        const existing = await tx.get(thread);
        if (!existing.exists)
          tx.set(thread, {
            encounter: id,
            owner: post.owner,
            respondent: user,
            members: [post.owner, user],
            created: now,
            updated: now,
            preview: message,
          });
        else tx.update(thread, { updated: now, preview: message });
        tx.set(thread.collection("messages").doc(), {
          sender: user,
          body: message,
          created: now,
        });
      });
      return json({ thread: thread.id });
    }
    throw new HttpError("Unknown action.");
  });
