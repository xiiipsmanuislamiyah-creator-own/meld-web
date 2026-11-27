import React, { useEffect, useMemo, useState } from "react";
import {
  CircleNotch,
  ClockCounterClockwise,
  Disc,
  Globe,
  HardDrive,
  Headphones,
  Lightning,
  MagnifyingGlass,
  MusicNotes,
  Play,
  Radio,
  SpotifyLogo,
  User,
  Waveform,
  X,
} from "@phosphor-icons/react";
import type {
  ArtistSummary,
  CollectionDetail,
  CollectionSummary,
  SearchFilter,
  Track,
} from "../types/music";
import {
  fetchSearchSuggestions,
  importSpotifyCollection,
  searchCatalog,
} from "../lib/api";
import { AnimatedVibeWave, SvgIconMotion } from "../components/SvgMotion";
import { usePlayer } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { Artwork } from "../components/Artwork";
import { TrackRow } from "../components/TrackRow";
import { CollectionCard } from "../components/CollectionCard";

type SearchScope = "online" | "local";
type SearchSort = "relevance" | "title" | "duration";

interface VibeTile {
  id: string;
  label: string;
  query: string;
  subtitle: string;
  accent: string;
  icon: "music" | "lightning" | "headphones" | "waveform";
}

const VIBES_GRID: VibeTile[] = [
  { id: "hiphop", label: "Hip Hop & Rap", query: "Hip Hop Rap Hits", subtitle: "Beats & lyricists", accent: "#603D82", icon: "lightning" },
  { id: "electronic", label: "Electronic", query: "Electronic Dance Synth", subtitle: "Club & synth textures", accent: "#2B5B6C", icon: "waveform" },
  { id: "pop", label: "Pop", query: "Pop Trending Hits", subtitle: "Chart essentials", accent: "#9C3F1E", icon: "music" },
  { id: "rnb", label: "R&B & Soul", query: "R&B Soul Alternative", subtitle: "Midnight grooves", accent: "#264869", icon: "headphones" },
  { id: "indo", label: "Indonesian Indie", query: "Hindia Tulus NIKI Pamungkas", subtitle: "Local studio picks", accent: "#1B6B46", icon: "music" },
  { id: "ambient", label: "Ambient & Piano", query: "Brambles Nils Frahm Piano", subtitle: "Post-classical calm", accent: "#6E4A22", icon: "waveform" },
];

interface SearchViewProps {
  initialQuery: string;
  onOpenCollection: (id: string) => void;
  onAddToPlaylist: (track: Track) => void;
  onImportedSpotify: (detail: CollectionDetail) => void;
}

export function SearchView({
  initialQuery,
  onOpenCollection,
  onAddToPlaylist,
  onImportedSpotify,
}: SearchViewProps) {
  const [query, setQuery] = useState(initialQuery);
  const [scope, setScope] = useState<SearchScope>("online");
  const [filter, setFilter] = useState<SearchFilter>("all");
  const [sortBy, setSortBy] = useState<SearchSort>("relevance");

  const [topResult, setTopResult] = useState<Track | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [artists, setArtists] = useState<ArtistSummary[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedQuery, setSearchedQuery] = useState("");

  const { playTrack, startRadioFromTrack } = usePlayer();
  const {
    likedTracks,
    recentTracks,
    customPlaylists,
    savedCollections,
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearRecentSearches,
    saveImportedOrCustomPlaylist,
    importYtmPlaylist,
  } = useLibrary();
  const { settings } = useSettings();
  const { notify } = useToast();

  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const isSpotifyLink = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album|track)\//i.test(
    query.trim(),
  );
  const isYtmLink = /music\.youtube\.com\/playlist\?list=/i.test(query.trim());

  // Autocomplete suggestions in Online mode (Instant per-word)
  useEffect(() => {
    const clean = query.trim();
    if (scope !== "online" || clean.length < 1 || isSpotifyLink || isYtmLink) {
      setSuggestions([]);
      return;
    }
    const timer = window.setTimeout(() => {
      fetchSearchSuggestions(clean, settings.region)
        .then((res) => setSuggestions(res.suggestions || []))
        .catch(() => setSuggestions([]));
    }, 75);
    return () => clearTimeout(timer);
  }, [query, scope, isSpotifyLink, isYtmLink, settings.region]);

  // Online search execution (Instant responsive debounce: 110ms)
  useEffect(() => {
    if (scope !== "online") return;
    const clean = query.trim();
    if (clean.length < 1 || isSpotifyLink || isYtmLink) {
      setTopResult(null);
      setTracks([]);
      setCollections([]);
      setArtists([]);
      setSearchedQuery("");
      setError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      searchCatalog(clean, filter, settings.region)
        .then((res) => {
          setTopResult(res.topResult || null);
          setTracks(
            settings.hideVideoSongs && filter !== "videos"
              ? res.tracks.filter((t) => !t.isVideo)
              : res.tracks,
          );
          setCollections(res.collections || []);
          setArtists(res.artists || []);
          setSearchedQuery(clean);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Search request failed.");
        })
        .finally(() => setLoading(false));
    }, 110);

    return () => clearTimeout(timer);
  }, [query, scope, filter, isSpotifyLink, isYtmLink, settings.region, settings.hideVideoSongs]);

  // Local Library search execution
  const localMatches = useMemo(() => {
    if (scope !== "local") return { tracks: [], collections: [] };
    const clean = query.trim().toLowerCase();
    if (!clean) return { tracks: [], collections: [] };

    const poolMap = new Map<string, Track>();
    for (const t of [...likedTracks, ...recentTracks, ...customPlaylists.flatMap((p) => p.tracks)]) {
      if (!poolMap.has(t.id)) poolMap.set(t.id, t);
    }
    const matchedTracks = [...poolMap.values()].filter(
      (t) =>
        t.title.toLowerCase().includes(clean) ||
        t.artist.toLowerCase().includes(clean) ||
        (t.album || "").toLowerCase().includes(clean),
    );
    const matchedCollections: CollectionSummary[] = [...customPlaylists, ...savedCollections].filter(
      (c) =>
        c.title.toLowerCase().includes(clean) ||
        c.subtitle.toLowerCase().includes(clean),
    );
    return { tracks: matchedTracks, collections: matchedCollections };
  }, [scope, query, likedTracks, recentTracks, customPlaylists, savedCollections]);

  const sortedTracks = useMemo(() => {
    const base = scope === "local" ? localMatches.tracks : tracks;
    if (sortBy === "title") {
      return [...base].sort((a, b) => a.title.localeCompare(b.title));
    }
    if (sortBy === "duration") {
      return [...base].sort((a, b) => (a.durationSec || 0) - (b.durationSec || 0));
    }
    return base;
  }, [scope, localMatches.tracks, tracks, sortBy]);

  const displayedCollections = scope === "local" ? localMatches.collections : collections;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim();
    if (!clean) return;
    if (isSpotifyLink || isYtmLink) {
      setLoading(true);
      try {
        let detail: CollectionDetail;
        if (isSpotifyLink) {
          detail = await importSpotifyCollection(clean);
          saveImportedOrCustomPlaylist(detail);
        } else {
          detail = await importYtmPlaylist(clean, settings.region);
        }
        notify(`Imported "${detail.title}" (${detail.tracks.length} songs)`, "success");
        onImportedSpotify(detail);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to import link.");
      } finally {
        setLoading(false);
      }
      return;
    }
    addRecentSearch(clean);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 style={{ fontSize: "var(--text-h1)" }}>Search</h1>
        <p style={{ color: "var(--ink-secondary)", fontSize: "var(--text-body-sm)" }}>
          Search YouTube Music, search your local library, or paste a Spotify / YTM link.
        </p>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSubmit} style={{ position: "relative", display: "flex", gap: 10 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <MagnifyingGlass
            size={19}
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--ink-muted)",
              pointerEvents: "none",
            }}
          />
          <input
            type="search"
            className="field-input"
            style={{ paddingLeft: 44, paddingRight: 44, borderRadius: "var(--radius-pill)", minHeight: 50 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Songs, artists, albums, or playlist URL..."
            aria-label="Search music catalog or local library"
          />
          {query && (
            <button
              type="button"
              className="icon-btn"
              style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", width: 38, height: 38 }}
              onClick={() => setQuery("")}
              aria-label="Clear search query"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </form>

      {/* Quick Instant Search Word Chips */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", paddingBottom: 2, scrollbarWidth: "none" }}>
        <span style={{ fontSize: "0.72rem", color: "var(--ink-muted)", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 3 }}>
          <Lightning size={12} weight="fill" style={{ color: "var(--accent)" }} /> Cepat:
        </span>
        {["Hindia", "Tulus", "Bernadya", "Pop Hits", "Lo-Fi Beats", "Rock Classics", "Piano Ambient", "Midnight Jazz"].map((tag) => (
          <button
            key={tag}
            type="button"
            className="btn btn-ghost"
            style={{
              minHeight: 28,
              padding: "0 10px",
              fontSize: "0.74rem",
              borderRadius: "var(--radius-pill)",
              background: query === tag ? "var(--surface-active)" : "var(--surface-raised)",
              color: query === tag ? "var(--accent)" : "var(--ink-secondary)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
            onClick={() => setQuery(tag)}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Dual Scope Switcher (Online vs My Library) + Sort Dropdown */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div className="scope-pill-group" role="tablist" aria-label="Search scope">
          <button
            type="button"
            role="tab"
            aria-selected={scope === "online"}
            className={`scope-pill${scope === "online" ? " is-active" : ""}`}
            onClick={() => setScope("online")}
          >
            <Globe size={15} weight="bold" /> Online
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={scope === "local"}
            className={`scope-pill${scope === "local" ? " is-active" : ""}`}
            onClick={() => setScope("local")}
          >
            <HardDrive size={15} weight="bold" /> Local Library
          </button>
        </div>

        {(sortedTracks.length > 0 || searchedQuery) && (
          <select
            className="field-input"
            style={{ width: "auto", minHeight: 38, padding: "0 12px", borderRadius: "var(--radius-pill)", fontSize: "0.84rem" }}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SearchSort)}
            aria-label="Sort search results"
          >
            <option value="relevance">Sort: Relevance</option>
            <option value="title">Sort: Title (A–Z)</option>
            <option value="duration">Sort: Duration</option>
          </select>
        )}
      </div>

      {/* Direct Import Banner when URL pasted */}
      {(isSpotifyLink || isYtmLink) && (
        <div
          className="state-panel"
          style={{ flexDirection: "row", justifyContent: "space-between", textAlign: "left", padding: "18px 22px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <SpotifyLogo size={26} weight="fill" style={{ color: "var(--accent)", flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700 }}>
                {isSpotifyLink ? "Spotify URL detected" : "YouTube Music Playlist detected"}
              </div>
              <div style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)" }}>
                Import this collection straight into your Meld Library.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={loading}
            onClick={(e) => void handleSubmit(e)}
          >
            {loading ? "Importing..." : "Import Now"}
          </button>
        </div>
      )}

      {/* Autocomplete Suggestions Strip */}
      {scope === "online" && suggestions.length > 0 && query.trim().length >= 2 && (
        <div className="mood-bar" aria-label="Search suggestions">
          {suggestions.map((sug) => (
            <button
              key={sug}
              type="button"
              className="mood-chip"
              style={{ minHeight: 34, fontSize: "0.82rem" }}
              onClick={() => {
                addRecentSearch(sug);
                setQuery(sug);
              }}
            >
              {sug}
            </button>
          ))}
        </div>
      )}

      {/* Online Filter Tabs */}
      {scope === "online" && !isSpotifyLink && !isYtmLink && (
        <div className="mood-bar" role="tablist" aria-label="Search result type">
          {(
            [
              { id: "all", label: "All" },
              { id: "songs", label: "Songs" },
              { id: "albums", label: "Albums" },
              { id: "artists", label: "Artists" },
              { id: "playlists", label: "Playlists" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filter === tab.id}
              className={`mood-chip${filter === tab.id ? " is-active" : ""}`}
              onClick={() => setFilter(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--ink-muted)", padding: "8px 4px" }}>
          <CircleNotch size={18} weight="bold" style={{ animation: "spin 0.8s linear infinite", color: "var(--accent)" }} />
          <span>Searching YouTube Music...</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="state-panel" role="alert">
          <p style={{ color: "var(--status-error)", fontWeight: 600 }}>{error}</p>
        </div>
      )}

      {/* Pre-search: Recent Pills + Vibes Grid */}
      {!query.trim() && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {recentSearches.length > 0 && (
            <section className="section-block">
              <div className="section-head">
                <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ClockCounterClockwise size={20} /> Recent Searches
                </h2>
                <button type="button" className="btn btn-ghost" onClick={clearRecentSearches}>
                  Clear all
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {recentSearches.map((item) => (
                  <div key={item} className="recent-search-pill">
                    <button
                      type="button"
                      className="recent-search-btn"
                      onClick={() => setQuery(item)}
                    >
                      {item}
                    </button>
                    <button
                      type="button"
                      className="recent-search-remove"
                      onClick={() => removeRecentSearch(item)}
                      aria-label={`Remove ${item} from recent searches`}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="section-block" aria-label="Vibes">
            <h2 className="section-title">Vibes</h2>
            <div className="vibes-grid">
              {VIBES_GRID.map((vibe) => (
                <button
                  key={vibe.id}
                  type="button"
                  className="vibe-card"
                  style={{ borderLeft: `5px solid ${vibe.accent}` }}
                  onClick={() => {
                    setScope("online");
                    addRecentSearch(vibe.label);
                    setQuery(vibe.query);
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span className="vibe-title">{vibe.label}</span>
                    {vibe.icon === "lightning" ? (
                      <SvgIconMotion preset="spark">
                        <Lightning size={20} weight="duotone" style={{ color: vibe.accent }} />
                      </SvgIconMotion>
                    ) : vibe.icon === "waveform" ? (
                      <SvgIconMotion preset="wave">
                        <Waveform size={20} weight="duotone" style={{ color: vibe.accent }} />
                      </SvgIconMotion>
                    ) : vibe.icon === "headphones" ? (
                      <SvgIconMotion preset="float">
                        <Headphones size={20} weight="duotone" style={{ color: vibe.accent }} />
                      </SvgIconMotion>
                    ) : (
                      <SvgIconMotion preset="float">
                        <MusicNotes size={20} weight="duotone" style={{ color: vibe.accent }} />
                      </SvgIconMotion>
                    )}
                  </div>
                  <span className="vibe-sub">{vibe.subtitle}</span>
                  {/* Crisp geometric SVG wave motif */}
                  <AnimatedVibeWave accent={vibe.accent} />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Results View (Online or Local) */}
      {!loading && query.trim().length >= 2 && !isSpotifyLink && !isYtmLink && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Top Result Card (Online All/Songs) */}
          {scope === "online" && topResult && (filter === "all" || filter === "songs") && (
            <section className="section-block" aria-label="Top result">
              <h2 className="section-title">Top Result</h2>
              <div className="top-result-card">
                <Artwork
                  src={topResult.artwork}
                  alt={`${topResult.title} cover`}
                  className="top-result-art"
                  size={200}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {topResult.title}
                  </div>
                  <div style={{ color: "var(--ink-secondary)", fontSize: "var(--text-body-sm)", marginTop: 2 }}>
                    {topResult.artist} · {topResult.durationText}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ minHeight: 38, padding: "0 16px" }}
                      onClick={() => {
                        addRecentSearch(query.trim());
                        void playTrack(topResult, sortedTracks, 0);
                      }}
                    >
                      <Play size={15} weight="fill" /> Play Now
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ minHeight: 38, padding: "0 16px" }}
                      onClick={() => {
                        addRecentSearch(query.trim());
                        void startRadioFromTrack(topResult);
                      }}
                    >
                      <Radio size={15} /> Radio
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Artists Strip */}
          {scope === "online" && artists.length > 0 && (filter === "all" || filter === "artists") && (
            <section className="section-block" aria-label="Artists">
              <h2 className="section-title">Artists</h2>
              <div className="cards-grid">
                {artists.map((art) => (
                  <button
                    key={art.id}
                    type="button"
                    className="artist-card"
                    onClick={() => {
                      addRecentSearch(query.trim());
                      onOpenCollection(art.id);
                    }}
                  >
                    <div className="artist-avatar-wrap">
                      {art.artwork ? (
                        <Artwork src={art.artwork} alt={art.name} className="artist-avatar-img" size={220} />
                      ) : (
                        <User size={34} weight="duotone" style={{ color: "var(--ink-muted)" }} />
                      )}
                    </div>
                    <div className="collection-title">{art.name}</div>
                    <div className="collection-sub">{art.subscribers || "Artist"}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Albums & Playlists Grid */}
          {displayedCollections.length > 0 &&
            (scope === "local" || filter === "all" || filter === "albums" || filter === "playlists") && (
              <section className="section-block" aria-label="Albums and playlists">
                <h2 className="section-title">Albums & Playlists</h2>
                <div className="cards-grid">
                  {displayedCollections.map((col) => (
                    <CollectionCard
                      key={col.id}
                      collection={col}
                      onOpen={(c) => {
                        if (scope === "online") addRecentSearch(query.trim());
                        onOpenCollection(c.id);
                      }}
                    />
                  ))}
                </div>
              </section>
            )}

          {/* Songs Tracklist */}
          {sortedTracks.length > 0 &&
            (scope === "local" || filter === "all" || filter === "songs") && (
              <section className="section-block" aria-label="Songs">
                <h2 className="section-title">
                  Songs ({sortedTracks.length})
                </h2>
                <div className="tracklist-surface">
                  {sortedTracks.map((tr, idx) => (
                    <TrackRow
                      key={`${tr.id}-${idx}`}
                      track={tr}
                      index={idx}
                      onPlay={() => {
                        if (scope === "online") addRecentSearch(query.trim());
                        void playTrack(tr, sortedTracks, idx);
                      }}
                      onAddToPlaylist={onAddToPlaylist}
                      onOpenCollection={onOpenCollection}
                    />
                  ))}
                </div>
              </section>
            )}

          {/* Empty results */}
          {sortedTracks.length === 0 &&
            displayedCollections.length === 0 &&
            artists.length === 0 &&
            (scope === "local" || searchedQuery) && (
              <div className="state-panel">
                <SvgIconMotion preset="spin" duration={4000}>
                  <Disc size={32} weight="duotone" style={{ color: "var(--ink-muted)" }} />
                </SvgIconMotion>
                <h3>No matches found for "{query.trim()}"</h3>
                <p style={{ color: "var(--ink-muted)" }}>
                  {scope === "local"
                    ? "Try switching back to Online search to query the full YouTube Music catalog."
                    : "Try checking your spelling or switching result filters."}
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
}
