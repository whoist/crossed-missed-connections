import { copyFile } from "node:fs/promises";

// MapLibre's module worker imports the shared bundle relative to its own URL.
// Both files must be served together outside Next's application bundle.
for (const [source, target] of [
  ["maplibre-gl-worker.mjs", "maplibre-worker.js"],
  ["maplibre-gl-shared.mjs", "maplibre-gl-shared.mjs"],
]) {
  await copyFile(
    new URL(`../node_modules/maplibre-gl/dist/${source}`, import.meta.url),
    new URL(`../public/${target}`, import.meta.url),
  );
}
