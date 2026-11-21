import { useEffect, useState } from "react";
import {
  Compass,
  Disc,
  Flame,
  Headphones,
  Lightning,
  MusicNotes,
  Play,
  Shuffle,
  Sparkle,
  Trophy,
  Waveform,
  X,
} from "@phosphor-icons/react";
import type { CollectionSummary, SearchFilter, Track } from "../types/music";
import { searchCatalog } from "../lib/api";
import { usePlayer } from "../context/PlayerContext";
import { useSettings } from "../context/SettingsContext";
import { Artwork } from "../components/Artwork";
import { TrackRow } from "../components/TrackRow";
import { CollectionCard } from "../components/CollectionCard";
import { HorizontalRail } from "../components/HorizontalRail";

interface ExploreViewProps {
  onOpenCollection: (id: string) => void;
  onAddToPlaylist: (track: Track) => void;
}

const CHART_TABS: { id: string; label: string; query: string; filter: SearchFilter }[] = [
  { id: "top-songs", label: "Top Songs", query: "top music hits 2026", filter: "songs" },
  { id: "indo-hits", label: "Indonesia Hits", query: "lagu pop indonesia hits terbaru", filter: "songs" },
  { id: "top-videos", label: "Music Videos", query: "official music video trending", filter: "videos" },
  { id: "top-playlists", label: "Top Playlists", query: "top hits chart playlist", filter: "playlists" },
];

interface MoodTile {
  id: string;
  label: string;
  query: string;
  accent: string;
  icon: "music" | "headphones" | "flame" | "lightning" | "waveform" | "sparkles";
}

const MOOD_TILES: MoodTile[] = [
  { id: "pop", label: "Pop Anthems", query: "global pop hits 2026", accent: "#264869", icon: "sparkles" },
  { id: "chill", label: "Chill & Lo-Fi", query: "chill lofi relaxing beats", accent: "#1B6B46", icon: "headphones" },
  { id: "indo", label: "Indo Viral", query: "lagu indonesia viral terbaru", accent: "#9C3F1E", icon: "flame" },
  { id: "workout", label: "Workout Energy", query: "workout hype gym edm hip hop", accent: "#B3261E", icon: "lightning" },
  { id: "focus", label: "Deep Focus", query: "ambient instrumental study focus", accent: "#314C7A", icon: "waveform" },
  { id: "rnb", label: "R&B & Soul", query: "smooth r&b soul hits", accent: "#603D82", icon: "music" },
  { id: "electronic", label: "Electronic", query: "electronic synthwave house hits", accent: "#2B5B6C", icon: "lightning" },
  { id: "acoustic", label: "Acoustic", query: "indie acoustic folk unplugged", accent: "#6E4A22", icon: "music" },
];

function TileIcon({ kind, color }: { kind: MoodTile["icon"]; color: string }) {
  const props = { size: 19, weight: "duotone" as const, style: { color } };
  if (kind === "headphones") return <Headphones {...props} />;
  if (kind === "flame") return <Flame {...props} />;
  if (kind === "lightning") return <Lightning {...props} />;
  if (kind === "waveform") return <Waveform {...props} />;
  if (kind === "sparkles") return <Sparkle {...props} />;
  return <MusicNotes {...props} />;
}

export function ExploreView({ onOpenCollection, onAddToPlaylist }: ExploreViewProps) {
  const [activeChart, setActiveChart] = useState(CHART_TABS[0].id);
  const [activeMood, setActiveMood] = useState<MoodTile | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [newReleases, setNewReleases] = useState<CollectionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const { playTrack, playCollectionTracks } = usePlayer();
  const { settings } = useSettings();

  useEffect(() => {
    const chart = CHART_TABS.find((c) => c.id === activeChart) || CHART_TABS[0];
    const query = activeMood ? activeMood.query : chart.query;
    const filter: SearchFilter = activeMood ? "songs" : chart.filter;
    let cancelled = false;
    setLoading(true);

    searchCatalog(query, filter, settings.region)
      .then((res) => {
        if (cancelled) return;
        const filtered = settings.hideVideoSongs && filter !== "videos"
          ? res.tracks.filter((t) => !t.isVideo)
          : res.tracks;
        setTracks(filtered);
        setCollections(res.collections);
      })
      .catch(() => {
        if (!cancelled) {
          setTracks([]);
          setCollections([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeChart, activeMood, settings.region, settings.hideVideoSongs]);

  useEffect(() => {
    let cancelled = false;
    searchCatalog("new album release 2026", "albums", settings.region)
      .then((res) => {
        if (!cancelled) setNewReleases(res.collections.slice(0, 12));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [settings.region]);

  const podium = tracks.slice(0, 3);
  const restTracks = tracks.slice(3);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 14 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "var(--text-caption)", fontWeight: 700, color: "var(--accent)", marginBottom: 4 }}>
            <Compass size={16} weight="fill" />
            <span>EXPLORE & CHARTS · {settings.region}</span>
          </div>
          <h1 style={{ fontSize: "var(--text-h1)" }}>
            {activeMood ? activeMood.label : "Charts, Moods & New Releases"}
          </h1>
        </div>

        {tracks.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void playCollectionTracks(tracks, false)}
            >
              <Play size={16} weight="fill" /> Play Chart
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void playCollectionTracks(tracks, true)}
            >
              <Shuffle size={16} /> Shuffle
            </button>
          </div>
        )}
      </div>

      {/* Moods & Genres Tiles */}
      <section className="section-block" aria-label="Moods and genres">
        <div className="section-head">
          <h2 className="section-title">Moods & Genres</h2>
          {activeMood && (
            <button
              type="button"
              className="btn btn-ghost"
              style={{ minHeight: 34 }}
              onClick={() => setActiveMood(null)}
            >
              <X size={15} /> Clear mood
            </button>
          )}
        </div>

        <div className="mood-tiles-grid">
          {MOOD_TILES.map((tile) => {
            const selected = activeMood?.id === tile.id;
            return (
              <button
                key={tile.id}
                type="button"
                className={`mood-tile-card${selected ? " is-active" : ""}`}
                style={{ borderLeft: `4px solid ${tile.accent}` }}
                onClick={() => setActiveMood(selected ? null : tile)}
              >
                <TileIcon kind={tile.icon} color={tile.accent} />
                <span>{tile.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Chart Selector Tabs */}
      {!activeMood && (
        <div className="mood-bar" role="tablist" aria-label="Chart categories">
          {CHART_TABS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={activeChart === c.id}
              className={`mood-chip${activeChart === c.id ? " is-active" : ""}`}
              onClick={() => setActiveChart(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="podium-grid">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton-box" style={{ height: 150, borderRadius: "var(--radius-lg)" }} />
            ))}
          </div>
          <div className="skeleton-box" style={{ height: 220, borderRadius: "var(--radius-xl)" }} />
        </div>
      )}

      {/* Top 3 Podium + Ranked List */}
      {!loading && tracks.length > 0 && (
        <>
          <section className="section-block" aria-label="Top 3 chart podium">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Trophy size={19} weight="duotone" style={{ color: "var(--accent)" }} />
              <h2 className="section-title">Top 3 Podium</h2>
            </div>
            <div className="podium-grid">
              {podium.map((tr, idx) => (
                <button
                  key={`pod-${tr.id}`}
                  type="button"
                  className={`podium-card${idx === 0 ? " is-first" : ""}`}
                  onClick={() => void playTrack(tr, tracks, idx)}
                >
                  <div className="podium-rank">#{idx + 1}</div>
                  <Artwork src={tr.artwork} alt={`${tr.title} cover`} className="podium-art" size={200} />
                  <div style={{ minWidth: 0, textAlign: "left", flex: 1 }}>
                    <div className="track-title" style={{ fontSize: "1rem" }}>{tr.title}</div>
                    <div className="track-artist">{tr.artist}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--accent)", marginTop: 4 }}>
                      {tr.durationText}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {restTracks.length > 0 && (
            <section className="section-block" aria-label="Chart rankings">
              <div className="tracklist-surface">
                {restTracks.map((tr, idx) => (
                  <TrackRow
                    key={`rank-${tr.id}`}
                    track={tr}
                    index={idx + 3}
                    onPlay={() => void playTrack(tr, tracks, idx + 3)}
                    onAddToPlaylist={onAddToPlaylist}
                    onOpenCollection={onOpenCollection}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Playlists Grid when Top Playlists tab is active */}
      {!loading && collections.length > 0 && tracks.length === 0 && (
        <div className="cards-grid">
          {collections.map((col) => (
            <CollectionCard
              key={col.id}
              collection={col}
              onOpen={(c) => onOpenCollection(c.id)}
            />
          ))}
        </div>
      )}

      {!loading && tracks.length === 0 && collections.length === 0 && (
        <div className="state-panel">
          <Disc size={32} weight="duotone" style={{ color: "var(--ink-muted)" }} />
          <h3>No chart items available right now</h3>
          <p style={{ color: "var(--ink-muted)" }}>Try picking another chart tab or mood tile above.</p>
        </div>
      )}

      {/* New Releases Carousel */}
      {newReleases.length > 0 && (
        <HorizontalRail title="New Releases">
          {newReleases.map((col) => (
            <CollectionCard
              key={`rel-${col.id}`}
              collection={col}
              onOpen={(c) => onOpenCollection(c.id)}
            />
          ))}
        </HorizontalRail>
      )}
    </div>
  );
}
