import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseEncounter,
  publicText,
  ownsThread,
  inUSBounds,
  distanceKm,
} from "../lib/domain.ts";
const good = {
  title: "We met by the fountain",
  story: "You helped me find the station. I wish I had said hello properly.",
  place: "Washington Square Park",
  city: "New York, NY",
  category: "Out & about",
  lat: 40.7308,
  lon: -73.9973,
  happened: "2026-10-01",
};
test("accepts a US encounter with a real calendar date", () =>
  assert.equal(parseEncounter(good).place, good.place));
test("rejects invalid calendar dates and coordinates", () => {
  for (const b of [
    { happened: "2026-02-30" },
    { lat: Infinity },
    { lon: 28.9 },
    { lat: "40.7" },
    { happened: "2099-01-01" },
  ])
    assert.throws(() => parseEncounter({ ...good, ...b }));
});
test("prevents accidental public contact details", () => {
  for (const s of [
    "call +1 (212) 555-0100",
    "name@example.com",
    "https://private.test",
  ])
    assert.throws(() => publicText(s));
  assert.equal(publicText("You had a green tote."), "You had a green tote.");
});
test("only conversation participants may read the thread", () => {
  const t = { owner: "alice", respondent: "bob" };
  assert.equal(ownsThread(t, "alice"), true);
  assert.equal(ownsThread(t, "bob"), true);
  assert.equal(ownsThread(t, "mallory"), false);
  assert.equal(ownsThread(null, "alice"), false);
});
test("US bounds include Alaska and Hawaii; not Turkey", () => {
  assert.equal(inUSBounds(61.2181, -149.9003), true);
  assert.equal(inUSBounds(21.3099, -157.8581), true);
  assert.equal(inUSBounds(38.2, 37.2), false);
});
test("distance filter distinguishes nearby and remote cities", () => {
  assert.ok(distanceKm(good, { lat: 40.731, lon: -73.997 }) < 0.1);
  assert.ok(distanceKm(good, { lat: 47.6, lon: -122.3 }) > 3000);
});

test("optional encounter questions remain backward compatible and reject contact details", () => {
 assert.equal(parseEncounter(good).question, "");
 assert.equal(parseEncounter({...good,question:" What book was I holding? "}).question, "What book was I holding?");
 for(const question of [123, "x".repeat(201), "Contact me at somebody@example.com"])
   assert.throws(()=>parseEncounter({...good,question}));
});
