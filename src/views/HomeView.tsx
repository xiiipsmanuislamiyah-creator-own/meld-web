import { useEffect, useState } from "react";
import {
  ArrowClockwise,
  Disc,
  Play,
  SpotifyLogo,
  Waveform,
} from "@phosphor-icons/react";
import type { CollectionSummary, HomePayload, Track } from "../types/music";
import { fetchHomeFeed } from "../lib/api";
import { usePlayer } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { Artwork } from "../components/Artwork";
import { TrackRow } from "../components/TrackRow";
import { CollectionCard } from "../components/CollectionCard";
import { HorizontalRail } from "../components/HorizontalRail";

const MOODS = [
  { id: "all", label: "For You" },
  { id: "indonesian", label: "Indonesian" },
  { id: "indie", label: "Indie & Post-Rock" },
  { id: "lofi", label: "Lo-Fi & Study" },
  { id: "rnb", label: "R&B & Soul" },
  { id: "electronic", label: "Electronic" },
  { id: "acoustic", label: "Acoustic Piano" },
];

interface HomeViewProps {
  onOpenCollection: (id: string) => void;
  onOpenSpotifyImport: () => void;
  onAddToPlaylist: (track: Track) => void;
}

export function HomeView({
  onOpenCollection,
  onOpenSpotifyImport,
  onAddToPlaylist,
}: HomeViewProps) {
  const [mood, setMood] = useState("all");
  const [feed, setFeed] = useState<HomePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { playTrack } = usePlayer();
  const { recentTracks } = useLibrary();

  const loadFeed = (targetMood: string) => {
    setLoading(true);
    setError(null);
    fetchHomeFeed(targetMood)
      .then((data) => setFeed(data))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Could not load catalog from YouTube Music."),
      )
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFeed(mood);
  }, [mood]);

  const handleOpenSummary = (col: CollectionSummary) => {
    onOpenCollection(col.id);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Mood & Genre Selector */}
      <div className="mood-bar" role="tablist" aria-label="Filter music by mood">
        {MOODS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={mood === m.id}
            className={`mood-chip${mood === m.id ? " is-active" : ""}`}
            onClick={() => setMood(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Loading Skeleton */}
      {loading && !feed && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="skeleton-box" style={{ height: 270, borderRadius: "var(--radius-xl)" }} />
          <div className="quick-picks-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton-box" style={{ height: 64, borderRadius: "var(--radius-md)" }} />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !feed && (
        <div className="state-panel" role="alert">
          <Disc size={34} weight="duotone" style={{ color: "var(--status-error)" }} />
          <h3>Unable to reach YouTube Music catalog</h3>
          <p style={{ color: "var(--ink-muted)", maxWidth: "46ch" }}>{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => loadFeed(mood)}>
            <ArrowClockwise size={17} /> Retry connection
          </button>
        </div>
      )}

      {feed && (
        <>
          {/* Editorial Feature Web Banner */}
          <section className="featured-banner" aria-label="Featured studio album">
            <div className="featured-body">
              <div className="featured-kicker">
                <Waveform size={17} weight="bold" />
                <span>Featured Listening Session — {feed.featured.artist}</span>
              </div>
              <h1 className="featured-title">{feed.featured.title}</h1>
              <p className="featured-desc">{feed.featured.tagline}</p>
              <div className="featured-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (feed.quickPicks[0]) {
                      void playTrack(feed.quickPicks[0], feed.quickPicks, 0);
                    } else {
                      onOpenCollection(feed.featured.id);
                    }
                  }}
                >
                  <Play size={17} weight="fill" /> Listen Now
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => onOpenCollection(feed.featured.id)}
                >
                  Open Album
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={onOpenSpotifyImport}
                >
                  <SpotifyLogo size={18} weight="fill" style={{ color: "var(--accent)" }} />
                  Import Spotify
                </button>
              </div>
            </div>

            <button
              type="button"
              className="featured-art-frame"
              onClick={() => onOpenCollection(feed.featured.id)}
              aria-label={`Open ${feed.featured.title} album`}
            >
              <Artwork
                src={feed.featured.artwork}
                alt={`${feed.featured.title} album cover`}
                className="featured-art-img"
                priority
                size={544}
              />
            </button>
          </section>

          {/* Quick Picks Live Track Grid */}
          <section className="section-block" aria-label="Quick picks">
            <div className="section-head">
              <div>
                <h2 className="section-title">Quick Picks</h2>
                <p className="section-sub">
                  Direct client-side audio streaming — tap any song to adapt the room palette
                </p>
              </div>
            </div>
            <div className="quick-picks-grid">
              {feed.quickPicks.map((track, idx) => (
                <TrackRow
                  key={track.id}
                  track={track}
                  compact
                  onPlay={() => void playTrack(track, feed.quickPicks, idx)}
                  onAddToPlaylist={onAddToPlaylist}
                />
              ))}
            </div>
          </section>

          {/* Recently Played (only shown when real history exists) */}
          {recentTracks.length > 0 && (
            <section className="section-block" aria-label="Jump back in">
              <div className="section-head">
                <div>
                  <h2 className="section-title">Jump Back In</h2>
                  <p className="section-sub">Your recent listening sessions saved locally</p>
                </div>
              </div>
              <div className="quick-picks-grid">
                {recentTracks.slice(0, 4).map((track, idx) => (
                  <TrackRow
                    key={`recent-${track.id}`}
                    track={track}
                    compact
                    onPlay={() => void playTrack(track, recentTracks, idx)}
                    onAddToPlaylist={onAddToPlaylist}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Live Discovery Carousels */}
          {feed.shelves.map((shelf) => {
            if (shelf.kind === "collections" && shelf.collections && shelf.collections.length > 0) {
              return (
                <HorizontalRail key={shelf.id} title={shelf.title}>
                  {shelf.collections.map((col) => (
                    <CollectionCard key={col.id} collection={col} onOpen={handleOpenSummary} />
                  ))}
                </HorizontalRail>
              );
            }
            if (shelf.kind === "tracks" && shelf.tracks && shelf.tracks.length > 0) {
              return (
                <section key={shelf.id} className="section-block" aria-label={shelf.title}>
                  <div className="section-head">
                    <h2 className="section-title">{shelf.title}</h2>
                  </div>
                  <div className="tracklist-surface">
                    {shelf.tracks.slice(0, 8).map((tr, idx) => (
                      <TrackRow
                        key={`${shelf.id}-${tr.id}`}
                        track={tr}
                        index={idx}
                        onPlay={() => void playTrack(tr, shelf.tracks, idx)}
                        onAddToPlaylist={onAddToPlaylist}
                      />
                    ))}
                  </div>
                </section>
              );
            }
            return null;
          })}
        </>
      )}
    </div>
  );
}
