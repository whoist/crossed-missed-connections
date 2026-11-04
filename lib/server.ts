import { db } from "./firebase-admin";
import { currentUser, sha256 } from "./auth";
export { db };
export class HttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export async function identity() {
  const u = await currentUser();
  if (!u) throw new HttpError("Sign in to continue.", 401);
  return u.id;
}
export async function member() {
  const id = await identity(),
    p = (await db().collection("profiles").doc(id).get()).data();
  if (!p?.adult || p.deleting)
    throw new HttpError(
      "Choose your display name and confirm you're 18 or older.",
      428,
    );
  return id;
}
export async function body(req: Request) {
  const origin = req.headers.get("origin");
  const localHost = req.headers.get("host") || "";
  const expectedOrigin =
    process.env.APP_ORIGIN ||
    (!process.env.VERCEL && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(localHost)
      ? `http://${localHost}`
      : new URL(req.url).origin);
  if (!origin || origin !== expectedOrigin)
    throw new HttpError("Request origin not allowed.", 403);
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new HttpError("Expected JSON.", 415);
  if (Number(req.headers.get("content-length") ?? 0) > 10000)
    throw new HttpError("Request too large.", 413);
  const text = await req.text();
  if (text.length > 10000) throw new HttpError("Request too large.", 413);
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError("Invalid request.");
  }
}
export async function limit(
  id: string,
  kind: string,
  max: number,
  seconds: number,
) {
  const now = Math.floor(Date.now() / 1000),
    bucket = Math.floor(now / seconds);
  const ref = db()
    .collection("limits")
    .doc(sha256(`${kind}:${id}:${bucket}`));
  const count = await db().runTransaction(async (tx) => {
    const snap = await tx.get(ref),
      count = Number(snap.data()?.count ?? 0) + 1;
    if (count > max)
      throw new HttpError(
        "You've reached the limit for now. Please try again later.",
        429,
      );
    tx.set(ref, { count, expires: new Date((now + seconds) * 1000) });
    return count;
  });
  if (count % 50 === 0) {
    const expired = await db()
      .collection("limits")
      .where("expires", "<", new Date((now - 86400) * 1000))
      .limit(100)
      .get();
    if (!expired.empty) {
      const batch = db().batch();
      expired.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
}
export async function guard(action: () => Promise<Response>) {
  try {
    return await action();
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(
      "Crossed request failed",
      e instanceof Error ? e.name : "UnknownError",
    );
    return json({ error: "That didn't go through. Please try again." }, 500);
  }
}
export const pairKey = (a: string, b: string) => sha256(JSON.stringify([a, b]));
export async function blocked(a: string, b: string) {
  const docs = await db().getAll(
    db().collection("blocks").doc(pairKey(a, b)),
    db().collection("blocks").doc(pairKey(b, a)),
  );
  return docs.some((d) => d.exists);
}
export async function blockedIds(id: string) {
  if (!id) return new Set<string>();
  const rows = await db()
    .collection("blocks")
    .where("members", "array-contains", id)
    .get();
  return new Set(
    rows.docs.map((d) => {
      const b = d.data();
      return b.user === id ? b.blocked : b.user;
    }),
  );
}
