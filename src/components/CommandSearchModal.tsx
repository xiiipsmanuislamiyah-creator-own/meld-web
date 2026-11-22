import React, { useEffect, useState } from "react";
import { CircleNotch, MagnifyingGlass, Play, SpotifyLogo, X } from "@phosphor-icons/react";
import type { CollectionDetail, Track } from "../types/music";
import { importSpotifyCollection, searchCatalog } from "../lib/api";
import { usePlayer } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { useToast } from "../context/ToastContext";
import { Artwork } from "./Artwork";

interface CommandSearchModalProps {
  open: boolean;
  onClose: () => void;
  onGoToFullSearch: (query: string) => void;
  onImportedSpotify: (detail: CollectionDetail) => void;
}

export function CommandSearchModal({
  open,
  onClose,
  onGoToFullSearch,
  onImportedSpotify,
}: CommandSearchModalProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);

  const { playTrack } = usePlayer();
  const { recentSearches, addRecentSearch, saveImportedOrCustomPlaylist } = useLibrary();
  const { notify } = useToast();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!open || trimmed.length < 1 || /open\.spotify\.com/i.test(trimmed)) {
      setTracks([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setLoading(true);
      searchCatalog(trimmed, "songs")
        .then((res) => setTracks(res.tracks.slice(0, 6)))
        .catch(() => setTracks([]))
        .finally(() => setLoading(false));
    }, 100);
    return () => clearTimeout(timer);
  }, [query, open]);

  if (!open) return null;

  const isSpotifyUrl = /open\.spotify\.com\/(?:intl-[a-z-]+\/)?(playlist|album|track)\//i.test(query.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = query.trim();
    if (!clean) return;
    if (isSpotifyUrl) {
      setLoading(true);
      try {
        const detail = await importSpotifyCollection(clean);
        saveImportedOrCustomPlaylist(detail);
        notify(`Imported "${detail.title}"`, "success");
        onImportedSpotify(detail);
        onClose();
      } catch (err) {
        notify(err instanceof Error ? err.message : "Spotify import failed", "error");
      } finally {
        setLoading(false);
      }
      return;
    }
    addRecentSearch(clean);
    onGoToFullSearch(clean);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Quick search command palette"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card" style={{ padding: 18, gap: 12 }}>
        <form onSubmit={handleSubmit} style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <MagnifyingGlass size={20} style={{ color: "var(--ink-muted)", flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search songs, artists, albums, or paste a Spotify URL..."
            aria-label="Quick search"
            autoFocus
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              outline: "none",
              fontSize: "1rem",
              minHeight: 40,
            }}
          />
          {loading && (
            <CircleNotch size={18} weight="bold" style={{ animation: "spin 0.8s linear infinite", color: "var(--accent)" }} />
          )}
          <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} onClick={onClose} aria-label="Close search">
            <X size={18} />
          </button>
        </form>

        <div style={{ height: 1, background: "var(--border-subtle)" }} />

        {isSpotifyUrl ? (
          <button
            type="button"
            className="btn btn-accent"
            onClick={(e) => void handleSubmit(e)}
            disabled={loading}
          >
            <SpotifyLogo size={18} weight="fill" />
            Import this Spotify link directly
          </button>
        ) : tracks.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {tracks.map((tr) => (
              <button
                key={tr.id}
                type="button"
                className="nav-btn"
                onClick={() => {
                  addRecentSearch(query.trim());
                  void playTrack(tr);
                  onClose();
                }}
              >
                <Artwork src={tr.artwork} alt="" className="sidebar-playlist-thumb" size={64} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="track-title" style={{ fontSize: "0.9rem" }}>{tr.title}</div>
                  <div className="track-artist">{tr.artist}</div>
                </div>
                <Play size={16} weight="fill" style={{ color: "var(--accent)" }} />
              </button>
            ))}
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                addRecentSearch(query.trim());
                onGoToFullSearch(query.trim());
                onClose();
              }}
            >
              View all search results for "{query.trim()}"
            </button>
          </div>
        ) : recentSearches.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)", fontWeight: 600 }}>
              Recent searches
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {recentSearches.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="mood-chip"
                  onClick={() => {
                    onGoToFullSearch(item);
                    onClose();
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)", padding: "6px 4px" }}>
            Type a track or artist name to stream instantly, or press Enter for full albums & playlists.
          </p>
        )}
      </div>
    </div>
  );
}
