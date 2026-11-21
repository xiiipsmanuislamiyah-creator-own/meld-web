import React, { useEffect, useState } from "react";
import {
  CircleNotch,
  ClockCounterClockwise,
  MagnifyingGlass,
  SpotifyLogo,
  X,
} from "@phosphor-icons/react";
import type { CollectionDetail, CollectionSummary, Track } from "../types/music";
import { importSpotifyCollection, searchCatalog } from "../lib/api";
import { usePlayer } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { useToast } from "../context/ToastContext";
import { TrackRow } from "../components/TrackRow";
import { CollectionCard } from "../components/CollectionCard";

const SUGGESTED_QUERIES = [
  "Brambles Charcoal",
  "Hindia",
  "NIKI",
  "Tulus",
  "Frank Ocean",
  "Fred again..",
  "Cigarettes After Sex",
  "Nils Frahm",
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
  const [filter, setFilter] = useState<"songs" | "albums" | "playlists">("songs");
  const [tracks, setTracks] = useState<Track[]>([]);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedQuery, setSearchedQuery] = useState("");

  const { playTrack } = usePlayer();
  const { recentSearches, addRecentSearch, clearRecentSearches, saveImportedOrCustomPlaylist } =
    useLibrary();
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

  useEffect(() => {
    const clean = query.trim();
    if (clean.length < 2 || isSpotifyLink) {
      setTracks([]);
      setCollections([]);
      setSearchedQuery("");
      setError(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      searchCatalog(clean, filter)
        .then((res) => {
          setTracks(res.tracks);
          setCollections(res.collections);
          setSearchedQuery(clean);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Search request failed.");
        })
        .finally(() => setLoading(false));
    }, 320);

    return () => clearTimeout(timer);
  }, [query, filter, isSpotifyLink]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim();
    if (!clean) return;
    if (isSpotifyLink) {
      setLoading(true);
      try {
        const detail = await importSpotifyCollection(clean);
        saveImportedOrCustomPlaylist(detail);
        notify(`Imported "${detail.title}" (${detail.tracks.length} songs)`, "success");
        onImportedSpotify(detail);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to import Spotify link.");
      } finally {
        setLoading(false);
      }
      return;
    }
    addRecentSearch(clean);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <h1 style={{ fontSize: "var(--text-h1)" }}>Search Catalog</h1>
        <p style={{ color: "var(--ink-secondary)", fontSize: "var(--text-body-sm)" }}>
          Query over 100M tracks on YouTube Music or paste any public Spotify link directly.
        </p>
      </div>

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
            placeholder="Songs, artists, albums, or https://open.spotify.com/..."
            aria-label="Search music catalog"
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

      {isSpotifyLink && (
        <div
          className="state-panel"
          style={{ flexDirection: "row", justifyContent: "space-between", textAlign: "left", padding: "18px 22px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <SpotifyLogo size={26} weight="fill" style={{ color: "var(--accent)", flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700 }}>Spotify URL detected</div>
              <div style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)" }}>
                Import this collection into Meld and stream all songs ad-free.
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

      {/* Filter Tabs */}
      {!isSpotifyLink && (
        <div className="mood-bar" role="tablist" aria-label="Search result type">
          {(["songs", "albums", "playlists"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={filter === tab}
              className={`mood-chip${filter === tab ? " is-active" : ""}`}
              onClick={() => setFilter(tab)}
            >
              {tab === "songs" ? "Songs" : tab === "albums" ? "Albums" : "Playlists"}
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

      {/* Pre-search discovery & recent queries */}
      {!query.trim() && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {recentSearches.length > 0 && (
            <section className="section-block">
              <div className="section-head">
                <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <ClockCounterClockwise size={20} /> Recent Searches
                </h2>
                <button type="button" className="btn btn-ghost" onClick={clearRecentSearches}>
                  Clear
                </button>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="mood-chip"
                    onClick={() => setQuery(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="section-block">
            <h2 className="section-title">Explore Artists & Albums</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUGGESTED_QUERIES.map((term) => (
                <button
                  key={term}
                  type="button"
                  className="mood-chip"
                  onClick={() => {
                    addRecentSearch(term);
                    setQuery(term);
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Song Results */}
      {!loading && searchedQuery && filter === "songs" && (
        tracks.length > 0 ? (
          <div className="tracklist-surface">
            {tracks.map((tr, idx) => (
              <TrackRow
                key={tr.id}
                track={tr}
                index={idx}
                onPlay={() => {
                  addRecentSearch(searchedQuery);
                  void playTrack(tr, tracks, idx);
                }}
                onAddToPlaylist={onAddToPlaylist}
              />
            ))}
          </div>
        ) : (
          <div className="state-panel">
            <h3>No songs found for "{searchedQuery}"</h3>
            <p style={{ color: "var(--ink-muted)" }}>
              Try checking the spelling or switching to Albums or Playlists.
            </p>
          </div>
        )
      )}

      {/* Album & Playlist Results */}
      {!loading && searchedQuery && (filter === "albums" || filter === "playlists") && (
        collections.length > 0 ? (
          <div className="cards-grid">
            {collections.map((col) => (
              <CollectionCard
                key={col.id}
                collection={col}
                onOpen={(c) => {
                  addRecentSearch(searchedQuery);
                  onOpenCollection(c.id);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="state-panel">
            <h3>No {filter} found for "{searchedQuery}"</h3>
            <p style={{ color: "var(--ink-muted)" }}>Try another keyword or artist name.</p>
          </div>
        )
      )}
    </div>
  );
}
