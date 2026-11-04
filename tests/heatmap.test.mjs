import { test } from "node:test";
import assert from "node:assert/strict";
import { encounterHeatData } from "../lib/heatmap.ts";
test("density uses only supplied public note points, once per note", () => {
 const p = {id:"one",lat:40.7,lon:-74,demo:false};
 const data = encounterHeatData([p,p,{id:"two",lat:40.71,lon:-74.01,demo:true},{id:"invalid",lat:NaN,lon:0}]);
 assert.equal(data.features.length,2);
 assert.deepEqual(data.features[0].geometry.coordinates,[-74,40.7]);
 assert.equal(data.features[1].properties.example,true);
 assert.deepEqual(Object.keys(data.features[0].properties).sort(),["example","id"]);
});
test("empty/filtered feeds clear density instead of retaining old points",()=>{
 assert.deepEqual(encounterHeatData([]),{type:"FeatureCollection",features:[]});
});

test("heat stays above geometry without covering the final label stack", async () => {
 const { heatmapBeforeLabels } = await import("../lib/heatmap.ts");
 assert.equal(heatmapBeforeLabels([
  {id:"water",type:"fill"}, {id:"road-arrows",type:"symbol"},
  {id:"buildings",type:"fill"}, {id:"streets",type:"symbol"},
  {id:"venues",type:"symbol"}
 ]), "streets");
 assert.equal(heatmapBeforeLabels([{id:"water",type:"fill"}]), undefined);
});
