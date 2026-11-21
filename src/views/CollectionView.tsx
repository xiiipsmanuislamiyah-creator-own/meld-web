import { useEffect, useState } from "react";
import {
  ArrowLeft,
  BookmarkSimple,
  DownloadSimple,
  FileCsv,
  Play,
  ShareNetwork,
  Shuffle,
  Trash,
} from "@phosphor-icons/react";
import type { CollectionDetail, Track } from "../types/music";
import { fetchCollectionDetail } from "../lib/api";
import { exportPlaylistAsCSV, exportPlaylistAsM3U } from "../lib/storage";
import { usePlayer } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { Artwork } from "../components/Artwork";
import { TrackRow } from "../components/TrackRow";

interface CollectionViewProps {
  collectionId: string;
  onBack: () => void;
  onAddToPlaylist: (track: Track) => void;
}

export function CollectionView({
  collectionId,
  onBack,
  onAddToPlaylist,
}: CollectionViewProps) {
  const [remoteDetail, setRemoteDetail] = useState<CollectionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { currentTrack, playTrack, playCollectionTracks } = usePlayer();
  const {
    likedTracks,
    getLocalPlaylistById,
    isCollectionSaved,
    toggleSaveCollection,
    deletePlaylist,
  } = useLibrary();
  const { syncArtworkPalette } = useTheme();
  const { notify } = useToast();

  const isLikedView = collectionId === "liked";
  const localPlaylist = getLocalPlaylistById(collectionId);
  const isLocal = isLikedView || Boolean(localPlaylist);

  useEffect(() => {
    if (isLocal) {
      setRemoteDetail(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCollectionDetail(collectionId)
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
  }, [collectionId, isLocal]);

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

  // Harmonize canvas color gently with viewed collection when no track is playing yet
  useEffect(() => {
    if (!currentTrack && detail?.artwork) {
      syncArtworkPalette(detail.artwork);
    }
  }, [currentTrack, detail?.artwork, syncArtworkPalette]);

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
        <p style={{ color: "var(--ink-muted)" }}>{error || "This album or playlist could not be found."}</p>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={17} /> Back
        </button>
      </div>
    );
  }

  const saved = isCollectionSaved(detail.id);
  const canDelete = Boolean(localPlaylist);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={17} /> Back
        </button>
      </div>

      {/* Album / Playlist Header (Brambles / Charcoal Reference Layout) */}
      <header className="collection-header">
        <div className="collection-header-art">
          <Artwork src={detail.artwork} alt={`${detail.title} artwork`} priority size={544} />
        </div>

        <div className="collection-header-meta">
          <span className="collection-meta-line">
            {detail.source === "spotify"
              ? "Spotify Import"
              : detail.type === "album"
                ? "Album"
                : "Playlist"}{" "}
            — {detail.tracks.length} {detail.tracks.length === 1 ? "song" : "songs"}
            {detail.year ? ` — ${detail.year}` : ""}
          </span>

          <h1 className="collection-header-title">{detail.title}</h1>
          <div className="collection-header-artist">{detail.artist}</div>

          {detail.description && (
            <p style={{ fontSize: "var(--text-body-sm)", color: "var(--ink-muted)", maxWidth: "58ch" }}>
              {detail.description}
            </p>
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

      {/* Editorial Numbered Tracklist */}
      {detail.tracks.length > 0 ? (
        <div className="tracklist-surface">
          {detail.tracks.map((tr, idx) => (
            <TrackRow
              key={`${tr.id}-${idx}`}
              track={tr}
              index={idx}
              onPlay={() => void playTrack(tr, detail.tracks, idx)}
              onAddToPlaylist={onAddToPlaylist}
            />
          ))}
        </div>
      ) : (
        <div className="state-panel">
          <h3>No tracks in this collection yet</h3>
          <p style={{ color: "var(--ink-muted)" }}>
            Heart any song or add tracks from search to populate this list.
          </p>
        </div>
      )}
    </div>
  );
}
