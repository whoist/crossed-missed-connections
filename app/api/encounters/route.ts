import { currentUser } from "@/lib/auth";
import {
  body,
  db,
  guard,
  member,
  json,
  limit,
  HttpError,
  blockedIds,
} from "@/lib/server";
import { parseEncounter } from "@/lib/domain";
export const GET = () =>
  guard(async () => {
    const user = await currentUser(),
      id = user?.id ?? "";
    const [posts, hidden, saves, reports] = await Promise.all([
      db().collection("encounters").orderBy("created", "desc").limit(250).get(),
      blockedIds(id),
      id ? db().collection("profiles").doc(id).collection("saved").get() : null,
      id ? db().collection("reports").where("user", "==", id).get() : null,
    ]);
    const saved = new Set(saves?.docs.map((d) => d.id)),
      reported = new Set(reports?.docs.map((d) => d.data().encounter));
    const candidates = posts.docs.filter((d) => {
      const p = d.data();
      return (
        p.status === "active" && !hidden.has(p.owner) && !reported.has(d.id)
      );
    });
    const owners = [
      ...new Set(candidates.map((d) => d.data().owner as string)),
    ];
    const profiles = owners.length
      ? await db().getAll(
          ...owners.map((id) => db().collection("profiles").doc(id)),
        )
      : [];
    const aliases = new Map(
      profiles
        .filter((p) => p.exists && !p.data()?.deleting)
        .map((p) => [p.id, p.data()!.alias]),
    );
    return json({
      encounters: candidates
        .filter((d) => aliases.has(d.data().owner))
        .map((d) => {
          const p = d.data();
          return {
            id: d.id,
            title: p.title,
            story: p.story,
            question: p.question || "",
            place: p.place,
            city: p.city,
            category: p.category,
            lat: p.lat,
            lon: p.lon,
            happened: p.happened,
            created: p.created,
            alias: aliases.get(p.owner),
            mine: p.owner === id,
            saved: saved.has(d.id),
          };
        }),
    });
  });
export const POST = (req: Request) =>
  guard(async () => {
    const b = await body(req),
      user = await member();
    let p;
    try {
      p = parseEncounter(b);
    } catch (e) {
      throw new HttpError((e as Error).message);
    }
    await limit(user, "post", 5, 86400);
    const ref = db().collection("encounters").doc();
    await ref.set({ ...p, owner: user, created: Date.now(), status: "active" });
    return json({ id: ref.id }, 201);
  });
