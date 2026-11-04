import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {categories,inUSBounds,parseEncounter} from '../lib/domain.ts';
const read = name => JSON.parse(readFileSync(new URL('../lib/'+name,import.meta.url),'utf8'));
const venues=read('demo-venues.json'), stories=read('demo-stories.json');
test('500 adapted examples resolve to compatible mapped venues and distinct fictional source rows',()=>{
 assert.equal(stories.length,500);
 assert.equal(new Set(stories.map(n=>n.id)).size,500);
 // Short person descriptions may repeat; stories and stable IDs must not.
 assert.ok(stories.every(n=>n.title.length<=32 && n.title.split(/\s+/).length<=6));
 assert.equal(new Set(stories.map(n=>n.story)).size,500);
 const audit=JSON.parse(readFileSync(new URL('../docs/demo-adaptations.json',import.meta.url),'utf8'));
 assert.equal(audit.records.length,500);
 assert.equal(new Set(audit.records.map(r=>r.sourceNumber)).size,500);
 const sources=new Map(audit.records.map(r=>[r.id,r]));
 assert.equal(venues.length,232);
 assert.ok(new Set(venues.map(v=>v.city)).size>=10);
 assert.equal(new Set(venues.map(v=>v.name+'|'+v.city)).size,232);
 for(const v of venues){
  assert.equal(v.fictional,true);
  assert.ok(inUSBounds(v.lat,v.lon));
  assert.ok(categories.includes(v.category));
  assert.ok(v.sourceUrls.includes(v.coordinateSource));
  assert.ok(v.coordinateSource.startsWith('https://www.openstreetmap.org/'));
  assert.ok(v.coordinateEvidence.osmId);
 }
 const usage = new Set();
 const counts = new Map();
 const locations=read("demo-locations.json");
 assert.deepEqual(locations,venues.map(({name,city,category,lat,lon})=>({name,city,category,lat,lon})));
 let focus=0,questions=0;
 for(const n of stories){
  const v=venues[n.venue];assert.ok(v,`Missing venue for ${n.id}`);usage.add(n.venue);counts.set(n.venue,(counts.get(n.venue)||0)+1);
  assert.ok(n.id.startsWith('demo-bb-'));
  const source=sources.get(n.id);assert.ok(source);
  assert.equal(source.venueIndex,n.venue);
  assert.ok(source.allowedKinds.includes(source.destinationKind));
  assert.ok(source.sourceText.length>40);
  assert.ok(!/emotional support|oat milk conspiracy|small coup/i.test(n.story));
  if(['Coffee & cafés','Campus'].includes(v.category))focus++;
  if(n.question)questions++;
  assert.doesNotThrow(()=>parseEncounter({title:n.title,story:n.story,question:n.question,place:v.name,city:v.city,category:v.category,lat:v.lat,lon:v.lon,happened:n.happened}));
 }
 assert.equal(usage.size,232);
 assert.ok(Math.max(...counts.values())<=3,"Examples must not pile up at the same venue");
 assert.ok(focus>=450);
 assert.ok(questions>=10);
 // Retired IDs cannot silently become unrelated replacement notes.
 assert.ok(stories.every(n=>!/^demo-\d+$/.test(n.id)));
});

test('short titles avoid automatic venue suffixes and stories are not location-swapped copies',()=>{
 const audit=JSON.parse(readFileSync(new URL('../docs/demo-adaptations.json',import.meta.url),'utf8'));
 const reviews=new Map(audit.records.map(r=>[r.id,r.titleReview]));
 const kinds={};
 const titles=new Map();
 for(const n of stories){
  const r=reviews.get(n.id);
  assert.ok(r,`Missing title review: ${n.id}`);
  assert.equal(r.title,n.title);
  assert.ok(['person','moment','direct','setting','detail'].includes(r.kind));
  kinds[r.kind]=(kinds[r.kind]||0)+1;
  const source=r.evidenceSource==='venue'?venues[n.venue].name:n.story;
  assert.ok(r.evidence.length>5 && source.toLowerCase().includes(r.evidence.toLowerCase()),`Stale title evidence: ${n.id}`);
  titles.set(n.title.toLowerCase(),(titles.get(n.title.toLowerCase())||0)+1);
 }
 // Broad editorial ranges prevent a return to an all-appearance or all-event feed.
 assert.ok(kinds.person>=100 && kinds.person<=200);
 assert.ok(kinds.moment>=100 && kinds.moment<=200);
 assert.ok(kinds.direct>=60 && kinds.direct<=130);
 assert.ok(kinds.setting>=40 && kinds.setting<=100);
 assert.ok(kinds.detail>=10 && kinds.detail<=50);
 assert.ok(Math.max(...titles.values())<=8,'One short title dominates the feed');
 const normalizedWords = text => text.toLowerCase().match(/[a-z']+/g) || [];
 const grams = text => {
  const words=normalizedWords(text);
  return new Set(words.slice(3).map((_,i)=>words.slice(i,i+4).join(' ')));
 };
 const fingerprints=stories.map(n=>grams(n.story));
 for(let i=0;i<stories.length;i++){
  const n=stories[i];
  // A natural short mention such as Curly hair at Philz is allowed.
  assert.ok(!n.title.includes(' — '),`Venue-style title suffix in ${n.id}`);
  for(let j=0;j<i;j++){
   const common=[...fingerprints[i]].filter(g=>fingerprints[j].has(g)).length;
   // Catch reused paragraphs even when opening venue names are different.
   // This is a wording regression check, not a claim that all plots are unrelated.
   assert.ok(common/Math.min(fingerprints[i].size,fingerprints[j].size)<0.4,`Repeated phrasing: ${n.id}, ${stories[j].id}`);
  }
 }
});
