import {test} from 'node:test';
import assert from 'node:assert/strict';
import {groupNotes,noteCountLabel} from '../lib/map-groups.ts';
const point=(id,lon,lat=0)=>({id,lon,lat,title:id});
const project=([x,y])=>({x,y});
test('one note is labeled 1 note, never its feed position',()=>{
 assert.equal(noteCountLabel(1),'1 note');
 assert.equal(noteCountLabel(12),'12 notes');
 const groups=groupNotes(Array.from({length:12},(_,i)=>point(String(i),i*100)),project);
 assert.equal(groups.length,12);
 assert.ok(groups.every(g=>g.members.length===1));
});
test('coincident notes remain individually accessible through the group',()=>{
 const posts=Array.from({length:12},(_,i)=>point(String(i),50,20));
 const [g]=groupNotes([...posts,posts[0]],project);
 assert.equal(g.members.length,12);
 assert.equal(g.x,50);assert.equal(g.y,20);
 assert.deepEqual(new Set(g.members.map(p=>p.id)),new Set(posts.map(p=>p.id)));
});
test('zoom separates nearby venues without losing or double-counting notes',()=>{
 const posts=[point('a',0),point('b',10),point('c',20),point('d',200)];
 const far=groupNotes(posts,project);
 const close=groupNotes(posts,([x,y])=>({x:x*10,y:y*10}));
 assert.deepEqual(far.map(g=>g.members.length),[3,1]);
 assert.equal(close.length,4);
 assert.equal(close.reduce((n,g)=>n+g.members.length,0),posts.length);
 assert.deepEqual(groupNotes([...posts].reverse(),project),far);
 const filtered=groupNotes(posts.filter(p=>p.id!=='b'),project);
 assert.equal(filtered.reduce((n,g)=>n+g.members.length,0),3);
});
test('a chain of nearby points cannot drag a group beyond its local radius',()=>{
 const groups=groupNotes(Array.from({length:20},(_,i)=>point(String(i),i*18)),project,28);
 assert.ok(groups.length>1);
 for(const g of groups)for(const p of g.members)assert.ok(Math.hypot(p.lon-g.x,p.lat-g.y)<=28);
});
