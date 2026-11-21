import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowClockwise,
  Disc,
  MagnifyingGlass,
  Play,
  Radio,
  Sparkle,
  Waveform,
} from "@phosphor-icons/react";
import type { CollectionSummary, HomePayload, NavTab, Track } from "../types/music";
import { fetchHomeFeed } from "../lib/api";
import {
  buildArtistCollages,
  buildForgottenFavorites,
  buildSpeedDial,
} from "../lib/mixes";
import { usePlayer } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { useSettings } from "../context/SettingsContext";
import { Artwork } from "../components/Artwork";
import { TrackRow } from "../components/TrackRow";
import { TrackContextMenu } from "../components/TrackContextMenu";
import { CollectionCard } from "../components/CollectionCard";
import { HorizontalRail } from "../components/HorizontalRail";

const MOODS = [
  { id: "all", label: "All" },
  { id: "relax", label: "Relax" },
  { id: "energize", label: "Energize" },
  { id: "focus", label: "Focus" },
  { id: "workout", label: "Workout" },
  { id: "commute", label: "Commute" },
  { id: "sad", label: "Sad" },
  { id: "indonesian", label: "Indonesian" },
  { id: "indie", label: "Indie" },
  { id: "lofi", label: "Lo-Fi" },
];

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

interface HomeViewProps {
  onOpenCollection: (id: string) => void;
  onNavigateTab: (tab: NavTab) => void;
  onAddToPlaylist: (track: Track) => void;
}

export function HomeView({
  onOpenCollection,
  onNavigateTab,
  onAddToPlaylist,
}: HomeViewProps) {
  const [mood, setMood] = useState("all");
  const [feed, setFeed] = useState<HomePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    currentTrack,
    playbackState,
    playTrack,
    playCollectionTracks,
    startRadioFromTrack,
  } = usePlayer();
  const { recentTracks, likedTracks, stats } = useLibrary();
  const { settings } = useSettings();

  const loadFeed = useCallback(
    (targetMood: string) => {
      setLoading(true);
      setError(null);
      fetchHomeFeed(targetMood, settings.region)
        .then((data) => setFeed(data))
        .catch((err) =>
          setError(
            err instanceof Error
              ? err.message
              : "Could not load catalog from YouTube Music.",
          ),
        )
        .finally(() => setLoading(false));
    },
    [settings.region],
  );

  useEffect(() => {
    loadFeed(mood);
  }, [mood, loadFeed]);

  const filterVideos = useCallback(
    (list: Track[]) => (settings.hideVideoSongs ? list.filter((t) => !t.isVideo) : list),
    [settings.hideVideoSongs],
  );

  const quickPicks = useMemo(
    () => filterVideos(feed?.quickPicks || []),
    [feed?.quickPicks, filterVideos],
  );

  const viralHits = useMemo(
    () => filterVideos(feed?.viralHits || feed?.quickPicks || []),
    [feed?.viralHits, feed?.quickPicks, filterVideos],
  );

  const viralColumns = useMemo(() => {
    const cols: Track[][] = [];
    for (let i = 0; i < viralHits.length; i += 4) {
      cols.push(viralHits.slice(i, i + 4));
    }
    return cols;
  }, [viralHits]);

  const speedDialTracks = useMemo(
    () => buildSpeedDial(recentTracks, likedTracks, quickPicks, settings.hideVideoSongs),
    [recentTracks, likedTracks, quickPicks, settings.hideVideoSongs],
  );

  const artistCollages = useMemo(
    () => buildArtistCollages([...viralHits, ...quickPicks]),
    [viralHits, quickPicks],
  );

  const forgottenFavorites = useMemo(
    () => buildForgottenFavorites(recentTracks, likedTracks, stats),
    [recentTracks, likedTracks, stats],
  );

  const continueTrack = mood === "all" ? currentTrack || recentTracks[0] || null : null;

  const handleOpenSummary = (col: CollectionSummary) => {
    onOpenCollection(col.id);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      {/* Contextual Greeting Header + Quick Actions */}
      <div className="home-greeting-row">
        <div>
          <h1 style={{ fontSize: "var(--text-h1)", lineHeight: 1.12 }}>{getGreeting()}</h1>
          <p style={{ color: "var(--ink-muted)", fontSize: "var(--text-caption)", marginTop: 3 }}>
            Curated studio mixes & live YouTube Music picks · Region {settings.region}
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            className="icon-btn icon-btn-surface"
            onClick={() => onNavigateTab("search")}
            aria-label="Open full search"
            title="Search"
          >
            <MagnifyingGlass size={18} />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn-surface"
            onClick={() => loadFeed(mood)}
            aria-label="Refresh home feed"
            title="Refresh"
          >
            <ArrowClockwise size={18} />
          </button>
        </div>
      </div>

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
          <div className="skeleton-box" style={{ height: 240, borderRadius: "var(--radius-xl)" }} />
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
          {/* Dynamic Hero Banner: Continue Session OR Featured Studio Mix */}
          {continueTrack ? (
            <section className="featured-banner" aria-label="Continue listening session">
              <div className="featured-body">
                <div className="featured-kicker">
                  <Sparkle size={16} weight="fill" />
                  <span>
                    {currentTrack && playbackState === "playing"
                      ? "NOW PLAYING SESSION"
                      : "CONTINUE SESSION"}
                  </span>
                </div>
                <h2 className="featured-title">{continueTrack.title}</h2>
                <p className="featured-desc">
                  {continueTrack.artist}
                  {continueTrack.album ? ` · ${continueTrack.album}` : ""}
                </p>
                <div className="featured-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => void playTrack(continueTrack, recentTracks.length ? recentTracks : quickPicks)}
                  >
                    <Play size={17} weight="fill" />
                    {currentTrack?.id === continueTrack.id && playbackState === "playing"
                      ? "Playing"
                      : "Resume Mix"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => void startRadioFromTrack(continueTrack)}
                  >
                    <Radio size={17} /> Radio
                  </button>
                  {continueTrack.albumId && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => onOpenCollection(continueTrack.albumId!)}
                    >
                      Open Album
                    </button>
                  )}
                </div>
              </div>

              <button
                type="button"
                className="featured-art-frame"
                onClick={() => void playTrack(continueTrack)}
                aria-label={`Play ${continueTrack.title}`}
              >
                <Artwork
                  src={continueTrack.artwork}
                  alt={`${continueTrack.title} cover`}
                  className="featured-art-img"
                  priority
                  size={544}
                />
              </button>
            </section>
          ) : (
            <section className="featured-banner" aria-label="Featured studio album">
              <div className="featured-body">
                <div className="featured-kicker">
                  <Waveform size={17} weight="bold" />
                  <span>DAILY SPOTLIGHT MIX · {feed.featured.artist}</span>
                </div>
                <h2 className="featured-title">{feed.featured.title}</h2>
                <p className="featured-desc">{feed.featured.tagline}</p>
                <div className="featured-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      if (quickPicks[0]) {
                        void playTrack(quickPicks[0], quickPicks, 0);
                      } else {
                        onOpenCollection(feed.featured.id);
                      }
                    }}
                  >
                    <Play size={17} weight="fill" /> Play Mix
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      if (quickPicks[0]) void startRadioFromTrack(quickPicks[0]);
                      else onOpenCollection(feed.featured.id);
                    }}
                  >
                    <Radio size={17} /> Radio
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => onOpenCollection(feed.featured.id)}
                  >
                    Open Album
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
          )}

          {/* Top Picks Artist Collage Cards */}
          {artistCollages.length > 0 && (
            <section className="section-block" aria-label="Top picks for you">
              <div className="section-head">
                <div>
                  <h2 className="section-title">Top Picks for You</h2>
                  <p className="section-sub">Artist-led mixes built around your current stream</p>
                </div>
              </div>

              <div className="collage-rail">
                {artistCollages.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    className="collage-card"
                    style={{ background: `${card.paletteTint}, var(--surface)` }}
                    onClick={() => void playTrack(card.lead, card.queue, 0)}
                  >
                    <div className="collage-badge">Meld Mix</div>
                    <div className="collage-circles">
                      {card.thumbs[0] && (
                        <Artwork src={card.thumbs[0]} alt="" className="collage-circle primary" size={240} />
                      )}
                      {card.thumbs[1] && (
                        <Artwork src={card.thumbs[1]} alt="" className="collage-circle secondary" size={160} />
                      )}
                      {card.thumbs[2] && (
                        <Artwork src={card.thumbs[2]} alt="" className="collage-circle tertiary" size={140} />
                      )}
                    </div>
                    <div style={{ textAlign: "left", minWidth: 0 }}>
                      <div className="collage-sub">{card.subtitle}</div>
                      <div className="collage-title">{card.artistName} & Similar</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Speed Dial (4x2 Quick Replay Grid) */}
          {speedDialTracks.length > 0 && (
            <section className="section-block" aria-label="Speed dial">
              <div className="section-head">
                <div>
                  <h2 className="section-title">Speed Dial</h2>
                  <p className="section-sub">One-tap access to your rotation & featured picks</p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: 36, padding: "0 14px", fontSize: "0.82rem" }}
                  onClick={() => void playCollectionTracks(speedDialTracks, false)}
                >
                  <Play size={14} weight="fill" /> Play all
                </button>
              </div>

              <div className="speed-dial-grid">
                {speedDialTracks.map((tr, idx) => (
                  <button
                    key={`sd-${tr.id}`}
                    type="button"
                    className="speed-dial-tile"
                    onClick={() => void playTrack(tr, speedDialTracks, idx)}
                  >
                    <Artwork
                      src={tr.artwork}
                      alt={`${tr.title} cover`}
                      className="speed-dial-img"
                      size={280}
                    />
                    <div className="speed-dial-overlay">
                      <span className="speed-dial-title">{tr.title}</span>
                      <span className="speed-dial-artist">{tr.artist}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Viral & Trending Compact Multi-Column Rail */}
          {viralColumns.length > 0 && (
            <section className="section-block" aria-label="Viral and trending tracks">
              <div className="section-head">
                <div>
                  <h2 className="section-title">Trending & Viral Now</h2>
                  <p className="section-sub">Swipe through high-rotation songs across your region</p>
                </div>
              </div>

              <div className="viral-columns-rail">
                {viralColumns.map((col, colIdx) => (
                  <div key={`vcol-${colIdx}`} className="viral-column">
                    {col.map((tr) => (
                      <div key={`vr-${tr.id}`} className="viral-compact-row">
                        <button
                          type="button"
                          className="track-thumb-btn"
                          style={{ width: 44, height: 44 }}
                          onClick={() => void playTrack(tr, viralHits)}
                          aria-label={`Play ${tr.title}`}
                        >
                          <Artwork src={tr.artwork} alt="" className="track-thumb-img" size={96} />
                          <span className="track-thumb-play">
                            <Play size={16} weight="fill" />
                          </span>
                        </button>
                        <button
                          type="button"
                          className="track-meta"
                          onClick={() => void playTrack(tr, viralHits)}
                        >
                          <span className="track-title">{tr.title}</span>
                          <span className="track-artist">{tr.artist}</span>
                        </button>
                        <TrackContextMenu
                          track={tr}
                          onAddToPlaylist={onAddToPlaylist}
                          onOpenCollection={onOpenCollection}
                          size={32}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Quick Picks Live Track Grid */}
          {quickPicks.length > 0 && (
            <section className="section-block" aria-label="Quick picks">
              <div className="section-head">
                <div>
                  <h2 className="section-title">Quick Picks</h2>
                  <p className="section-sub">Start radio from any song — cover chroma adapts live</p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: 36, padding: "0 14px", fontSize: "0.82rem" }}
                  onClick={() => void playCollectionTracks(quickPicks, false)}
                >
                  <Play size={14} weight="fill" /> Play all
                </button>
              </div>
              <div className="quick-picks-grid">
                {quickPicks.map((track, idx) => (
                  <TrackRow
                    key={track.id}
                    track={track}
                    compact
                    onPlay={() => void playTrack(track, quickPicks, idx)}
                    onAddToPlaylist={onAddToPlaylist}
                    onOpenCollection={onOpenCollection}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Keep Listening (only shown when real history exists) */}
          {recentTracks.length > 0 && (
            <section className="section-block" aria-label="Keep listening">
              <div className="section-head">
                <div>
                  <h2 className="section-title">Keep Listening</h2>
                  <p className="section-sub">Your recent listening sessions saved privately on device</p>
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
                    onOpenCollection={onOpenCollection}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Forgotten Favorites */}
          {forgottenFavorites.length > 0 && (
            <section className="section-block" aria-label="Forgotten favorites">
              <div className="section-head">
                <div>
                  <h2 className="section-title">Forgotten Favorites</h2>
                  <p className="section-sub">Tracks you loved before — worth a revisit</p>
                </div>
              </div>
              <div className="quick-picks-grid">
                {forgottenFavorites.map((track, idx) => (
                  <TrackRow
                    key={`fav-${track.id}`}
                    track={track}
                    compact
                    onPlay={() => void playTrack(track, forgottenFavorites, idx)}
                    onAddToPlaylist={onAddToPlaylist}
                    onOpenCollection={onOpenCollection}
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
              const list = filterVideos(shelf.tracks);
              if (list.length === 0) return null;
              return (
                <section key={shelf.id} className="section-block" aria-label={shelf.title}>
                  <div className="section-head">
                    <h2 className="section-title">{shelf.title}</h2>
                  </div>
                  <div className="tracklist-surface">
                    {list.slice(0, 8).map((tr, idx) => (
                      <TrackRow
                        key={`${shelf.id}-${tr.id}`}
                        track={tr}
                        index={idx}
                        onPlay={() => void playTrack(tr, list, idx)}
                        onAddToPlaylist={onAddToPlaylist}
                        onOpenCollection={onOpenCollection}
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
