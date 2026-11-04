import type { HeatmapLayerSpecification, LayerSpecification } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";
import type { Encounter } from "./domain";
/** Only public encounter points, never user/device positions or search locations. */
export function encounterHeatData(posts: Pick<Encounter, "id" | "lat" | "lon" | "demo">[]): FeatureCollection<Point> {
  const seen = new Set<string>();
  return { type: "FeatureCollection", features: posts.filter(p => {
    if (seen.has(p.id) || !Number.isFinite(p.lat) || !Number.isFinite(p.lon)) return false;
    seen.add(p.id); return true;
  }).map(p => ({ type:"Feature", geometry:{type:"Point",coordinates:[p.lon,p.lat]}, properties:{id:p.id,example:!!p.demo} })) };
}

// Bul Beni's transparent violet → blue → cyan → green ramp, calibrated for
// shared marker groups. Square-root weighting keeps large city clusters from
// saturating into opaque disks. Compact country-scale kernels preserve geography.
export const encounterHeatLayer: HeatmapLayerSpecification = {
  id: "encounter-heat", type: "heatmap", source: "encounter-density",
  paint: {
    "heatmap-weight": ["*", 0.5, ["sqrt", ["coalesce", ["get", "total"], 1]]],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"],
      2, 0.7, 6, 1, 10, 3, 13, 4, 16, 2],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"],
      2, 14, 6, 20, 10, 32, 13, 42, 16, 30, 18, 20],
    "heatmap-opacity": ["interpolate", ["linear"], ["zoom"],
      2, 0.5, 7, 0.65, 12, 0.82, 14, 0.72, 16, 0.4, 18, 0.15],
    "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"],
      0, "rgba(86,67,195,0)",
      0.015, "rgba(86,67,195,0.03)",
      0.08, "rgba(86,67,195,0.18)",
      0.12, "rgba(88,91,206,0.40)",
      0.38, "rgba(57,123,226,0.64)",
      0.55, "rgba(35,177,231,0.78)",
      0.72, "rgba(39,223,180,0.87)",
      0.9, "rgba(93,240,91,0.91)",
      1, "rgba(162,239,91,0.90)"],
  },
};

export function heatmapBeforeLabels(layers: LayerSpecification[]): string | undefined {
  // Geometry must not cover the glow; street/venue labels remain above it.
  const lastGeometry = layers.findLastIndex(layer => layer.type !== "symbol");
  return layers.slice(lastGeometry + 1).find(layer => layer.type === "symbol")?.id;
}
