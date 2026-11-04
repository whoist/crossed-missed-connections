import { rateIdentity } from "@/lib/auth";
import { guard, json, limit, HttpError } from "@/lib/server";
import { inUSBounds } from "@/lib/domain";
type Feature = {
  geometry: { coordinates: number[] };
  properties: Record<string, string>;
};
const cache = new Map<string, { at: number; places: unknown[] }>();
export const GET = (req: Request) =>
  guard(async () => {
    const u = new URL(req.url),
      q = (u.searchParams.get("q") ?? "").trim();
    if (q.length < 3 || q.length > 100)
      throw new HttpError("Enter 3–100 characters.");
    const lat = Number(u.searchParams.get("lat")),
      lon = Number(u.searchParams.get("lon"));
    const bias =
      u.searchParams.has("lat") &&
      u.searchParams.has("lon") &&
      inUSBounds(lat, lon);
    const key = `${q.toLowerCase()}:${bias ? lat.toFixed(1) + ":" + lon.toFixed(1) : "us"}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < 900000)
      return json({ places: hit.places, cached: true });
    const hash = rateIdentity(req);
    await limit(hash, "search", 30, 3600);
    await limit("provider", "search-global", 1, 1);
    await limit("provider", "search-day", 1500, 86400);
    const endpoint =
      process.env.PHOTON_URL ||
      "https://photon.komoot.io/api/";
    const url = new URL(endpoint);
    url.search = new URLSearchParams({
      q,
      countrycode: "US",
      limit: "8",
      lang: "en",
      ...(bias
        ? {
            lat: String(lat),
            lon: String(lon),
            zoom: "11",
            location_bias_scale: "0.1",
          }
        : {}),
    }).toString();
    let res;
    try {
      res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Crossed/0.1 (open-source missed-connections app)",
        },
        signal: AbortSignal.timeout(7000),
      });
    } catch {
      throw new HttpError(
        "Place search is taking a break. Try again, or choose a spot on the map.",
        503,
      );
    }
    if (!res.ok)
      throw new HttpError(
        "Place search is busy. Please try again in a moment.",
        503,
      );
    const data = (await res.json()) as { features: Feature[] };
    const places = (data.features ?? [])
      .filter(
        (f) =>
          f.properties.countrycode?.toUpperCase() === "US" &&
          inUSBounds(f.geometry.coordinates[1], f.geometry.coordinates[0]),
      )
      .map((f) => {
        const p = f.properties;
        return {
          name:
            p.name || [p.housenumber, p.street].filter(Boolean).join(" ") || q,
          city: [p.city || p.town || p.county, p.state]
            .filter(Boolean)
            .join(", "),
          address: [p.housenumber, p.street, p.city || p.town, p.state]
            .filter(Boolean)
            .join(", "),
          lon: f.geometry.coordinates[0],
          lat: f.geometry.coordinates[1],
        };
      });
    if (cache.size >= 200) cache.delete(cache.keys().next().value!);
    cache.set(key, { at: Date.now(), places });
    return json({ places });
  });
