import { Heart, Pause, Play, Playlist, Queue } from "@phosphor-icons/react";
import type { Track } from "../types/music";
import { usePlayer } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { useToast } from "../context/ToastContext";
import { Artwork } from "./Artwork";
import { EqualizerBars } from "./EqualizerBars";

interface TrackRowProps {
  track: Track;
  index?: number;
  compact?: boolean;
  onPlay: () => void;
  onAddToPlaylist?: (track: Track) => void;
}

export function TrackRow({
  track,
  index,
  compact = false,
  onPlay,
  onAddToPlaylist,
}: TrackRowProps) {
  const { currentTrack, playbackState, togglePlayPause, addToQueue } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const { notify } = useToast();

  const isCurrent =
    currentTrack?.id === track.id ||
    (Boolean(track.videoId) && currentTrack?.videoId === track.videoId);
  const isPlayingNow = isCurrent && playbackState === "playing";
  const liked = isLiked(track.id);

  const handleRowPlay = () => {
    if (isCurrent) {
      togglePlayPause();
    } else {
      onPlay();
    }
  };

  return (
    <div className={`track-row${compact ? " compact" : ""}${isCurrent ? " is-playing" : ""}`}>
      {!compact && (
        <div className="track-num">
          {isCurrent ? (
            <EqualizerBars paused={!isPlayingNow} />
          ) : (
            <span>{String((index ?? 0) + 1).padStart(2, "0")}</span>
          )}
        </div>
      )}

      <button
        type="button"
        className="track-thumb-btn"
        onClick={handleRowPlay}
        aria-label={isPlayingNow ? `Pause ${track.title}` : `Play ${track.title}`}
      >
        <Artwork src={track.artwork} alt={`${track.title} cover`} className="track-thumb-img" size={92} />
        <span className="track-thumb-play">
          {isPlayingNow ? <Pause size={18} weight="fill" /> : <Play size={18} weight="fill" />}
        </span>
      </button>

      <button type="button" className="track-meta" onClick={handleRowPlay}>
        <span className="track-title">{track.title}</span>
        <span className="track-artist">
          {track.artist}
          {track.album && !compact ? ` — ${track.album}` : ""}
        </span>
      </button>

      <div className="track-actions">
        <button
          type="button"
          className={`icon-btn${liked ? " is-active" : ""}`}
          style={{ width: 38, height: 38 }}
          aria-label={liked ? `Remove ${track.title} from Liked Songs` : `Like ${track.title}`}
          onClick={() => {
            const added = toggleLike(track);
            notify(added ? `Saved "${track.title}" to Liked Songs` : `Removed "${track.title}" from Liked Songs`, "info");
          }}
        >
          <Heart size={18} weight={liked ? "fill" : "regular"} />
        </button>

        {!compact && (
          <button
            type="button"
            className="icon-btn track-action-desktop"
            style={{ width: 38, height: 38 }}
            aria-label={`Add ${track.title} to queue`}
            onClick={() => addToQueue(track, true)}
            title="Play Next"
          >
            <Queue size={18} />
          </button>
        )}

        {onAddToPlaylist && (
          <button
            type="button"
            className="icon-btn track-action-desktop"
            style={{ width: 38, height: 38 }}
            aria-label={`Add ${track.title} to a playlist`}
            onClick={() => onAddToPlaylist(track)}
            title="Add to Playlist"
          >
            <Playlist size={18} />
          </button>
        )}

        <span className="track-duration">{track.durationText}</span>
      </div>
    </div>
  );
}
