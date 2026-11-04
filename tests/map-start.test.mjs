import {test} from 'node:test';
import assert from 'node:assert/strict';
import {MANHATTAN,requestMapLocation} from '../lib/map-start.ts';

test('map startup uses permitted US coordinates, with bounded low-power options', async()=>{
 const result=await requestMapLocation({getCurrentPosition(ok,fail,options){
  assert.equal(options.enableHighAccuracy,false);assert.equal(options.timeout,6000);
  ok({coords:{latitude:41.88,longitude:-87.63}});
 }});
 assert.equal(result.reason,'located');assert.deepEqual(result.location,{lat:41.88,lon:-87.63});
});
test('denied, unavailable, thrown and outside-US locations all fall back to Manhattan',async()=>{
 for(const geo of [undefined,{getCurrentPosition(_,fail){fail({code:1});}},{getCurrentPosition(_,fail){fail({code:3});}},{getCurrentPosition(){throw Error('blocked');}},{getCurrentPosition(ok){ok({coords:{latitude:38,longitude:37}});}}]){
  const r=await requestMapLocation(geo);assert.deepEqual(r.location,MANHATTAN);assert.notEqual(r.reason,'located');
 }
});
test('an unanswered prompt falls back, and a late permission callback cannot move the map', async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let success;const promise=requestMapLocation({getCurrentPosition(ok){success=ok;}});
 t.mock.timers.tick(8001);
 const result=await promise;assert.deepEqual(result.location,MANHATTAN);
 success({coords:{latitude:41.88,longitude:-87.63}});
 assert.deepEqual((await promise).location,MANHATTAN);
});
