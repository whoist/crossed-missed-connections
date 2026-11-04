import {
  db,
  guard,
  member,
  json,
  body,
  HttpError,
  blocked,
  limit,
  pairKey,
} from "@/lib/server";
import { clean, ownsThread } from "@/lib/domain";
async function authorized(id: string, user: string) {
  const ref = db().collection("threads").doc(id),
    t = (await ref.get()).data() as
      | { owner: string; respondent: string }
      | undefined;
  if (!t || !ownsThread(t, user) || (await blocked(t.owner, t.respondent)))
    throw new HttpError("Conversation not available.", 404);
  return { ref, t };
}
export const GET = (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) =>
  guard(async () => {
    const user = await member(),
      { id } = await params,
      { ref } = await authorized(id, user);
    const rows = await ref
      .collection("messages")
      .orderBy("created", "desc")
      .limit(200)
      .get();
    return json({
      messages: rows.docs.reverse().map((d) => {
        const m = d.data();
        return {
          id: d.id,
          body: m.body,
          created: m.created,
          mine: m.sender === user,
        };
      }),
    });
  });
export const POST = (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) =>
  guard(async () => {
    const b = await body(req),
      user = await member(),
      { id } = await params,
      { ref, t } = await authorized(id, user);
    if (b.action === "block") {
      const other = t.owner === user ? t.respondent : t.owner;
      await db()
        .collection("blocks")
        .doc(pairKey(user, other))
        .set({ user, blocked: other, members: [user, other] });
      return json({ ok: true });
    }
    let message;
    try {
      message = clean(b.message, 1, 1500, "Message");
    } catch (e) {
      throw new HttpError((e as Error).message);
    }
    await limit(user, "message", 60, 3600);
    const batch = db().batch(),
      now = Date.now();
    batch.set(ref.collection("messages").doc(), {
      sender: user,
      body: message,
      created: now,
    });
    batch.update(ref, { preview: message, updated: now });
    await batch.commit();
    return json({ ok: true });
  });
