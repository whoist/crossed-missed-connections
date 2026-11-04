import { db, guard, member, json, blockedIds } from "@/lib/server";
export const GET = () =>
  guard(async () => {
    const id = await member();
    const [rows, hidden] = await Promise.all([
      db()
        .collection("threads")
        .where("members", "array-contains", id)
        .orderBy("updated", "desc")
        .limit(100)
        .get(),
      blockedIds(id),
    ]);
    const visible = rows.docs.filter((d) => {
      const t = d.data();
      return !hidden.has(t.owner === id ? t.respondent : t.owner);
    });
    const notes = [
        ...new Set(visible.map((d) => d.data().encounter as string)),
      ],
      people = [
        ...new Set(
          visible.map((d) => {
            const t = d.data();
            return (t.owner === id ? t.respondent : t.owner) as string;
          }),
        ),
      ];
    const [postDocs, profiles] = await Promise.all([
      notes.length
        ? db().getAll(...notes.map((p) => db().collection("encounters").doc(p)))
        : [],
      people.length
        ? db().getAll(...people.map((p) => db().collection("profiles").doc(p)))
        : [],
    ]);
    const posts = new Map(postDocs.map((d) => [d.id, d.data()])),
      aliases = new Map(
        profiles
          .filter((d) => !d.data()?.deleting)
          .map((d) => [d.id, d.data()?.alias]),
      );
    return json({
      threads: visible
        .filter(
          (d) =>
            posts.get(d.data().encounter) &&
            aliases.get(
              d.data().owner === id ? d.data().respondent : d.data().owner,
            ),
        )
        .map((d) => {
          const t = d.data(),
            p = posts.get(t.encounter)!;
          return {
            id: d.id,
            title: p.title,
            place: p.place,
            alias: aliases.get(t.owner === id ? t.respondent : t.owner),
            preview: t.preview,
            updated: t.updated,
          };
        }),
    });
  });
