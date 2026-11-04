export const categories = [
  "All moments",
  "Coffee & cafés",
  "Out & about",
  "On the move",
  "Arts & culture",
  "Campus",
] as const;
export type Category = (typeof categories)[number];
export type Place = {
  name: string;
  city: string;
  address: string;
  lat: number;
  lon: number;
};
export type Encounter = {
  id: string;
  title: string;
  story: string;
  question?: string;
  place: string;
  city: string;
  category: string;
  lat: number;
  lon: number;
  happened: string;
  created: number;
  alias: string;
  mine?: boolean;
  saved?: boolean;
  demo?: boolean;
};
export type Profile = { alias: string } | null;
export function clean(
  value: unknown,
  min: number,
  max: number,
  field: string,
): string {
  if (typeof value !== "string") throw new Error(`${field} is required.`);
  const s = value.trim().replace(/[\u0000-\u001f\u007f]/g, " ");
  if (s.length < min || s.length > max)
    throw new Error(`${field} must be ${min}–${max} characters.`);
  return s;
}
export function publicText(value: string) {
  if (
    /\b[^\s@]+@[^\s@]+\.[^\s@]+\b|https?:\/\/|www\.|(?:\+?\d[\s().-]*){9,}/i.test(
      value,
    )
  )
    throw new Error(
      "Keep phone numbers, emails and links out of public notes.",
    );
  return value;
}
export function inUSBounds(lat: number, lon: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    ((lat >= 24 && lat <= 49.5 && lon >= -125 && lon <= -66) ||
      (lat >= 51 &&
        lat <= 72 &&
        (lon >= 172 || lon <= -129) &&
        lon >= -180 &&
        lon <= 180) ||
      (lat >= 18.5 && lat <= 22.5 && lon >= -161 && lon <= -154) ||
      (lat >= 17.5 && lat <= 18.6 && lon >= -67.5 && lon <= -64.5))
  );
}
export function parseEncounter(b: Record<string, unknown>) {
  const title = publicText(clean(b.title, 6, 90, "Title")),
    story = publicText(clean(b.story, 20, 1200, "Your note")),
    place = publicText(clean(b.place, 2, 140, "Place")),
    city = clean(b.city, 2, 120, "City"),
    category = clean(b.category, 2, 40, "Category");
  if (!(categories as readonly string[]).slice(1).includes(category))
    throw new Error("Choose a category.");
  const question =
    b.question == null || b.question === ""
      ? ""
      : publicText(clean(b.question, 0, 200, "Question"));
  const lat = b.lat,
    lon = b.lon;
  if (
    typeof lat !== "number" ||
    typeof lon !== "number" ||
    !inUSBounds(lat, lon)
  )
    throw new Error("Choose a place in the United States.");
  const happened = clean(b.happened, 10, 10, "Date");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(happened) ||
    !Number.isFinite(Date.parse(happened)) ||
    new Date(happened).toISOString().slice(0, 10) !== happened ||
    happened > new Date(Date.now()).toISOString().slice(0, 10)
  )
    throw new Error("Choose a valid date, not a future date.");
  return { title, story, question, place, city, category, lat, lon, happened };
}
export function ownsThread(
  thread: { owner: string; respondent: string } | null,
  user: string,
) {
  return !!thread && (thread.owner === user || thread.respondent === user);
}
export function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) {
  const rad = Math.PI / 180,
    dlat = (b.lat - a.lat) * rad,
    dlon = (b.lon - a.lon) * rad;
  const h =
    Math.sin(dlat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dlon / 2) ** 2;
  return 12742 * Math.asin(Math.min(1, Math.sqrt(h)));
}
