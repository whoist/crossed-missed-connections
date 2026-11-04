import type { Encounter } from "./domain";
import venues from "./demo-locations.json";
import stories from "./demo-stories.json";
// Adapted Bul Beni seed fiction at mapped US venues, never real user submissions.
// Coordinates come from venue records, never random offsets around a city.
export const examples: Encounter[] = stories.map((note, i) => {
  const venue = venues[note.venue];
  return {
    id: note.id,
    demo: true,
    alias: note.alias,
    title: note.title,
    story: note.story,
    question: note.question,
    place: venue.name,
    city: venue.city,
    category: venue.category,
    lat: venue.lat,
    lon: venue.lon,
    happened: note.happened,
    created: Date.UTC(2026, 10, 4) - i * 60000,
  };
});
