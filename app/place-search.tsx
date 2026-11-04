"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, MapPin, ArrowUpRight, LoaderCircle, X } from "lucide-react";
import type { Place } from "@/lib/domain";
export default function PlaceSearch({
  onChoose,
  bias,
  compact = false,
}: {
  onChoose: (p: Place) => void;
  bias?: Place | null;
  compact?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<Place[]>([]),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [searched, setSearched] = useState(false);
  const sequence = useRef(0),
    controller = useRef<AbortController | null>(null),
    box = useRef<HTMLDivElement>(null),
    chosen = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const search = useCallback(
    async (q: string) => {
      if (q.trim().length < 3) return;
      const seq = ++sequence.current;
      controller.current?.abort();
      const c = new AbortController();
      controller.current = c;
      setBusy(true);
      setError("");
      setOpen(true);
      try {
        const params = new URLSearchParams({
          q: q.trim(),
          ...(bias
            ? { lat: bias.lat.toFixed(2), lon: bias.lon.toFixed(2) }
            : {}),
        });
        const r = await fetch("/api/search?" + params, { signal: c.signal });
        const data = (await r.json()) as { error: string; places: Place[] };
        if (seq !== sequence.current) return;
        if (!r.ok) throw new Error(data.error);
        setResults(data.places);
        setSearched(true);
      } catch (e) {
        if (seq === sequence.current && (e as Error).name !== "AbortError") {
          setError((e as Error).message || "Search unavailable. Try again.");
          setResults([]);
        }
      } finally {
        if (seq === sequence.current) setBusy(false);
      }
    },
    [bias],
  );
  function changeQuery(value: string) {
    setQuery(value);
    setSearched(false);
    setResults([]);
    setError("");
    setBusy(false);
    setOpen(true);
    controller.current?.abort();
    sequence.current++;
  }
  useEffect(() => {
    if (chosen.current) {
      chosen.current = false;
      return;
    }
    if (query.trim().length < 3) return;
    timer.current = setTimeout(() => search(query), 1000);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, search]);
  useEffect(() => {
    const fn = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("pointerdown", fn);
    return () => {
      document.removeEventListener("pointerdown", fn);
      controller.current?.abort();
    };
  }, []);
  return (
    <div className={"place-search " + (compact ? "compact" : "")} ref={box}>
      <div
        className="search-field"
        role="search"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation();
            if (timer.current) clearTimeout(timer.current);
            search(query);
          }
        }}
      >
        <Search size={20} />
        <input
          aria-label="Search US cities, places or addresses"
          placeholder={
            compact
              ? "Search a public place or address"
              : "Search a city, café, or a familiar place"
          }
          value={query}
          maxLength={100}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            changeQuery(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
        />
        {busy ? (
          <LoaderCircle className="spin" size={18} />
        ) : query ? (
          <button
            type="button"
            className="icon-button"
            aria-label="Clear search"
            onClick={() => {
              changeQuery("");
            }}
          >
            <X size={17} />
          </button>
        ) : (
          <kbd>↵</kbd>
        )}
      </div>
      {open && query.length >= 3 && (
        <div className="search-results" aria-live="polite">
          {busy && <p className="search-note">Looking for places in the US…</p>}
          {error && <p className="search-error">{error}</p>}
          {!busy && !error && searched && results.length === 0 && (
            <p className="search-note">
              No match yet. Try the street or city name. OpenStreetMap may not
              have every business.
            </p>
          )}
          {results.map((p, i) => (
            <button
              type="button"
              key={p.name + i}
              onClick={() => {
                chosen.current = true;
                setQuery(p.name);
                setOpen(false);
                onChoose(p);
              }}
            >
              <MapPin size={17} />
              <span>
                <strong>{p.name}</strong>
                <small>{p.address || p.city}</small>
              </span>
              <ArrowUpRight size={16} />
            </button>
          ))}
          {results.length > 0 && (
            <div className="search-credit">
              Places by Photon · © OpenStreetMap contributors
            </div>
          )}
        </div>
      )}
    </div>
  );
}
