import React, { useMemo, useState } from "react";
import {
  ChartBar,
  ClockCounterClockwise,
  Heart,
  LinkSimple,
  ListBullets,
  MagnifyingGlass,
  Play,
  Playlist,
  Plus,
  Shuffle,
  Sparkle,
  SpotifyLogo,
  SquaresFour,
  Trash,
} from "@phosphor-icons/react";
import type { Track } from "../types/music";
import {
  buildAutoMixes,
  computeListenerPersona,
} from "../lib/mixes";
import { useLibrary } from "../context/LibraryContext";
import { usePlayer } from "../context/PlayerContext";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { Artwork } from "../components/Artwork";
import { CollectionCard } from "../components/CollectionCard";
import { TrackRow } from "../components/TrackRow";

interface LibraryViewProps {
  onOpenCollection: (id: string) => void;
  onOpenSpotifyImport: () => void;
  onAddToPlaylist: (track: Track) => void;
}

type LibraryTab = "playlists" | "liked" | "history" | "stats" | "saved";

export function LibraryView({
  onOpenCollection,
  onOpenSpotifyImport,
  onAddToPlaylist,
}: LibraryViewProps) {
  const [subTab, setSubTab] = useState<LibraryTab>("playlists");
  const [filterText, setFilterText] = useState("");
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [ytmImportInput, setYtmImportInput] = useState("");
  const [importingYtm, setImportingYtm] = useState(false);

  const {
    likedTracks,
    savedCollections,
    customPlaylists,
    recentTracks,
    stats,
    hourlyStats,
    createPlaylist,
    importYtmPlaylist,
    clearListeningHistory,
  } = useLibrary();
  const { playTrack, playCollectionTracks } = usePlayer();
  const { settings } = useSettings();
  const { notify } = useToast();

  const autoMixes = useMemo(
    () => buildAutoMixes(recentTracks, likedTracks, stats),
    [recentTracks, likedTracks, stats],
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const pl of customPlaylists) {
      for (const tag of pl.tags || []) set.add(tag);
    }
    return [...set];
  }, [customPlaylists]);

  const filteredPlaylists = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return customPlaylists.filter((pl) => {
      const tagOk = selectedTag === "all" || (pl.tags || []).includes(selectedTag);
      const textOk =
        !q ||
        pl.title.toLowerCase().includes(q) ||
        pl.subtitle.toLowerCase().includes(q);
      return tagOk && textOk;
    });
  }, [customPlaylists, filterText, selectedTag]);

  const filteredLiked = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return likedTracks;
    return likedTracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q),
    );
  }, [likedTracks, filterText]);

  const statSummary = useMemo(() => {
    const entries = Object.values(stats);
    const totalPlays = entries.reduce((sum, e) => sum + e.playCount, 0);
    const totalMinutes = Math.round(
      entries.reduce((sum, e) => sum + e.secondsListened, 0) / 60,
    );

    const artistMap = new Map<string, number>();
    for (const e of entries) {
      artistMap.set(e.artist, (artistMap.get(e.artist) || 0) + e.playCount);
    }
    const topArtists = [...artistMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const topTracks = [...entries]
      .sort((a, b) => b.playCount - a.playCount)
      .slice(0, 8);

    const persona = computeListenerPersona(totalPlays, totalMinutes, hourlyStats);
    const maxHour = Math.max(1, ...hourlyStats);

    return {
      totalPlays,
      totalMinutes,
      uniqueTracks: entries.length,
      topArtists,
      topTracks,
      persona,
      maxHour,
    };
  }, [stats, hourlyStats]);

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;
    const pl = createPlaylist(newPlaylistName.trim());
    notify(`Created playlist "${pl.title}"`, "success");
    setNewPlaylistName("");
    onOpenCollection(pl.id);
  };

  const handleQuickYtmImport = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = ytmImportInput.trim();
    if (!clean) return;
    setImportingYtm(true);
    try {
      const detail = await importYtmPlaylist(clean, settings.region);
      notify(`Imported "${detail.title}" (${detail.tracks.length} tracks)`, "success");
      setYtmImportInput("");
      onOpenCollection(detail.id);
    } catch (err) {
      notify(err instanceof Error ? err.message : "Could not import YouTube Music playlist", "error");
    } finally {
      setImportingYtm(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 14 }}>
        <div>
          <h1 style={{ fontSize: "var(--text-h1)" }}>Your Library</h1>
          <p style={{ color: "var(--ink-secondary)", fontSize: "var(--text-body-sm)" }}>
            {customPlaylists.length} playlists · {likedTracks.length} liked · {recentTracks.length} recent · Stored privately on device
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={onOpenSpotifyImport}>
          <SpotifyLogo size={18} weight="fill" /> Import Spotify / YTM
        </button>
      </div>

      {/* 5-Tab Library Navigation */}
      <div className="mood-bar" role="tablist" aria-label="Library sections">
        {(
          [
            { id: "playlists", label: `Playlists (${customPlaylists.length})` },
            { id: "liked", label: `Liked (${likedTracks.length})` },
            { id: "history", label: `History (${recentTracks.length})` },
            { id: "stats", label: "Stats" },
            { id: "saved", label: `Saved (${savedCollections.length})` },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subTab === tab.id}
            className={`mood-chip${subTab === tab.id ? " is-active" : ""}`}
            onClick={() => setSubTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Playlists Tab */}
      {subTab === "playlists" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          {/* Filter + Grid/List Toggle */}
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
            <div style={{ position: "relative", flex: "1 1 220px" }}>
              <MagnifyingGlass
                size={16}
                style={{
                  position: "absolute",
                  left: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--ink-muted)",
                  pointerEvents: "none",
                }}
              />
              <input
                type="search"
                className="field-input"
                style={{ minHeight: 42, paddingLeft: 38, borderRadius: "var(--radius-pill)" }}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter playlists..."
                aria-label="Filter playlists"
              />
            </div>

            <div className="scope-pill-group">
              <button
                type="button"
                className={`scope-pill${viewMode === "grid" ? " is-active" : ""}`}
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
                <SquaresFour size={16} />
              </button>
              <button
                type="button"
                className={`scope-pill${viewMode === "list" ? " is-active" : ""}`}
                onClick={() => setViewMode("list")}
                aria-label="List view"
              >
                <ListBullets size={16} />
              </button>
            </div>
          </div>

          {/* Custom Playlist Tags Filter */}
          {allTags.length > 0 && (
            <div className="mood-bar" aria-label="Filter playlists by tag">
              <button
                type="button"
                className={`mood-chip${selectedTag === "all" ? " is-active" : ""}`}
                style={{ minHeight: 34, fontSize: "0.8rem" }}
                onClick={() => setSelectedTag("all")}
              >
                All Tags
              </button>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`mood-chip${selectedTag === tag ? " is-active" : ""}`}
                  style={{ minHeight: 34, fontSize: "0.8rem" }}
                  onClick={() => setSelectedTag(tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}

          {/* Auto Top Mixes */}
          {autoMixes.length > 0 && (
            <section className="section-block" aria-label="Auto top mixes">
              <div className="section-head">
                <h2 className="section-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Sparkle size={19} weight="fill" style={{ color: "var(--accent)" }} />
                  Auto Top Mixes
                </h2>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ minHeight: 34, fontSize: "0.82rem" }}
                  onClick={() => setSubTab("stats")}
                >
                  Open Stats
                </button>
              </div>
              <div className="auto-mix-grid">
                {autoMixes.map((mix) => (
                  <button
                    key={mix.id}
                    type="button"
                    className="auto-mix-card"
                    style={{ background: `${mix.accentTint}, var(--surface)` }}
                    onClick={() => void playCollectionTracks(mix.tracks, false)}
                  >
                    <div
                      className="auto-mix-collage"
                      style={
                        mix.tracks.length < 4
                          ? { gridTemplateColumns: "1fr", gridTemplateRows: "1fr" }
                          : undefined
                      }
                    >
                      {(mix.tracks.length >= 4 ? mix.tracks.slice(0, 4) : mix.tracks.slice(0, 1)).map(
                        (tr, i) => (
                          <Artwork
                            key={`${mix.id}-${tr.id}-${i}`}
                            src={tr.artwork}
                            alt=""
                            className="auto-mix-thumb"
                            size={112}
                          />
                        ),
                      )}
                    </div>
                    <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: "1.02rem" }}>
                        {mix.title}
                      </div>
                      <div style={{ fontSize: "var(--text-caption)", color: "var(--ink-secondary)" }}>
                        {mix.subtitle}
                      </div>
                    </div>
                    <span className="auto-mix-play">
                      <Play size={17} weight="fill" />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Quick Create & YTM Playlist Import Bars */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            <form
              onSubmit={handleCreatePlaylist}
              style={{
                display: "flex",
                gap: 8,
                padding: 12,
                borderRadius: "var(--radius-lg)",
                background: "var(--surface)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <input
                type="text"
                className="field-input"
                style={{ flex: 1, minHeight: 42 }}
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="Create a new playlist..."
                aria-label="New playlist title"
              />
              <button type="submit" className="btn btn-primary" style={{ minHeight: 42 }} disabled={!newPlaylistName.trim()}>
                <Plus size={16} weight="bold" /> Create
              </button>
            </form>

            <form
              onSubmit={handleQuickYtmImport}
              style={{
                display: "flex",
                gap: 8,
                padding: 12,
                borderRadius: "var(--radius-lg)",
                background: "var(--surface)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div style={{ position: "relative", flex: 1 }}>
                <LinkSimple
                  size={15}
                  style={{
                    position: "absolute",
                    left: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--ink-muted)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="text"
                  className="field-input"
                  style={{ paddingLeft: 34, minHeight: 42 }}
                  value={ytmImportInput}
                  onChange={(e) => setYtmImportInput(e.target.value)}
                  placeholder="Import YTM Playlist URL or ID..."
                  aria-label="YouTube Music Playlist URL or ID"
                />
              </div>
              <button
                type="submit"
                className="btn btn-secondary"
                style={{ minHeight: 42 }}
                disabled={!ytmImportInput.trim() || importingYtm}
              >
                {importingYtm ? "Importing..." : "Import"}
              </button>
            </form>
          </div>

          {/* Playlist Grid or List */}
          {viewMode === "grid" ? (
            <div className="cards-grid">
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
              {filteredPlaylists.map((pl) => (
                <CollectionCard
                  key={pl.id}
                  collection={pl}
                  onOpen={() => onOpenCollection(pl.id)}
                />
              ))}
            </div>
          ) : (
            <div className="tracklist-surface">
              <button
                type="button"
                className="track-row compact"
                style={{ boxShadow: "none", width: "100%" }}
                onClick={() => onOpenCollection("liked")}
              >
                <div className="track-thumb-btn" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Heart size={20} weight="fill" style={{ color: "var(--accent)" }} />
                </div>
                <div className="track-meta">
                  <span className="track-title">Liked Songs</span>
                  <span className="track-artist">{likedTracks.length} saved tracks</span>
                </div>
                <span className="track-duration">Pinned</span>
              </button>
              {filteredPlaylists.map((pl) => (
                <button
                  key={pl.id}
                  type="button"
                  className="track-row compact"
                  style={{ boxShadow: "none", width: "100%" }}
                  onClick={() => onOpenCollection(pl.id)}
                >
                  <div className="track-thumb-btn">
                    <Artwork src={pl.artwork} alt="" className="track-thumb-img" size={92} />
                  </div>
                  <div className="track-meta">
                    <span className="track-title">{pl.title}</span>
                    <span className="track-artist">
                      {pl.subtitle}
                      {pl.tags && pl.tags.length > 0 ? ` · #${pl.tags.join(" #")}` : ""}
                    </span>
                  </div>
                  <span className="track-duration">{pl.tracks.length}</span>
                </button>
              ))}
            </div>
          )}

          {customPlaylists.length === 0 && (
            <div className="state-panel">
              <Playlist size={32} weight="duotone" style={{ color: "var(--ink-muted)" }} />
              <h3>Import your Spotify or YTM playlists</h3>
              <p style={{ color: "var(--ink-muted)", maxWidth: "48ch" }}>
                Paste any public Spotify or YouTube Music playlist URL to bring your tracklists and album palettes straight into Meld.
              </p>
              <button type="button" className="btn btn-accent" onClick={onOpenSpotifyImport}>
                <SpotifyLogo size={18} weight="fill" /> Import Playlist
              </button>
            </div>
          )}
        </div>
      )}

      {/* Liked Tab */}
      {subTab === "liked" && (
        likedTracks.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <input
                type="search"
                className="field-input"
                style={{ flex: "1 1 220px", maxWidth: 340, minHeight: 42, borderRadius: "var(--radius-pill)" }}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter liked songs..."
                aria-label="Filter liked songs"
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ minHeight: 40 }}
                  onClick={() => void playCollectionTracks(filteredLiked, false)}
                >
                  <Play size={16} weight="fill" /> Play All
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: 40 }}
                  onClick={() => void playCollectionTracks(filteredLiked, true)}
                >
                  <Shuffle size={16} /> Shuffle
                </button>
              </div>
            </div>

            <div className="tracklist-surface">
              {filteredLiked.map((tr, idx) => (
                <TrackRow
                  key={tr.id}
                  track={tr}
                  index={idx}
                  onPlay={() => void playTrack(tr, filteredLiked, idx)}
                  onAddToPlaylist={onAddToPlaylist}
                  onOpenCollection={onOpenCollection}
                />
              ))}
            </div>
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

      {/* History Tab */}
      {subTab === "history" && (
        recentTracks.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "var(--text-caption)", color: "var(--ink-muted)" }}>
                Last {recentTracks.length} tracks played on this browser
              </span>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ color: "var(--status-error)" }}
                onClick={() => {
                  clearListeningHistory();
                  notify("Listening history cleared", "info");
                }}
              >
                <Trash size={15} /> Clear History
              </button>
            </div>
            <div className="tracklist-surface">
              {recentTracks.map((tr, idx) => (
                <TrackRow
                  key={`hist-${tr.id}-${idx}`}
                  track={tr}
                  index={idx}
                  onPlay={() => void playTrack(tr, recentTracks, idx)}
                  onAddToPlaylist={onAddToPlaylist}
                  onOpenCollection={onOpenCollection}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="state-panel">
            <ClockCounterClockwise size={32} weight="duotone" style={{ color: "var(--ink-muted)" }} />
            <h3>Listening history is empty</h3>
            <p style={{ color: "var(--ink-muted)" }}>
              Tracks you play appear here automatically so you can jump back in anytime.
            </p>
          </div>
        )
      )}

      {/* Stats Tab */}
      {subTab === "stats" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Listener Persona Banner */}
          <div className="stat-tile" style={{ background: "radial-gradient(circle at 90% 20%, var(--accent-soft), transparent 60%), var(--surface)" }}>
            <span style={{ fontSize: "var(--text-caption)", fontWeight: 700, color: "var(--accent)" }}>
              LISTENER PERSONA
            </span>
            <h2 style={{ fontSize: "var(--text-h2)" }}>{statSummary.persona.label}</h2>
            <p style={{ fontSize: "var(--text-body-sm)", color: "var(--ink-secondary)" }}>
              {statSummary.persona.detail}
            </p>
          </div>

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

          {/* 24-Hour Listening Rhythm */}
          {statSummary.totalPlays > 0 && (
            <div className="tracklist-surface" style={{ padding: 20, gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h2 style={{ fontSize: "var(--text-h2)" }}>24-Hour Listening Rhythm</h2>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-caption)", color: "var(--ink-muted)" }}>
                  00:00 — 23:00
                </span>
              </div>
              <div className="hourly-bars" role="img" aria-label="24-hour listening distribution">
                {hourlyStats.map((sec, hr) => {
                  const pct = Math.max(8, Math.round((sec / statSummary.maxHour) * 100));
                  return (
                    <div key={hr} className="hourly-bar-col" title={`${String(hr).padStart(2, "0")}:00 — ${Math.round(sec / 60)}m`}>
                      <div
                        className="hourly-bar-fill"
                        style={{
                          height: `${sec > 0 ? pct : 6}%`,
                          opacity: sec > 0 ? 0.92 : 0.18,
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
                {statSummary.topArtists.map(([artist, count], i) => {
                  const maxCount = statSummary.topArtists[0]?.[1] || 1;
                  const sharePct = Math.round((count / maxCount) * 100);
                  return (
                    <div key={artist} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
                      <div style={{ height: 4, borderRadius: 4, background: "var(--surface-raised)", overflow: "hidden" }}>
                        <div style={{ width: `${sharePct}%`, height: "100%", background: "var(--accent)", borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
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
                      padding: "6px 4px",
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
        </div>
      )}

      {/* Saved Collections Tab */}
      {subTab === "saved" && (
        savedCollections.length > 0 ? (
          <div className="cards-grid">
            {savedCollections.map((col) => (
              <CollectionCard
                key={col.id}
                collection={col}
                onOpen={() => onOpenCollection(col.id)}
              />
            ))}
          </div>
        ) : (
          <div className="state-panel">
            <Playlist size={32} weight="duotone" style={{ color: "var(--ink-muted)" }} />
            <h3>No saved albums or artists yet</h3>
            <p style={{ color: "var(--ink-muted)" }}>
              Open any album, chart, or artist and click the Bookmark button to pin it here.
            </p>
          </div>
        )
      )}
    </div>
  );
}
