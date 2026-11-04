"use client";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  lazy,
  Suspense,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Bookmark,
  Coffee,
  Footprints,
  TrainFront,
  Palette,
  GraduationCap,
  Plus,
  X,
  MapPin,
  Mail,
  SlidersHorizontal,
  Check,
  ArrowLeft,
  ShieldCheck,
  Send,
  Search,
  Map as MapIcon,
  List,
  Sparkle,
  Flag,
  Trash2,
  LogOut,
  UserRound,
  RefreshCw,
} from "lucide-react";
import {
  categories,
  distanceKm,
  type Encounter,
  type Place,
  type Profile,
} from "@/lib/domain";
import { examples } from "@/lib/demo";
import { MANHATTAN, requestMapLocation, startupMapLocation, type MapLocation } from "@/lib/map-start";
import PlaceSearch from "./place-search";
import type { MapViewMemory } from "./map-panel";
import dynamic from "next/dynamic";
const AccountForm = dynamic(() => import("./account-form"), {
  ssr: false,
  loading: () => (
    <p className="modal-body" role="status">
      Loading sign-in…
    </p>
  ),
});
const MapPanel = lazy(() => import("./map-panel"));
function subscribeViewport(callback: () => void) {
  const mq = window.matchMedia("(min-width: 761px)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}
function desktopSnapshot() {
  return window.matchMedia("(min-width: 761px)").matches;
}

const cities: Place[] = [
  {
    name: "New York",
    city: "New York, NY",
    address: "",
    lat: 40.7308,
    lon: -73.9973,
  },
  {
    name: "Los Angeles",
    city: "Los Angeles, CA",
    address: "",
    lat: 34.0522,
    lon: -118.2437,
  },
  {
    name: "Chicago",
    city: "Chicago, IL",
    address: "",
    lat: 41.8786,
    lon: -87.6403,
  },
  {
    name: "Seattle",
    city: "Seattle, WA",
    address: "",
    lat: 47.6062,
    lon: -122.3321,
  },
  {
    name: "Austin",
    city: "Austin, TX",
    address: "",
    lat: 30.2672,
    lon: -97.7431,
  },
];
const categoryIcons = [
  Sparkle,
  Coffee,
  Footprints,
  TrainFront,
  Palette,
  GraduationCap,
];
export function CategoryIcon({
  category,
  size = 18,
}: {
  category: string;
  size?: number;
}) {
  const I =
    categoryIcons[
      Math.max(0, categories.indexOf(category as (typeof categories)[number]))
    ];
  return <I size={size} strokeWidth={1.65} />;
}
type ApiData = {
  error: string;
  encounters: Encounter[];
  profile: Profile;
  signedIn: boolean;
  saved: boolean;
  threads: Thread[];
  messages: Message[];
};
async function api(path: string, data?: unknown) {
  const r = await fetch(
    path,
    data
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      : undefined,
  );
  const j = (await r.json()) as ApiData;
  if (!r.ok)
    throw Object.assign(new Error(j.error || "Please try again."), {
      status: r.status,
    });
  return j;
}
function Logo() {
  return (
    <span className="brand">
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M4 4c13 0 11 24 24 24M4 28C17 28 15 4 28 4"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="16" cy="16" r="4" fill="var(--paper)" />
      </svg>
      <span>
        crossed<span className="logo-dot">.</span>
      </span>
    </span>
  );
}
function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      el?.close();
      document.body.style.overflow = old;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      className={"dialog " + (wide ? "wide" : "")}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-head">
        <span className="eyebrow">{title}</span>
        <button
          className="icon-button"
          onClick={close}
          aria-label="Close dialog"
        >
          <X size={21} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function CrossedApp() {
  const desktop = useSyncExternalStore(
    subscribeViewport,
    desktopSnapshot,
    () => false,
  );
  const [posts, setPosts] = useState<Encounter[]>([]),
    [profile, setProfile] = useState<Profile>(null),
    [signedIn, setSignedIn] = useState(false),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(""),
    [tab, setTab] = useState<"explore" | "saved" | "mine">("explore"),
    [category, setCategory] = useState<string>(categories[0]),
    [target, setTarget] = useState<Place | null>(null),
    [selected, setSelected] = useState<Encounter | null>(null),
    [modal, setModal] = useState<string | null>(null),
    [mobileMap, setMobileMap] = useState(true),
    [toast, setToast] = useState(""),
    [showExamples, setShowExamples] = useState(true),
    [sort, setSort] = useState("newest"),
    [filters, setFilters] = useState(false),
    [age, setAge] = useState("all");
  const [nearby, setNearby] = useState<MapLocation>(MANHATTAN);
  const mapInteraction = useRef(0);
  const afterProfile = useRef<(() => void) | null>(null);
  const [authReturn, setAuthReturn] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [mapGroup, setMapGroup] = useState<Encounter[]>([]);
  const mapView = useRef<MapViewMemory>({ camera: null, destination: null });
  const detailDialog = useRef<HTMLDivElement>(null);
  const [now] = useState(() => Date.now());
  useEffect(() => {
    let active = true;
    const interaction = mapInteraction.current;
    startupMapLocation(navigator.geolocation).then(result => {
      if (!active || interaction !== mapInteraction.current) return;
      setNearby(result.location);
      if (result.reason !== 'located') setToast(result.reason === 'outside-us'
        ? "Crossed is US-only for now. Starting in Manhattan."
        : "Starting in Manhattan. Search for any US city or place.");
    });
    return () => { active = false; };
  }, []);
  async function locate() {
    const interaction = ++mapInteraction.current;
    const result = await requestMapLocation(navigator.geolocation);
    if (interaction !== mapInteraction.current) return;
    setTarget(null);
    setNearby({...result.location});
    setMobileMap(true);
    if (result.reason !== 'located') setToast("Location unavailable. Showing Manhattan — you can search for another place.");
  }
  async function load() {
    try {
      const [p, u] = await Promise.all([
        api("/api/encounters"),
        api("/api/profile"),
      ]);
      setLoadError("");
      setPosts(p.encounters);
      setProfile(u.profile);
      setSignedIn(u.signedIn);
    } catch (e) {
      setLoadError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    Promise.all([api("/api/encounters"), api("/api/profile")])
      .then(([p, u]) => {
        if (active) {
          setPosts(p.encounters);
          setProfile(u.profile);
          setSignedIn(u.signedIn);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setLoadError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  function gate(next: () => void) {
    if (profile) {
      next();
      return;
    }
    setAuthReturn(null);
    afterProfile.current = next;
    setModal("profile");
  }
  function newNote() {
    gate(() => setModal("compose"));
  }
  let visible = [
    ...posts,
    ...(showExamples && tab === "explore" ? examples : []),
  ].filter(
    (p) =>
      (category === categories[0] || p.category === category) &&
      (tab !== "saved" || p.saved) &&
      (tab !== "mine" || p.mine) &&
      (!target || distanceKm(p, target) < 45) &&
      (age === "all" ||
        p.demo ||
        now - Date.parse(p.happened) < Number(age) * 86400000),
  );
  if (sort === "nearest" && target)
    visible = visible.sort(
      (a, b) => distanceKm(a, target) - distanceKm(b, target),
    );
  else
    visible = visible.sort(
      (a, b) => Number(!!a.demo) - Number(!!b.demo) || b.created - a.created,
    );
  async function action(p: Encounter, kind: string, extra = {}) {
    try {
      const result = await api("/api/encounters/" + p.id, {
        action: kind,
        ...extra,
      });
      if (kind === "save") {
        setPosts((ps) =>
          ps.map((x) => (x.id === p.id ? { ...x, saved: result.saved } : x)),
        );
        setSelected((x) =>
          x?.id === p.id ? { ...x, saved: result.saved } : x,
        );
        setToast(
          result.saved
            ? "Saved for another look."
            : "Removed from saved notes.",
        );
      } else {
        if (kind === "reply")
          setReplyDrafts((ds) => {
            const next = { ...ds };
            delete next[p.id];
            return next;
          });
        await load();
        setSelected(null);
        setModal(null);
        setToast(
          kind === "delete"
            ? "Your note has been removed."
            : kind === "report"
              ? "Reported and hidden from your feed."
              : "Your private reply has been sent.",
        );
      }
    } catch (e) {
      if (kind === "reply" && (e as { status?: number }).status === 401) {
        setSignedIn(false);
        setProfile(null);
        afterProfile.current = () => setModal("reply");
        setAuthReturn("reply");
        setModal("profile");
      }
      setToast((e as Error).message);
    }
  }
  function choosePlace(p: Place) {
    mapInteraction.current++;
    setTarget(p);
    setTab("explore");
    setMobileMap(true);
  }
  function detail(p: Encounter, group: Encounter[] = []) {
    setMapGroup(group);
    setSelected(p);
    setModal("detail");
  }
  return (
    <>
      <header className="site-header">
        <button
          className="brand-button"
          aria-label="Crossed home"
          onClick={() => {
            setTab("explore");
            setTarget(null);
            setCategory(categories[0]);
            setMobileMap(true);
          }}
        >
          <Logo />
        </button>
        <nav className="desktop-nav" aria-label="Main navigation">
          <button
            className={tab === "explore" ? "current" : ""}
            onClick={() => { setTab("explore"); setMobileMap(true); }}
          >
            Explore
          </button>
          <button
            className={tab === "saved" ? "current" : ""}
            onClick={() => gate(() => { setTab("saved"); setMobileMap(false); })}
          >
            Saved
          </button>
          <button onClick={() => gate(() => setModal("inbox"))}>Inbox</button>
        </nav>
        <div className="header-actions">
          <button className="how-link" onClick={() => setModal("about")}>
            How it works
          </button>
          <button className="primary header-post" onClick={newNote}>
            <Plus size={18} />
            <span>Leave a note</span>
          </button>
          <button
            className={signedIn ? "avatar" : "account-entry"}
            title={signedIn ? "Your account" : "Sign in"}
            aria-label={signedIn ? "Your account" : "Sign in"}
            onClick={() => {
              afterProfile.current = null;
              setModal("profile");
            }}
          >
            {profile ? (
              profile.alias.slice(0, 1).toUpperCase()
            ) : (
              <>
                <UserRound size={17} />
                <span>Sign in</span>
              </>
            )}
          </button>
        </div>
      </header>
      <main className={mobileMap ? "map-mode" : ""}>
        <section className="intro">
          <div>
            <div className="eyebrow intro-label">
              <span className="tiny-cross">✳</span> REAL PLACES. ALMOST HELLOS.
            </div>
            <h1>
              Some paths deserve
              <br />
              to cross <em>again.</em>
            </h1>
          </div>
          <div className="intro-aside">
            <div className="encounter-illustration" aria-hidden="true">
              <svg viewBox="0 0 340 100" fill="none">
                <path
                  d="M3 75C90 75 73 13 160 45S263 90 335 17"
                  stroke="#b7c9b4"
                  strokeWidth="2"
                  strokeDasharray="5 7"
                />
                <path
                  d="M10 13C96 13 116 93 175 50S280 11 330 75"
                  stroke="#dbbba6"
                  strokeWidth="2"
                  strokeDasharray="5 7"
                />
                <circle cx="167" cy="49" r="19" fill="#f0e1d2" />
                <circle cx="167" cy="49" r="7" fill="#bd7555" />
              </svg>
              <span className="encounter-chip first">
                <Coffee size={14} /> Same little café
              </span>
              <span className="encounter-chip second">
                <MapPin size={14} /> Another chance
              </span>
            </div>
            <p>
              That look. That laugh. That almost-hello.
              <br />
              Leave a little note. See where it goes.
            </p>
            <button className="text-button" onClick={() => setModal("about")}>
              A second chance at hello <ArrowUpRight size={17} />
            </button>
          </div>
        </section>
        <section className="explore" aria-label="Explore missed connections">
          <div className="filter-bar">
            <div
              className="category-tabs"
              role="group"
              aria-label="Filter by setting"
            >
              {categories.map((c, i) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={category === c ? "active" : ""}
                >
                  <CategoryIcon category={c} />
                  <span>{i === 0 ? "All moments" : c}</span>
                </button>
              ))}
            </div>
            <button
              className={"filter-button " + (filters ? "active" : "")}
              onClick={() => setFilters(!filters)}
              aria-expanded={filters}
            >
              <SlidersHorizontal size={17} />
              <span>Filters</span>
              {age !== "all" && <i />}
            </button>
          </div>
          {filters && (
            <div className="extra-filters">
              <label>
                When did it happen?
                <select value={age} onChange={(e) => setAge(e.target.value)}>
                  <option value="all">Any time</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                </select>
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={showExamples}
                  onChange={(e) => setShowExamples(e.target.checked)}
                />
                Show clearly labeled example notes
              </label>
              <button
                className="text-button"
                onClick={() => {
                  setAge("all");
                  setCategory(categories[0]);
                  setShowExamples(true);
                }}
              >
                Reset filters
              </button>
            </div>
          )}
          <div className="explore-grid">
            <aside
              className={"note-list " + (mobileMap ? "mobile-hidden" : "")}
            >
              <div className="list-heading">
                <div>
                  <span className="eyebrow">
                    {tab === "saved"
                      ? "YOUR LITTLE COLLECTION"
                      : tab === "mine"
                        ? "YOUR MISSED CONNECTIONS"
                        : target
                          ? "AROUND " +
                            (target.city || target.name)
                              .split(",")[0]
                              .toUpperCase()
                          : "SOMEWHERE, SOMEONE REMEMBERS"}
                  </span>
                  <h2>
                    {tab === "saved"
                      ? "Saved moments"
                      : tab === "mine"
                        ? "Your notes"
                        : target
                          ? "Around this place"
                          : "Across the map"}{" "}
                    <span>{visible.length}</span>
                  </h2>
                </div>
                <select
                  aria-label="Sort notes"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="newest">Newest first</option>
                  <option value="nearest" disabled={!target}>
                    Nearest first
                  </option>
                </select>
              </div>
              {target && (
                <button
                  className="location-filter"
                  onClick={() => setTarget(null)}
                >
                  <MapPin size={14} />
                  <span>{target.name} · within 28 mi</span>
                  <X size={15} />
                </button>
              )}
              {loadError && (
                <div className="inline-error">
                  Live notes couldn’t load.{" "}
                  <button onClick={load}>Retry</button>
                </div>
              )}
              {visible.some((p) => p.demo) && (
                <div className="sample-hint">
                  <span>Take a look around</span> Example notes show how it
                  works.
                </div>
              )}
              <div className="cards">
                {loading && (
                  <div className="loading-text">Loading moments…</div>
                )}
                {!loading && visible.length === 0 && (
                  <div className="empty">
                    <div className="empty-symbol">
                      <Mail size={32} />
                    </div>
                    <h3>
                      {tab === "saved"
                        ? "Keep a moment close."
                        : "Be the first to say it."}
                    </h3>
                    <p>
                      {tab === "saved"
                        ? "Tap the bookmark on a live note to save it here."
                        : "No notes here yet. Someone else might remember that moment, too."}
                    </p>
                    <button
                      className="primary"
                      onClick={
                        tab === "saved" ? () => setTab("explore") : newNote
                      }
                    >
                      {tab === "saved" ? "Explore notes" : "Leave a note"}
                      <ArrowRight size={16} />
                    </button>
                    {target && (
                      <button
                        className="text-button"
                        onClick={() => setTarget(null)}
                      >
                        Explore all places
                      </button>
                    )}
                  </div>
                )}
                {visible.map((p) => (
                  <article
                    className={
                      "note-card tone-" +
                      (categories.indexOf(
                        p.category as (typeof categories)[number],
                      ) %
                        5) +
                      (selected?.id === p.id ? " selected" : "")
                    }
                    key={p.id}
                  >
                    <div className="card-top">
                      <span className="category-tag">
                        <CategoryIcon category={p.category} size={15} />
                        {p.category}
                      </span>
                      {p.demo ? (
                        <span className="example-label">Example</span>
                      ) : (
                        <button
                          className={"bookmark " + (p.saved ? "is-saved" : "")}
                          aria-label={p.saved ? "Unsave note" : "Save note"}
                          onClick={() => gate(() => action(p, "save"))}
                        >
                          <Bookmark
                            size={18}
                            fill={p.saved ? "currentColor" : "none"}
                          />
                        </button>
                      )}
                    </div>
                    <button className="card-content" onClick={() => detail(p)}>
                      <h3>{p.title}</h3>
                      <p>{p.story}</p>
                    </button>
                    <div className="card-bottom">
                      <button
                        className="card-location"
                        onClick={() => {
                          mapInteraction.current++;
                          setSelected(p);
                          setTarget({
                            name: p.place,
                            city: p.city,
                            address: p.city,
                            lat: p.lat,
                            lon: p.lon,
                          });
                          setMobileMap(true);
                        }}
                      >
                        <span className="card-number"><MapPin size={14} /></span>
                        <span>
                          <strong>{p.place}</strong>
                          <small>{p.city}</small>
                        </span>
                      </button>
                      <button
                        className="card-arrow"
                        aria-label={"Read " + p.title}
                        onClick={() => detail(p)}
                      >
                        <ArrowUpRight size={20} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <div className="list-foot">
                <ShieldCheck size={15} />
                <span>Little details. Real respect. Always 18+.</span>
              </div>
            </aside>
            <section
              className={"map-wrap " + (!mobileMap ? "mobile-hidden" : "")}
              aria-label="Map"
            >
              {(desktop || mobileMap) && (
                <Suspense
                  fallback={<div className="map-loading">Loading the map…</div>}
                >
                  <MapPanel
                    posts={visible}
                    selected={selected?.id ?? null}
                    onSelect={detail}
                    viewMemory={mapView}
                    onGroupSelect={(notes) => detail(notes[0], notes)}
                    target={target}
                    nearby={nearby}
                    onLocate={locate}
                    onMapInteraction={() => { mapInteraction.current++; }}
                    onPlace={choosePlace}
                    onError={setToast}
                  />
                </Suspense>
              )}
              <div className="map-search">
                <PlaceSearch onChoose={choosePlace} bias={target} />
                {target && (
                  <div className="chosen-place">
                    <div>
                      <MapPin size={17} />
                      <span>
                        <strong>{target.name}</strong>
                        <small>
                          {target.city ||
                            "Choose a nearby public place to post"}
                        </small>
                      </span>
                    </div>
                    <button
                      aria-label="Clear selected place"
                      className="icon-button"
                      onClick={() => setTarget(null)}
                    >
                      <X size={17} />
                    </button>
                  </div>
                )}
              </div>
              {target ? (
                <div className="map-bottom-card">
                  <div>
                    <span className="eyebrow">WAS IT HERE?</span>
                    <strong>Remember a moment here?</strong>
                  </div>
                  <button className="primary" onClick={newNote}>
                    Leave a note <Plus size={17} />
                  </button>
                </div>
              ) : (
                <div className="city-jump">
                  <span>Start somewhere</span>
                  <div>
                    {cities.map((c) => (
                      <button key={c.name} onClick={() => choosePlace(c)}>
                        {c.name}
                        <ArrowUpRight size={12} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        </section>
        <footer>
          <span>
            <span className="footer-cross">✳</span> Crossed. A little less
            what-if.
          </span>
          <div>
            <button onClick={() => setModal("about")}>How it works</button>
            <button onClick={() => setModal("safety")}>Safety & privacy</button>
            <a href="/source" target="_blank" rel="noreferrer">
              Open source <ArrowUpRight size={12} />
            </a>
            <span>Made for real life.</span>
          </div>
        </footer>
      </main>
      <button
        className="mobile-view-toggle"
        onClick={() => setMobileMap(!mobileMap)}
      >
        {mobileMap ? <List size={17} /> : <MapIcon size={17} />}{" "}
        {mobileMap ? "Show notes" : "Show map"}
      </button>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <button
          className={tab === "explore" ? "active" : ""}
          onClick={() => { setTab("explore"); setMobileMap(true); }}
        >
          <Search size={20} />
          Explore
        </button>
        <button
          className={tab === "saved" ? "active" : ""}
          onClick={() =>
            gate(() => {
              setTab("saved");
              setMobileMap(false);
            })
          }
        >
          <Bookmark size={20} />
          Saved
        </button>
        <button
          onClick={newNote}
          className="mobile-post"
          aria-label="Leave a note"
        >
          <Plus size={25} />
        </button>
        <button onClick={() => gate(() => setModal("inbox"))}>
          <Mail size={20} />
          Inbox
        </button>
        <button onClick={() => setModal("profile")}>
          <UserRound size={20} />
          You
        </button>
      </nav>
      {toast && (
        <div className="toast" role="status">
          <span>{toast}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {modal === "compose" && (
        <Modal title="A SECOND CHANCE AT HELLO" close={() => setModal(null)}>
          <Compose
            initial={target}
            onDone={async () => {
              await load();
              setModal(null);
              setTab("mine");
              setTarget(null);
              setCategory(categories[0]);
              setMobileMap(false);
              setToast("Your note is out there. Here’s to a second hello.");
            }}
          />
        </Modal>
      )}
      {modal === "profile" && (
        <Modal
          title={
            authReturn === "reply"
              ? "SIGN IN TO SEND YOUR REPLY"
              : "YOUR CORNER OF CROSSED"
          }
          close={() => {
            setModal(authReturn);
            setAuthReturn(null);
            afterProfile.current = null;
          }}
        >
          {authReturn === "reply" && (
            <p className="auth-draft-notice">
              Your message is kept here. After signing in, review it and send.
            </p>
          )}
          {signedIn ? (
            <ProfileForm
              profile={profile}
              onPassword={() => setModal("password")}
              onLogout={async () => {
                await api("/api/auth", { action: "logout" });
                setSignedIn(false);
                setProfile(null);
                setSelected(null);
                setModal(null);
                setTab("explore");
                afterProfile.current = null;
                setAuthReturn(null);
                setReplyDrafts({});
                await load();
              }}
              onDelete={async () => {
                setProfile(null);
                setPosts([]);
                setModal(null);
                setTab("explore");
                await load();
                setToast("Your Crossed data has been deleted.");
              }}
              onDone={(p) => {
                setProfile(p);
                setModal(null);
                afterProfile.current?.();
                afterProfile.current = null;
                setAuthReturn(null);
              }}
              onMine={() => {
                setModal(null);
                setTarget(null);
                setTab("mine");
                setMobileMap(false);
              }}
            />
          ) : (
            <AccountForm
              onDone={async (p) => {
                setSignedIn(true);
                setProfile(p);
                setModal(p ? null : "profile");
                await load();
                if (!p) return;
                const next = afterProfile.current;
                afterProfile.current = null;
                setAuthReturn(null);
                next?.();
              }}
            />
          )}
        </Modal>
      )}
      {modal === "password" && (
        <Modal title="ACCOUNT SECURITY" close={() => setModal("profile")}>
          <AccountForm changePassword onDone={() => setModal("profile")} />
        </Modal>
      )}
      {modal === "map-group" && (
        <Modal title={`${mapGroup.length} NOTES IN THIS GROUP`} close={() => setModal(null)}>
          <div className="modal-body map-group-list">
            <p>Every note in the group you selected.</p>
            {mapGroup.map(note => (
              <button className="map-group-note" key={note.id} onClick={() => detail(note, mapGroup)}>
                <span className="category-tag"><CategoryIcon category={note.category} size={15}/>{note.category}{note.demo && <small>Example</small>}</span>
                <strong>{note.title}</strong>
                <span className="map-group-excerpt">{note.story}</span>
                <span className="map-group-place"><MapPin size={14}/>{note.place}<ArrowUpRight size={16}/></span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {modal === "detail" && selected && (
        <Modal
          title={
            selected.demo ? "EXAMPLE NOTE · FICTIONAL" : "A MISSED CONNECTION"
          }
          close={() => setModal(null)}
        >
          {mapGroup.length > 1 && (
            <nav className="note-navigation" aria-label="Notes in this map group">
              <button className="icon-button" aria-label="Previous note"
                disabled={mapGroup.findIndex(note => note.id === selected.id) <= 0}
                onClick={() => {
                  const index = mapGroup.findIndex(note => note.id === selected.id);
                  if (index > 0) setSelected(mapGroup[index - 1]);
                  detailDialog.current?.closest("dialog")?.scrollTo({ top: 0 });
                }}><ArrowLeft size={20}/></button>
              <button className="note-navigation-summary" onClick={() => setModal("map-group")} aria-label="View all notes in this group">
                <strong aria-live="polite">{mapGroup.findIndex(note => note.id === selected.id) + 1} of {mapGroup.length} notes</strong>
                <span>View this group <List size={13}/></span>
              </button>
              <button className="icon-button" aria-label="Next note"
                disabled={mapGroup.findIndex(note => note.id === selected.id) >= mapGroup.length - 1}
                onClick={() => {
                  const index = mapGroup.findIndex(note => note.id === selected.id);
                  if (index < mapGroup.length - 1) setSelected(mapGroup[index + 1]);
                  detailDialog.current?.closest("dialog")?.scrollTo({ top: 0 });
                }}><ArrowRight size={20}/></button>
            </nav>
          )}
          <div className="modal-body detail-body" ref={detailDialog}>
            <span className="category-tag">
              <CategoryIcon category={selected.category} />
              {selected.category}
            </span>
            <h2>{selected.title}</h2>
            <div className="detail-place">
              <MapPin size={17} />
              <span>
                {selected.place}
                <small>{selected.city}</small>
              </span>
            </div>
            <div className="detail-story">{selected.story}</div>
            {selected.question && (
              <div className="encounter-question">
                <small>A question for you</small>
                <p>{selected.question}</p>
              </div>
            )}
            <div className="detail-meta">
              <span className="mini-avatar">{selected.alias.slice(0, 1)}</span>
              <span>
                {selected.alias}
                <small>
                  {selected.demo
                    ? "Illustrative example"
                    : new Date(
                        selected.happened + "T12:00:00",
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                </small>
              </span>
            </div>
            {selected.demo ? (
              <div className="example-notice">
                This is a fictional example. You can try writing a reply;
                nothing will be sent to a real person.
              </div>
            ) : (
              <p className="fine-print">
                Recognize the moment? Mention a detail only the two of you would
                know.
              </p>
            )}
            <div className="detail-actions">
              <button
                className="primary full"
                onClick={() =>
                  selected.mine
                      ? action(selected, "delete")
                      : setModal("reply")
                }
              >
                {selected.mine
                    ? "Remove my note"
                    : "Reply to this note"}
                {selected.mine ? (
                  <Trash2 size={17} />
                ) : (
                  <ArrowRight size={17} />
                )}
              </button>
              {!selected.demo && !selected.mine && (
                <div className="secondary-actions">
                  <button
                    className="text-button"
                    onClick={() => gate(() => action(selected, "save"))}
                  >
                    <Bookmark size={16} />
                    {selected.saved ? "Saved" : "Save this note"}
                  </button>
                  <button
                    className="text-button muted"
                    onClick={() => gate(() => setModal("report"))}
                  >
                    <Flag size={15} />
                    Report
                  </button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}
      {modal === "reply" && selected && (
        <Modal title="A PRIVATE HELLO" close={() => setModal("detail")}>
          <ReplyForm
            post={selected}
            draft={replyDrafts[selected.id] || ""}
            onChange={(message) =>
              setReplyDrafts((ds) => ({ ...ds, [selected.id]: message }))
            }
            onSend={async (message) => {
              if (selected.demo) {
                setToast("Example reply previewed. Nothing was sent; your draft is still here.");
                return;
              }
              if (!profile) {
                gate(() => setModal("reply"));
                setAuthReturn("reply");
                return;
              }
              await action(selected, "reply", { message });
            }}
          />
        </Modal>
      )}
      {modal === "report" && selected && (
        <Modal title="REPORT A NOTE" close={() => setModal("detail")}>
          <ReportForm
            onSend={(reason) => action(selected, "report", { reason })}
          />
        </Modal>
      )}
      {modal === "inbox" && (
        <Modal title="YOUR CONVERSATIONS" close={() => setModal(null)} wide>
          <Inbox notify={setToast} />
        </Modal>
      )}
      {(modal === "about" || modal === "safety") && (
        <Modal
          title={
            modal === "about"
              ? "A LITTLE LESS WHAT-IF"
              : "FEEL SAFE SAYING HELLO"
          }
          close={() => setModal(null)}
        >
          <div className="modal-body info-body">
            <h2>
              {modal === "about" ? (
                <>
                  Real life started it.
                  <br />
                  <em>Take it from here.</em>
                </>
              ) : (
                "A little care goes a long way."
              )}
            </h2>
            {modal === "about" ? (
              <>
                <p>
                  Crossed is for the almost-hellos you wish you could have back.
                  No swiping, no public contact details. Just a place, a moment,
                  and a note.
                </p>
                <ol>
                  <li>
                    <span>01</span>
                    <div>
                      <h3>Find the place.</h3>
                      <p>
                        A café, campus, park, or the train you nearly missed.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>02</span>
                    <div>
                      <h3>Leave a little detail.</h3>
                      <p>
                        Tell the story without naming or identifying the other
                        person.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>03</span>
                    <div>
                      <h3>See if they remember, too.</h3>
                      <p>
                        Replies are private. Take your time getting to know each
                        other.
                      </p>
                    </div>
                  </li>
                </ol>
                <button className="primary full" onClick={newNote}>
                  Leave your first note <ArrowRight size={17} />
                </button>
              </>
            ) : (
              <>
                <h3>People, not profiles to track.</h3>
                <p>
                  Adults 18+ only. Never post full names, workplaces, home
                  addresses, contact details, or information that could identify
                  someone without consent. Describe a shared moment in a public
                  place.
                </p>
                <h3>Your choice, always.</h3>
                <p>
                  Ignore any reply. Block a person from a conversation. Report a
                  note to hide it from your feed and record the issue. If you
                  meet, choose a public place. Never send money.
                </p>
                <h3>What we store</h3>
                <p>
                  Your email, display name, notes, saved notes, private messages
                  and reports are stored on the server. Your email is not
                  collected. Messages are access-controlled, not end-to-end
                  encrypted. Removing a note hides it; existing private
                  conversations remain. You can permanently delete all your
                  Crossed data from your account.
                </p>
                <h3>Maps & location</h3>
                <p>
                  Location permission is optional. We never follow your live
                  location. OpenFreeMap receives map tile requests and your IP
                  address. Search text and an approximate map center go through
                  our server to Photon. Both use OpenStreetMap data; some places
                  may be missing. A rotating hash of your IP helps limit search
                  abuse and is removed after expiry. No advertising trackers.
                </p>
                <h3>Your account, your control</h3>
                <p>
                  Sign in with Google or your email and password. Use “Forgot
                  your password?” to receive a reset email. Reporting does not
                  guarantee an immediate response; blocking stops private
                  contact between accounts.
                </p>
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
function Compose({
  initial,
  onDone,
}: {
  initial: Place | null;
  onDone: () => Promise<void>;
}) {
  const [place, setPlace] = useState<Place | null>(
      initial?.name !== "Near you" ? initial : null,
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!place) {
      setError("Choose a public place from search first.");
      return;
    }
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("/api/encounters", {
        title: form.get("title"),
        story: form.get("story"),
        question: form.get("question"),
        category: form.get("category"),
        happened: form.get("happened"),
        place: form.get("place"),
        city: form.get("city"),
        lat: place.lat,
        lon: place.lon,
      });
      await onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="modal-body compose">
        <h2>
          Maybe they
          <br />
          <em>felt it, too.</em>
        </h2>
        <p>Leave a note about the moment you shared.</p>
        <label className="field-label">Where did your paths cross?</label>
        <PlaceSearch compact onChoose={setPlace} bias={initial} />
        {place && (
          <div className="place-fields">
            <div className="selected-location">
              <Check size={17} />
              <span>Location selected · you can refine its name below</span>
            </div>
            <label>
              Public place
              <input
                name="place"
                key={place.name}
                defaultValue={place.name}
                required
                minLength={2}
                maxLength={140}
              />
            </label>
            <label>
              City & state
              <input
                name="city"
                key={place.name + place.city}
                defaultValue={place.city}
                placeholder="e.g. Seattle, WA"
                required
                minLength={2}
                maxLength={120}
              />
            </label>
          </div>
        )}
        <div className="form-row">
          <label>
            When?
            <input
              type="date"
              name="happened"
              required
              max={new Date().toLocaleDateString("en-CA")}
              defaultValue={new Date().toLocaleDateString("en-CA")}
            />
          </label>
          <label>
            The setting
            <select name="category" defaultValue={categories[1]}>
              {categories.slice(1).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
        </div>
        <label>
          Give your moment a title
          <input
            name="title"
            required
            minLength={6}
            maxLength={90}
            placeholder="You had a book. I lost my words."
          />
        </label>
        <label>
          What do you remember?
          <textarea
            name="story"
            required
            minLength={20}
            maxLength={1200}
            rows={5}
            placeholder="The place, the day, a little detail they might remember…"
          />
        </label>
        <label>
          Ask the person replying a question <span className="optional-label">Optional</span>
          <input
            name="question"
            maxLength={200}
            placeholder="What book was I holding?"
            aria-describedby="question-help"
          />
        </label>
        <p className="fine-print" id="question-help">
          You are creating this note. Add a question for the person who replies,
          such as “What book was I holding?” They will see your question and
          answer privately.
        </p>
        <p className="fine-print">
          <ShieldCheck size={15} />
          Leave out full names, contact details, private addresses and photos. A
          kind, specific note is enough.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="form-footer">
        <span>Only your display name is public.</span>
        <button className="primary" disabled={busy || !place}>
          {busy ? "Posting…" : "Post your note"}
          <ArrowUpRight size={18} />
        </button>
      </div>
    </form>
  );
}
function ProfileForm({
  profile,
  onDone,
  onMine,
  onDelete,
  onLogout,
  onPassword,
}: {
  onLogout: () => Promise<void>;
  onPassword: () => void;
  onDelete: () => Promise<void>;
  profile: Profile;
  onDone: (p: Profile) => void;
  onMine: () => void;
}) {
  const [deleting, setDeleting] = useState(false),
    [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const r = await api("/api/profile", {
        alias: f.get("alias"),
        adult: f.get("adult") === "on",
      });
      onDone(r.profile);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="modal-body profile-body">
        <div className="profile-mark">
          <UserRound size={30} />
        </div>
        <h2>{profile ? "Your little corner." : "Let’s start with hello."}</h2>
        <p>
          A first name or a nickname is plenty. Keep your personal details
          private.
        </p>
        <label>
          Display name
          <input
            name="alias"
            defaultValue={profile?.alias ?? ""}
            required
            minLength={2}
            maxLength={28}
            placeholder="What should we call you?"
            autoComplete="nickname"
          />
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="adult"
            required
            defaultChecked={!!profile}
          />
          I am 18 or older and will treat others with respect.
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          {busy ? "Saving…" : profile ? "Save changes" : "Continue"}
          <ArrowRight size={17} />
        </button>
        {profile && (
          <button type="button" className="secondary full" onClick={onMine}>
            Manage my notes <ArrowUpRight size={17} />
          </button>
        )}
        <button type="button" className="secondary full" onClick={onPassword}>
          Reset password <ShieldCheck size={16} />
        </button>
        <button
          type="button"
          className="text-button muted"
          onClick={async () => {
            try {
              await onLogout();
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <LogOut size={15} /> Sign out
        </button>
        {profile && (
          <details className="delete-account">
            <summary>Delete my Crossed data</summary>
            <p>
              This permanently deletes your notes, saved notes and all
              conversations you are part of, along with your account and sign-in
              sessions.
            </p>
            <label>
              Type DELETE to confirm
              <input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              className="secondary full"
              disabled={confirmation !== "DELETE" || deleting}
              onClick={async () => {
                setDeleting(true);
                try {
                  await api("/api/profile", {
                    action: "delete-account",
                    confirm: confirmation,
                  });
                  await onDelete();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Deleting…" : "Permanently delete my data"}
            </button>
          </details>
        )}
      </div>
    </form>
  );
}
function ReplyForm({
  post,
  draft,
  onChange,
  onSend,
}: {
  post: Encounter;
  draft: string;
  onChange: (value: string) => void;
  onSend: (s: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSend(String(new FormData(e.currentTarget).get("message")));
        setBusy(false);
      }}
    >
      <div className="modal-body">
        <h2>Was that you?</h2>
        <div className="reply-context">
          {post.title}
          <small>
            {post.place} · {post.city}
          </small>
        </div>
        {post.question && (
          <div className="encounter-question">
            <small>The person who posted this note asks:</small>
            <p>{post.question}</p>
          </div>
        )}
        {post.demo && (
          <p className="example-notice">Try the reply form without signing in. This example has no recipient, so your message will not be sent.</p>
        )}
        <label>
          {post.question ? "Your answer and message" : "Your message"}
          <textarea
            value={draft}
            onChange={(e) => onChange(e.target.value)}
            name="message"
            rows={5}
            minLength={10}
            maxLength={1500}
            required
            placeholder="I remember that moment, too…"
          />
        </label>
        <p className="fine-print">
          <ShieldCheck size={15} />
          {post.demo ? "This practice draft stays on this page." : "Only the person who wrote this note can see your reply. Sign-in is required only when you send."}
        </p>
        <button className="primary full" disabled={busy}>
          {busy ? "One moment…" : post.demo ? "Preview reply" : "Send a private hello"}
          <Send size={17} />
        </button>
      </div>
    </form>
  );
}
function ReportForm({ onSend }: { onSend: (s: string) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        await onSend(String(new FormData(e.currentTarget).get("reason")));
        setBusy(false);
      }}
    >
      <div className="modal-body">
        <h2>Something not right?</h2>
        <p>The note will be hidden from your feed and sent for review.</p>
        <label>
          Tell us what’s wrong
          <textarea
            rows={4}
            name="reason"
            required
            minLength={5}
            maxLength={500}
            placeholder="Harassment, personal information, spam…"
          />
        </label>
        <button className="primary full" disabled={busy}>
          Report note <Flag size={16} />
        </button>
      </div>
    </form>
  );
}
type Thread = {
  id: string;
  title: string;
  place: string;
  alias: string;
  preview: string;
  updated: number;
};
type Message = { id: string; body: string; mine: boolean; created: number };
function Inbox({ notify }: { notify: (s: string) => void }) {
  const [threads, setThreads] = useState<Thread[]>([]),
    [thread, setThread] = useState<Thread | null>(null),
    [messages, setMessages] = useState<Message[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [sending, setSending] = useState(false),
    [text, setText] = useState(""),
    [confirmBlock, setConfirmBlock] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  async function refresh() {
    try {
      const r = await api("/api/inbox");
      setThreads(r.threads);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    api("/api/inbox")
      .then((r) => {
        if (active) {
          setThreads(r.threads);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!thread) return;
    let active = true;
    async function read() {
      try {
        const r = await api("/api/inbox/" + thread!.id);
        if (active) {
          setMessages(r.messages);
          setError("");
        }
      } catch (e) {
        if (active) setError((e as Error).message);
      }
    }
    read();
    const timer = setInterval(() => {
      if (!document.hidden) read();
    }, 12000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [thread]);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);
  async function send(e: FormEvent) {
    e.preventDefault();
    if (!thread || !text.trim()) return;
    setSending(true);
    try {
      await api("/api/inbox/" + thread.id, { message: text });
      setText("");
      const r = await api("/api/inbox/" + thread.id);
      setMessages(r.messages);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="modal-body inbox-body">
      {thread ? (
        <>
          <button
            className="text-button"
            onClick={() => {
              setThread(null);
              setConfirmBlock(false);
              refresh();
            }}
          >
            <ArrowLeft size={16} />
            All conversations
          </button>
          <div className="conversation-head">
            <div>
              <h2>{thread.alias}</h2>
              <p>{thread.title}</p>
            </div>
            <button
              className="text-button muted"
              onClick={() => setConfirmBlock(!confirmBlock)}
            >
              Block
            </button>
          </div>
          {confirmBlock && (
            <div className="block-confirm">
              <p>
                Block this person? You won’t see each other’s notes or receive
                further messages.
              </p>
              <button
                className="secondary"
                onClick={async () => {
                  try {
                    await api("/api/inbox/" + thread.id, { action: "block" });
                    setThread(null);
                    setConfirmBlock(false);
                    refresh();
                    notify("This person has been blocked.");
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                Block person
              </button>
            </div>
          )}
          <div className="messages" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={"message " + (m.mine ? "mine" : "")}>
                <p>{m.body}</p>
                <small>
                  {new Date(m.created).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </small>
              </div>
            ))}
            <div ref={bottom} />
          </div>
          <form onSubmit={send} className="message-form">
            <label className="sr-only" htmlFor="message-text">
              Your message
            </label>
            <textarea
              id="message-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              maxLength={1500}
              rows={2}
              placeholder="A little hello…"
            />
            <button
              className="primary"
              disabled={sending || !text.trim()}
              aria-label="Send message"
            >
              <Send size={18} />
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="inbox-heading">
            <h2>A hello, continued.</h2>
            <button
              aria-label="Refresh inbox"
              className="icon-button"
              onClick={refresh}
            >
              <RefreshCw size={18} />
            </button>
          </div>
          {loading ? (
            <p>Loading your conversations…</p>
          ) : threads.length === 0 ? (
            <div className="empty">
              <Mail size={36} />
              <h3>Your next hello belongs here.</h3>
              <p>
                Private replies to your notes, and the conversations you start,
                will appear here.
              </p>
            </div>
          ) : (
            threads.map((t) => (
              <button
                className="thread"
                key={t.id}
                onClick={() => {
                  setMessages([]);
                  setThread(t);
                }}
              >
                <span className="mini-avatar">{t.alias[0]}</span>
                <span>
                  <strong>{t.alias}</strong>
                  <small>{t.title}</small>
                  <p>{t.preview}</p>
                </span>
                <ArrowUpRight size={18} />
              </button>
            ))
          )}
        </>
      )}
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
    </div>
  );
}
