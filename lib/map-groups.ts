import type { Encounter } from "./domain";

export type NoteGroup = { members: Encounter[]; x: number; y: number };
/** One deterministic partition drives the count badge, heat and group contents. */
export function groupNotes(
  posts: Encounter[],
  project: (coordinate: [number, number]) => { x: number; y: number },
  radius = 56,
): NoteGroup[] {
  const groups: (NoteGroup & { points: { x: number; y: number }[] })[] = [];
  const seen = new Set<string>();
  // Stable geographical order prevents changes caused by feed sorting.
  for (const post of [...posts].sort((a,b)=>a.lon-b.lon || a.lat-b.lat || a.id.localeCompare(b.id))) {
    if (seen.has(post.id) || !Number.isFinite(post.lat) || !Number.isFinite(post.lon)) continue;
    seen.add(post.id);
    const p = project([post.lon,post.lat]);
    let group = groups.find(g => {
      const x=(g.x*g.members.length+p.x)/(g.members.length+1);
      const y=(g.y*g.members.length+p.y)/(g.members.length+1);
      return Math.hypot(g.x-p.x,g.y-p.y)<=radius &&
        [...g.points,p].every(point=>Math.hypot(point.x-x,point.y-y)<=radius);
    });
    if (!group) {
      group={members:[],points:[],x:p.x,y:p.y};groups.push(group);
    }
    group.x=(group.x*group.members.length+p.x)/(group.members.length+1);
    group.y=(group.y*group.members.length+p.y)/(group.members.length+1);
    group.members.push(post);group.points.push(p);
  }
  return groups.map(({members,x,y})=>({members,x,y}));
}

export function noteCountLabel(count: number): string {
  return `${count} ${count === 1 ? "note" : "notes"}`;
}
