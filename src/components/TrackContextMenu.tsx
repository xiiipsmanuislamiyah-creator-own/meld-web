import { useEffect, useRef, useState } from "react";
import {
  Copy,
  Disc,
  DotsThree,
  Heart,
  ListPlus,
  Playlist,
  Queue,
  Radio,
} from "@phosphor-icons/react";
import type { Track } from "../types/music";
import { usePlayer } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { useToast } from "../context/ToastContext";

interface TrackContextMenuProps {
  track: Track;
  onAddToPlaylist?: (track: Track) => void;
  onOpenCollection?: (id: string) => void;
  size?: number;
}

export function TrackContextMenu({
  track,
  onAddToPlaylist,
  onOpenCollection,
  size = 36,
}: TrackContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const { addToQueue, startRadioFromTrack } = usePlayer();
  const { isLiked, toggleLike } = useLibrary();
  const { notify } = useToast();

  useEffect(() => {
    if (!open) return;
    if (wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUpward(spaceBelow < 290 && rect.top > 240);
    }
    const onOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onOutside);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const liked = isLiked(track.id);

  return (
    <div ref={wrapRef} className="track-ctx-wrap">
      <button
        type="button"
        className="icon-btn"
        style={{ width: size, height: size }}
        aria-label={`More actions for ${track.title}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <DotsThree size={20} weight="bold" />
      </button>

      {open && (
        <div
          className={`track-ctx-menu${openUpward ? " open-upward" : ""}`}
          role="menu"
          aria-label={`Actions for ${track.title}`}
        >
          <button
            type="button"
            role="menuitem"
            className="track-ctx-item"
            onClick={() => {
              addToQueue(track, true);
              setOpen(false);
            }}
          >
            <Queue size={16} />
            <span>Play Next</span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="track-ctx-item"
            onClick={() => {
              addToQueue(track, false);
              setOpen(false);
            }}
          >
            <ListPlus size={16} />
            <span>Add to Queue</span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="track-ctx-item"
            onClick={() => {
              setOpen(false);
              void startRadioFromTrack(track);
            }}
          >
            <Radio size={16} />
            <span>Start Radio</span>
          </button>

          <button
            type="button"
            role="menuitem"
            className="track-ctx-item"
            onClick={() => {
              const added = toggleLike(track);
              notify(
                added ? `Saved "${track.title}" to Liked Songs` : `Removed from Liked Songs`,
                "info",
              );
              setOpen(false);
            }}
          >
            <Heart size={16} weight={liked ? "fill" : "regular"} />
            <span>{liked ? "Remove Like" : "Save to Liked"}</span>
          </button>

          {onAddToPlaylist && (
            <button
              type="button"
              role="menuitem"
              className="track-ctx-item"
              onClick={() => {
                setOpen(false);
                onAddToPlaylist(track);
              }}
            >
              <Playlist size={16} />
              <span>Add to Playlist</span>
            </button>
          )}

          {track.albumId && onOpenCollection && (
            <button
              type="button"
              role="menuitem"
              className="track-ctx-item"
              onClick={() => {
                setOpen(false);
                onOpenCollection(track.albumId!);
              }}
            >
              <Disc size={16} />
              <span>Go to Album</span>
            </button>
          )}

          {track.artistId && onOpenCollection && (
            <button
              type="button"
              role="menuitem"
              className="track-ctx-item"
              onClick={() => {
                setOpen(false);
                onOpenCollection(track.artistId!);
              }}
            >
              <Disc size={16} />
              <span>Go to Artist</span>
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            className="track-ctx-item"
            onClick={() => {
              const url = track.videoId
                ? `https://music.youtube.com/watch?v=${track.videoId}`
                : window.location.href;
              navigator.clipboard?.writeText(url).then(() => {
                notify("Track link copied", "success");
              });
              setOpen(false);
            }}
          >
            <Copy size={16} />
            <span>Copy Track Link</span>
          </button>
        </div>
      )}
    </div>
  );
}
