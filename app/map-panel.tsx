"use client";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { Map as MLMap, Marker, GeoJSONSource } from "maplibre-gl";
import { inUSBounds, type Encounter, type Place } from "@/lib/domain";
import { LocateFixed, Minus, Plus, RotateCcw, MapPin, Layers } from "lucide-react";
import "maplibre-gl/dist/maplibre-gl.css";
import { encounterHeatLayer, heatmapBeforeLabels } from "@/lib/heatmap";

import { MANHATTAN, type MapLocation } from "@/lib/map-start";
import { groupNotes, noteCountLabel } from "@/lib/map-groups";

export type MapViewMemory = {
  camera: { center: [number, number]; zoom: number; bearing: number; pitch: number } | null;
  destination: Place | MapLocation | null;
};

export default function MapPanel({
  posts,
  selected,
  onSelect,
  onGroupSelect,
  target,
  onPlace,
  onError,
  nearby,
  onLocate,
  onMapInteraction,
  viewMemory,
}: {
  viewMemory: RefObject<MapViewMemory>;
  nearby: MapLocation;
  onLocate: () => void;
  onMapInteraction: () => void;
  posts: Encounter[];
  selected: string | null;
  onSelect: (p: Encounter) => void;
  onGroupSelect: (posts: Encounter[]) => void;
  target: Place | null;
  onPlace: (p: Place) => void;
  onError: (s: string) => void;
}) {
  const box = useRef<HTMLDivElement>(null),
    map = useRef<MLMap | null>(null),
    markers = useRef<Marker[]>([]),
    pin = useRef<Marker | null>(null),
    callbacks = useRef({ onSelect, onGroupSelect, onPlace, onError, onMapInteraction });
  useEffect(() => {
    callbacks.current = { onSelect, onGroupSelect, onPlace, onError, onMapInteraction };
  }, [onSelect, onGroupSelect, onPlace, onError, onMapInteraction]);
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [retry, setRetry] = useState(0),
    [density, setDensity] = useState(true);
  useEffect(() => {
    let gone = false;
    let resize: ResizeObserver | undefined;
    import("maplibre-gl").then(async (ml) => {
      if (gone || !box.current) return;
      try {
        ml.setWorkerUrl("/maplibre-worker.js");
        const m = new ml.Map({
          container: box.current,
          style: "https://tiles.openfreemap.org/styles/positron",
          center: [MANHATTAN.lon, MANHATTAN.lat],
          zoom: 12.5,
          ...viewMemory.current.camera,
          minZoom: 1,
          maxZoom: 18,
          attributionControl: { compact: true },
          renderWorldCopies: false,
          pitchWithRotate: false,
          dragRotate: false,
          touchPitch: false,
        });
        map.current = m;
        const rememberCamera = () => {
          const center = m.getCenter();
          viewMemory.current.camera = {
            center: [center.lng, center.lat], zoom: m.getZoom(),
            bearing: m.getBearing(), pitch: m.getPitch(),
          };
        };
        m.on("moveend", rememberCamera);
        m.on('movestart', e => { if (e.originalEvent) callbacks.current.onMapInteraction(); });
        m.on("style.load", () => {
          if (gone) return;
          m.addSource("encounter-density", {type:"geojson", data:{type:"FeatureCollection",features:[]}});
          m.addLayer(encounterHeatLayer, heatmapBeforeLabels(m.getStyle().layers ?? []));
          m.addLayer({
            id: "crossed-poi-dot",
            type: "circle",
            source: "openmaptiles",
            "source-layer": "poi",
            minzoom: 14,
            filter: [
              "in",
              ["get", "class"],
              [
                "literal",
                [
                  "cafe",
                  "park",
                  "college",
                  "library",
                  "museum",
                  "theatre",
                  "bar",
                  "restaurant",
                ],
              ],
            ],
            paint: {
              "circle-radius": 3,
              "circle-color": "#718268",
              "circle-stroke-width": 1.5,
              "circle-stroke-color": "#fffef8",
            },
          });
          m.addLayer({
            id: "crossed-poi-label",
            type: "symbol",
            source: "openmaptiles",
            "source-layer": "poi",
            minzoom: 14,
            filter: [
              "in",
              ["get", "class"],
              [
                "literal",
                [
                  "cafe",
                  "park",
                  "college",
                  "library",
                  "museum",
                  "theatre",
                  "bar",
                  "restaurant",
                ],
              ],
            ],
            layout: {
              "text-field": [
                "coalesce",
                ["get", "name:en"],
                ["get", "name_en"],
                ["get", "name"],
              ],
              "text-font": ["Noto Sans Regular"],
              "text-size": 11,
              "text-anchor": "top",
              "text-offset": [0, 0.6],
              "text-max-width": 10,
              "symbol-sort-key": [
                "case",
                ["==", ["get", "class"], "cafe"],
                0,
                1,
              ],
            },
            paint: {
              "text-color": "#566c50",
              "text-halo-color": "#fffef8",
              "text-halo-width": 1.5,
            },
          });
          if (m.getLayer("water"))
            m.setPaintProperty("water", "fill-color", "#cfddd9");
          setReady(true);
          setFailed(false);

        });
        m.on("error", (e) => {
          console.warn("Map resource unavailable:", e.error.message);
          if (!m.isStyleLoaded()) setFailed(true);
        });
        m.on("click", (e) => {
          const features = m
            .queryRenderedFeatures(e.point)
            .filter(
              (f) =>
                (f.sourceLayer === "poi" || f.layer.id.includes("poi")) &&
                f.geometry.type === "Point" &&
                (f.properties["name:en"] || f.properties.name),
            );
          const f = features[0];
          if (f && f.geometry.type === "Point") {
            callbacks.current.onPlace({
              name: f.properties["name:en"] || f.properties.name,
              city: "",
              address: "Map location · confirm the city when posting",
              lon: f.geometry.coordinates[0],
              lat: f.geometry.coordinates[1],
            });
          } else if (
            m.getZoom() >= 12 &&
            inUSBounds(e.lngLat.lat, e.lngLat.lng)
          ) {
            callbacks.current.onPlace({
              name: "Selected public place",
              city: "",
              address: "Name this public place when posting",
              lon: e.lngLat.lng,
              lat: e.lngLat.lat,
            });
          }
        });
        resize = new ResizeObserver(() => m.resize());
        resize.observe(box.current);
      } catch {
        setFailed(true);
      }
    });
    return () => {
      gone = true;
      resize?.disconnect();
      markers.current.forEach((m) => m.remove());
      if (map.current) {
        map.current.stop();
        const center = map.current.getCenter();
        viewMemory.current.camera = {
          center: [center.lng, center.lat], zoom: map.current.getZoom(),
          bearing: map.current.getBearing(), pitch: map.current.getPitch(),
        };
        map.current.remove();
      }
      map.current = null;
      setReady(false);
    };
  }, [retry, viewMemory]);
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    if(m.getLayer("encounter-heat")) m.setLayoutProperty("encounter-heat", "visibility", density ? "visible" : "none");
  }, [posts, ready, density]);
  useEffect(() => {
    if (!ready || !map.current) return;
    let cancelled = false;
    let detach = () => {};
    import("maplibre-gl").then((ml) => {
      if (cancelled || !map.current) return;
      const m = map.current;
      function draw() {
        if (cancelled) return;
        markers.current.forEach((marker) => marker.remove());
        const groups = groupNotes(posts, coordinate => m.project(coordinate));
        (m.getSource("encounter-density") as GeoJSONSource | undefined)?.setData({
          type: "FeatureCollection",
          features: groups.map(g => {
            const coordinate=m.unproject([g.x,g.y]);
            return {type:"Feature",geometry:{type:"Point",coordinates:[coordinate.lng,coordinate.lat]},
              properties:{total:g.members.length}};
          }),
        });
        markers.current = groups.map((g) => {
          const p = g.members[0],
            cluster = g.members.length > 1;
          const el = document.createElement("button");
          el.className =
            "moment-pin " +
            (cluster ? "cluster " : "") +
            (g.members.some(note => selected === note.id) ? "active" : "");
          el.setAttribute(
            "aria-label",
            cluster
              ? g.members.length + " notes in this area"
              : p.title + " · " + p.city,
          );
          el.title = noteCountLabel(g.members.length);
          const span = document.createElement("span");
          span.textContent = noteCountLabel(g.members.length);
          el.appendChild(span);
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            // A note opens in place, never as a new geographic destination.
            m.stop();
            callbacks.current.onMapInteraction();
            if (!cluster) {
              callbacks.current.onSelect(p);
              return;
            }
            // Show the exact set represented by this badge, including colocated notes.
            callbacks.current.onGroupSelect(g.members);
          });
          return new ml.Marker({ element: el, anchor: "center" })
            .setLngLat(m.unproject([g.x, g.y]))
            .addTo(m);
        });
      }
      draw();
      m.on("moveend", draw);
      m.on("resize", draw);
      detach = () => { m.off("moveend", draw); m.off("resize", draw); };
    });
    return () => {
      cancelled = true;
      detach();
    };
  }, [posts, selected, ready]);
  useEffect(() => {
    if (!ready || !map.current) return;
    let cancelled = false;
    import("maplibre-gl").then((ml) => {
      if (cancelled || !map.current) return;
      const destination = target ?? nearby;
      const navigate = viewMemory.current.destination !== destination;
      viewMemory.current.destination = destination;
      pin.current?.remove();
      if (target) {
        if (navigate) map.current.flyTo({
          center: [target.lon, target.lat],
          zoom: 14.3,
          duration: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? 0
            : 900,
        });
        const el = document.createElement("div");
        el.className = "place-pin";
        el.setAttribute("aria-label", target.name);
        pin.current = new ml.Marker({ element: el })
          .setLngLat([target.lon, target.lat])
          .addTo(map.current);
      } else if (navigate) {
        map.current.flyTo({center: [nearby.lon, nearby.lat], zoom: 12.5, duration: 0});
      }
    });
    return () => {
      cancelled = true;
    };
  }, [target, nearby, ready, viewMemory]);
  return (
    <div className="map-surface">
      <div
        className="map-canvas"
        ref={box}
        role="region"
        aria-label="United States encounter map"
      />
      {!ready && (
        <div className="map-loading">
          <MapPin size={30} />
          <strong>
            {failed ? "The map couldn’t load." : "Finding our way…"}
          </strong>
          {failed ? (
            <button
              className="text-button"
              onClick={() => {
                setFailed(false);
                setRetry((v) => v + 1);
              }}
            >
              Try again
            </button>
          ) : (
            <span>You can browse the notes while it loads.</span>
          )}
        </div>
      )}
      <button className={"density-toggle " + (density ? "on" : "")} aria-pressed={density} aria-label="Show note density" onClick={()=>setDensity(!density)}><Layers size={16}/><span>Heatmap</span><i/></button>
      <div className="map-tools">
        <button
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() => { onMapInteraction(); map.current?.zoomIn(); }}
        >
          <Plus size={19} />
        </button>
        <button
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() => { onMapInteraction(); map.current?.zoomOut(); }}
        >
          <Minus size={19} />
        </button>
        <span />
        <button
          title="Show the United States"
          aria-label="Show the United States"
          onClick={() => {
            onMapInteraction();
            map.current?.fitBounds(
              [
                [-125, 24],
                [-66, 50],
              ],
              { padding: Math.min(70, (box.current?.clientWidth ?? 350) * 0.09), duration: 600 },
            );
          }}
        >
          <RotateCcw size={17} />
        </button>
        <button
          title="Use my location"
          aria-label="Use my location"
          onClick={onLocate}
        >
          <LocateFixed size={19} />
        </button>
      </div>
      <div className="density-key" aria-live="polite">
        <div><strong>{density ? "NOTE DENSITY" : "NOTE LOCATIONS"}</strong><span>{posts.length} {posts.length===1?"note":"notes"}</span></div>
        {density && <><div className="density-gradient"/><div className="density-range"><span>Less</span><span>More</span></div></>}
        {posts.some(p=>p.demo) && <small>Includes labeled examples</small>}
        {posts.length===0 && <small>No notes in this view yet</small>}
      </div>
    </div>
  );
}
