import React, { useMemo, useState } from "react";
import {
  ChartBar,
  Heart,
  Playlist,
  Plus,
  SpotifyLogo,
} from "@phosphor-icons/react";
import type { Track } from "../types/music";
import { useLibrary } from "../context/LibraryContext";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { CollectionCard } from "../components/CollectionCard";
import { TrackRow } from "../components/TrackRow";

interface LibraryViewProps {
  onOpenCollection: (id: string) => void;
  onOpenSpotifyImport: () => void;
  onAddToPlaylist: (track: Track) => void;
}

export function LibraryView({
  onOpenCollection,
  onOpenSpotifyImport,
  onAddToPlaylist,
}: LibraryViewProps) {
  const [subTab, setSubTab] = useState<"collections" | "liked" | "recap">("collections");
  const [newPlaylistName, setNewPlaylistName] = useState("");

  const {
    likedTracks,
    savedCollections,
    customPlaylists,
    recentTracks,
    stats,
    createPlaylist,
  } = useLibrary();
  const { playTrack } = usePlayer();
  const { notify } = useToast();

  const statSummary = useMemo(() => {
    const entries = Object.values(stats);
    const totalPlays = entries.reduce((sum, e) => sum + e.playCount, 0);
    const totalMinutes = Math.round(entries.reduce((sum, e) => sum + e.secondsListened, 0) / 60);

    const artistMap = new Map<string, number>();
    for (const e of entries) {
      artistMap.set(e.artist, (artistMap.get(e.artist) || 0) + e.playCount);
    }
    const topArtists = [...artistMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const topTracks = [...entries]
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 6);

    return { totalPlays, totalMinutes, uniqueTracks: entries.length, topArtists, topTracks };
  }, [stats]);

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const pl = createPlaylist(newPlaylistName.trim());
    notify(`Created playlist "${pl.title}"`, "success");
    setNewPlaylistName("");
    onOpenCollection(pl.id);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: "var(--text-h1)" }}>Your Library</h1>
          <p style={{ color: "var(--ink-secondary)", fontSize: "var(--text-body-sm)" }}>
            Stored privately on this device — zero cloud tracking or account required.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onOpenSpotifyImport}>
          <SpotifyLogo size={18} weight="fill" /> Import Spotify Playlist
        </button>
      </div>

      {/* Sub-navigation */}
      <div className="mood-bar" role="tablist" aria-label="Library sections">
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "collections"}
          className={`mood-chip${subTab === "collections" ? " is-active" : ""}`}
          onClick={() => setSubTab("collections")}
        >
          Playlists & Albums
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "liked"}
          className={`mood-chip${subTab === "liked" ? " is-active" : ""}`}
          onClick={() => setSubTab("liked")}
        >
          Liked Songs ({likedTracks.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === "recap"}
          className={`mood-chip${subTab === "recap" ? " is-active" : ""}`}
          onClick={() => setSubTab("recap")}
        >
          Listening Recap
        </button>
      </div>

      {subTab === "collections" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Quick New Playlist Creator */}
          <form
            onSubmit={handleCreatePlaylist}
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              padding: 16,
              borderRadius: "var(--radius-lg)",
              background: "var(--surface)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <input
              type="text"
              className="field-input"
              style={{ flex: "1 1 220px" }}
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              placeholder="Create a local playlist (e.g., Late Night Focus)..."
              aria-label="New playlist title"
            />
            <button type="submit" className="btn btn-primary" disabled={!newPlaylistName.trim()}>
              <Plus size={17} weight="bold" /> Create Playlist
            </button>
          </form>

          <div className="cards-grid">
            {/* Pinned Liked Songs Card */}
            <CollectionCard
              collection={{
                id: "liked",
                title: "Liked Songs",
                subtitle: `${likedTracks.length} saved tracks`,
                type: "playlist",
                artwork: likedTracks[0]?.artwork || "",
                source: "local",
              }}
              onOpen={() => onOpenCollection("liked")}
            />

            {customPlaylists.map((pl) => (
              <CollectionCard
                key={pl.id}
                collection={pl}
                onOpen={() => onOpenCollection(pl.id)}
              />
            ))}

            {savedCollections.map((col) => (
              <CollectionCard
                key={col.id}
                collection={col}
                onOpen={() => onOpenCollection(col.id)}
              />
            ))}
          </div>

          {customPlaylists.length === 0 && savedCollections.length === 0 && (
            <div className="state-panel">
              <Playlist size={32} weight="duotone" style={{ color: "var(--ink-muted)" }} />
              <h3>Bring your Spotify playlists over</h3>
              <p style={{ color: "var(--ink-muted)", maxWidth: "48ch" }}>
                Paste any public Spotify playlist URL to import its full tracklist and cover palette straight into Meld.
              </p>
              <button type="button" className="btn btn-accent" onClick={onOpenSpotifyImport}>
                <SpotifyLogo size={18} weight="fill" /> Import from Spotify
              </button>
            </div>
          )}
        </div>
      )}

      {subTab === "liked" && (
        likedTracks.length > 0 ? (
          <div className="tracklist-surface">
            {likedTracks.map((tr, idx) => (
              <TrackRow
                key={tr.id}
                track={tr}
                index={idx}
                onPlay={() => void playTrack(tr, likedTracks, idx)}
                onAddToPlaylist={onAddToPlaylist}
              />
            ))}
          </div>
        ) : (
          <div className="state-panel">
            <Heart size={32} weight="duotone" style={{ color: "var(--ink-muted)" }} />
            <h3>No liked songs yet</h3>
            <p style={{ color: "var(--ink-muted)" }}>
              Tap the heart icon on any track to save it here for instant replay.
            </p>
          </div>
        )
      )}

      {subTab === "recap" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="stat-grid">
            <div className="stat-tile">
              <span className="stat-value">{statSummary.totalPlays}</span>
              <span className="stat-label">Total Track Plays</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{statSummary.totalMinutes}m</span>
              <span className="stat-label">Minutes Listened</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{statSummary.uniqueTracks}</span>
              <span className="stat-label">Unique Tracks Played</span>
            </div>
            <div className="stat-tile">
              <span className="stat-value">{likedTracks.length}</span>
              <span className="stat-label">Liked Songs</span>
            </div>
          </div>

          {statSummary.totalPlays === 0 ? (
            <div className="state-panel">
              <ChartBar size={32} weight="duotone" style={{ color: "var(--ink-muted)" }} />
              <h3>Your Recap starts on your first song</h3>
              <p style={{ color: "var(--ink-muted)", maxWidth: "46ch" }}>
                Meld tracks your top artists, play counts, and listening minutes locally in your browser without sending telemetry to external servers.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
              <div className="tracklist-surface" style={{ padding: 20, gap: 12 }}>
                <h2 style={{ fontSize: "var(--text-h2)" }}>Top Artists</h2>
                {statSummary.topArtists.map(([artist, count], i) => (
                  <div
                    key={artist}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 4px",
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-muted)", marginRight: 10 }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {artist}
                    </span>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-caption)", color: "var(--accent)" }}>
                      {count} {count === 1 ? "play" : "plays"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="tracklist-surface" style={{ padding: 20, gap: 12 }}>
                <h2 style={{ fontSize: "var(--text-h2)" }}>Most Played</h2>
                {statSummary.topTracks.map((entry, i) => (
                  <div
                    key={entry.trackId}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 4px",
                      borderBottom: "1px solid var(--border-subtle)",
                      gap: 12,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div className="track-title" style={{ fontSize: "0.9rem" }}>
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-muted)", marginRight: 10 }}>
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        {entry.title}
                      </div>
                      <div className="track-artist" style={{ marginLeft: 28 }}>{entry.artist}</div>
                    </div>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-caption)", color: "var(--accent)", flexShrink: 0 }}>
                      {entry.playCount}x
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentTracks.length > 0 && (
            <section className="section-block">
              <h2 className="section-title">Listening History</h2>
              <div className="tracklist-surface">
                {recentTracks.slice(0, 12).map((tr, idx) => (
                  <TrackRow
                    key={`hist-${tr.id}-${idx}`}
                    track={tr}
                    index={idx}
                    onPlay={() => void playTrack(tr, recentTracks, idx)}
                    onAddToPlaylist={onAddToPlaylist}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
