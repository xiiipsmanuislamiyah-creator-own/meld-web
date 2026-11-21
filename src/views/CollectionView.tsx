import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BookmarkSimple,
  DownloadSimple,
  FileCsv,
  MagnifyingGlass,
  Play,
  Plus,
  Radio,
  ShareNetwork,
  Shuffle,
  Tag,
  Trash,
  X,
} from "@phosphor-icons/react";
import type { CollectionDetail, Track } from "../types/music";
import { fetchCollectionDetail } from "../lib/api";
import { exportPlaylistAsCSV, exportPlaylistAsM3U } from "../lib/storage";
import { usePlayer } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { useTheme } from "../context/ThemeContext";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { Artwork } from "../components/Artwork";
import { CollectionCard } from "../components/CollectionCard";
import { HorizontalRail } from "../components/HorizontalRail";
import { TrackRow } from "../components/TrackRow";

interface CollectionViewProps {
  collectionId: string;
  onBack: () => void;
  onOpenCollection: (id: string) => void;
  onAddToPlaylist: (track: Track) => void;
}

export function CollectionView({
  collectionId,
  onBack,
  onOpenCollection,
  onAddToPlaylist,
}: CollectionViewProps) {
  const [remoteDetail, setRemoteDetail] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackFilter, setTrackFilter] = useState("");
  const [newTag, setNewTag] = useState("");

  const { currentTrack, playTrack, playCollectionTracks, startRadioFromTrack } = usePlayer();
  const {
    likedTracks,
    getLocalPlaylistById,
    isCollectionSaved,
    toggleSaveCollection,
    updatePlaylistTags,
    deletePlaylist,
  } = useLibrary();
  const { syncArtworkPalette } = useTheme();
  const { settings } = useSettings();
  const { notify } = useToast();

  const isLikedView = collectionId === "liked";
  const localPlaylist = getLocalPlaylistById(collectionId);
  const isLocal = isLikedView || Boolean(localPlaylist);

  useEffect(() => {
    setTrackFilter("");
    if (isLocal) {
      setRemoteDetail(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCollectionDetail(collectionId, settings.region)
      .then((d) => {
        if (!cancelled) setRemoteDetail(d);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load collection.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [collectionId, isLocal, settings.region]);

  const detail: CollectionDetail | null = isLikedView
    ? {
        id: "liked",
        title: "Liked Songs",
        artist: "Your Local Library",
        subtitle: `Saved locally — ${likedTracks.length} songs`,
        type: "playlist",
        artwork: likedTracks[0]?.artwork || "",
        trackCount: likedTracks.length,
        tracks: likedTracks,
        source: "local",
      }
    : localPlaylist || remoteDetail;

  useEffect(() => {
    if (!currentTrack && detail?.artwork) {
      syncArtworkPalette(detail.artwork);
    }
  }, [currentTrack, detail?.artwork, syncArtworkPalette]);

  const totalMinutes = useMemo(() => {
    if (!detail?.tracks.length) return 0;
    const totalSec = detail.tracks.reduce((sum, t) => sum + (t.durationSec || 0), 0);
    return Math.max(1, Math.round(totalSec / 60));
  }, [detail]);

  const filteredTracks = useMemo(() => {
    if (!detail?.tracks) return [];
    const q = trackFilter.trim().toLowerCase();
    if (!q) return detail.tracks;
    return detail.tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.artist.toLowerCase().includes(q),
    );
  }, [detail?.tracks, trackFilter]);

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className="skeleton-box" style={{ height: 240, borderRadius: "var(--radius-xl)" }} />
        <div className="skeleton-box" style={{ height: 320, borderRadius: "var(--radius-xl)" }} />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="state-panel" role="alert">
        <h3>Collection unavailable</h3>
        <p style={{ color: "var(--ink-muted)" }}>{error || "This album, artist, or playlist could not be found."}</p>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={17} /> Back
        </button>
      </div>
    );
  }

  const saved = isCollectionSaved(detail.id);
  const canDelete = Boolean(localPlaylist);

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localPlaylist || !newTag.trim()) return;
    const next = [...(localPlaylist.tags || []), newTag.trim()];
    updatePlaylistTags(localPlaylist.id, next);
    setNewTag("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={17} /> Back
        </button>
      </div>

      {/* Header */}
      <header className="collection-header">
        <div
          className="collection-header-art"
          style={detail.type === "artist" ? { borderRadius: "var(--radius-pill)" } : undefined}
        >
          <Artwork src={detail.artwork} alt={`${detail.title} artwork`} priority size={544} />
        </div>

        <div className="collection-header-meta">
          <span className="collection-meta-line">
            {detail.source === "spotify"
              ? "Spotify Import"
              : detail.type === "artist"
                ? "Artist"
                : detail.type === "album"
                  ? "Album"
                  : "Playlist"}{" "}
            — {detail.tracks.length} {detail.tracks.length === 1 ? "song" : "songs"}
            {totalMinutes > 0 ? ` · ${totalMinutes} min` : ""}
            {detail.year ? ` · ${detail.year}` : ""}
          </span>

          <h1 className="collection-header-title">{detail.title}</h1>
          <div className="collection-header-artist">{detail.artist}</div>

          {detail.description && (
            <p style={{ fontSize: "var(--text-body-sm)", color: "var(--ink-muted)", maxWidth: "58ch" }}>
              {detail.description}
            </p>
          )}

          {/* Custom Tags for Local Playlists */}
          {localPlaylist && (
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 2 }}>
              {(localPlaylist.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="recent-search-pill"
                  style={{ minHeight: 28, fontSize: "0.76rem", padding: "0 8px" }}
                >
                  <Tag size={12} /> #{tag}
                  <button
                    type="button"
                    className="recent-search-remove"
                    onClick={() =>
                      updatePlaylistTags(
                        localPlaylist.id,
                        (localPlaylist.tags || []).filter((t) => t !== tag),
                      )
                    }
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
              <form onSubmit={handleAddTag} style={{ display: "inline-flex", gap: 4 }}>
                <input
                  type="text"
                  className="field-input"
                  style={{ width: 110, minHeight: 28, fontSize: "0.76rem", padding: "0 8px", borderRadius: "var(--radius-pill)" }}
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add tag..."
                  aria-label="Add playlist tag"
                />
                {newTag.trim() && (
                  <button
                    type="submit"
                    className="icon-btn icon-btn-surface"
                    style={{ width: 28, height: 28 }}
                    aria-label="Save tag"
                  >
                    <Plus size={13} />
                  </button>
                )}
              </form>
            </div>
          )}

          <div className="collection-header-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={detail.tracks.length === 0}
              onClick={() => void playCollectionTracks(detail.tracks, false)}
            >
              <Play size={17} weight="fill" /> Play
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              disabled={detail.tracks.length === 0}
              onClick={() => void playCollectionTracks(detail.tracks, true)}
            >
              <Shuffle size={17} /> Shuffle
            </button>

            {detail.tracks[0] && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void startRadioFromTrack(detail.tracks[0])}
              >
                <Radio size={17} /> Radio
              </button>
            )}

            {!isLocal && (
              <button
                type="button"
                className={`icon-btn icon-btn-surface${saved ? " is-active" : ""}`}
                aria-label={saved ? "Remove from saved library" : "Save collection to library"}
                onClick={() => {
                  const added = toggleSaveCollection({
                    id: detail.id,
                    title: detail.title,
                    subtitle: detail.artist,
                    type: detail.type,
                    artwork: detail.artwork,
                    year: detail.year,
                    trackCount: detail.tracks.length,
                    source: detail.source,
                  });
                  notify(added ? `Saved "${detail.title}" to Library` : `Removed from Library`, "info");
                }}
              >
                <BookmarkSimple size={19} weight={saved ? "fill" : "regular"} />
              </button>
            )}

            <button
              type="button"
              className="icon-btn icon-btn-surface"
              disabled={detail.tracks.length === 0}
              aria-label="Export playlist as M3U"
              title="Export M3U"
              onClick={() => {
                exportPlaylistAsM3U(detail.title, detail.tracks);
                notify(`Exported "${detail.title}.m3u"`, "success");
              }}
            >
              <DownloadSimple size={19} />
            </button>

            <button
              type="button"
              className="icon-btn icon-btn-surface"
              disabled={detail.tracks.length === 0}
              aria-label="Export playlist as CSV"
              title="Export CSV"
              onClick={() => {
                exportPlaylistAsCSV(detail.title, detail.tracks);
                notify(`Exported "${detail.title}.csv"`, "success");
              }}
            >
              <FileCsv size={19} />
            </button>

            <button
              type="button"
              className="icon-btn icon-btn-surface"
              aria-label="Copy link"
              title="Share"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href).then(() => {
                  notify("Collection link copied", "success");
                });
              }}
            >
              <ShareNetwork size={19} />
            </button>

            {canDelete && (
              <button
                type="button"
                className="icon-btn icon-btn-surface"
                style={{ color: "var(--status-error)" }}
                aria-label={`Delete playlist ${detail.title}`}
                title="Delete playlist"
                onClick={() => {
                  deletePlaylist(detail.id);
                  notify(`Deleted "${detail.title}"`, "info");
                  onBack();
                }}
              >
                <Trash size={19} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Track filter inside large collections */}
      {detail.tracks.length >= 6 && (
        <div style={{ position: "relative", maxWidth: 380 }}>
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
            value={trackFilter}
            onChange={(e) => setTrackFilter(e.target.value)}
            placeholder="Search tracks inside this collection..."
            aria-label="Filter tracks in collection"
          />
        </div>
      )}

      {/* Numbered Tracklist */}
      {filteredTracks.length > 0 ? (
        <div className="tracklist-surface">
          {filteredTracks.map((tr, idx) => (
            <TrackRow
              key={`${tr.id}-${idx}`}
              track={tr}
              index={idx}
              onPlay={() => void playTrack(tr, filteredTracks, idx)}
              onAddToPlaylist={onAddToPlaylist}
              onOpenCollection={onOpenCollection}
            />
          ))}
        </div>
      ) : (
        <div className="state-panel">
          <h3>{trackFilter ? `No tracks matching "${trackFilter}"` : "No tracks in this collection yet"}</h3>
          <p style={{ color: "var(--ink-muted)" }}>
            {trackFilter
              ? "Try clearing the filter input above."
              : "Heart any song or add tracks from search to populate this list."}
          </p>
        </div>
      )}

      {/* Artist Discography Rail (when viewing Artist page) */}
      {detail.collections && detail.collections.length > 0 && (
        <HorizontalRail title="Albums & Releases">
          {detail.collections.map((col) => (
            <CollectionCard
              key={`discog-${col.id}`}
              collection={col}
              onOpen={(c) => onOpenCollection(c.id)}
            />
          ))}
        </HorizontalRail>
      )}
    </div>
  );
}
