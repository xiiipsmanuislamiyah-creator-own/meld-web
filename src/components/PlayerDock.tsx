import {
  ArrowsOutSimple,
  CircleNotch,
  Heart,
  MicrophoneStage,
  Pause,
  Play,
  Queue,
  Repeat,
  RepeatOnce,
  Shuffle,
  SkipBack,
  SkipForward,
  SpeakerHigh,
  SpeakerSlash,
} from "@phosphor-icons/react";
import { usePlayer } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { useToast } from "../context/ToastContext";
import { Artwork } from "./Artwork";
import { WaveformScrubber } from "./WaveformScrubber";

export function PlayerDock() {
  const {
    currentTrack,
    playbackState,
    currentTime,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    drawerOpen,
    drawerTab,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    setNowPlayingOpen,
    setDrawerOpen,
    setDrawerTab,
  } = usePlayer();

  const { isLiked, toggleLike } = useLibrary();
  const { notify } = useToast();

  if (!currentTrack) return null;

  const isPlaying = playbackState === "playing";
  const isBuffering = playbackState === "buffering";
  const liked = isLiked(currentTrack.id);

  return (
    <div className="player-dock-shell" role="region" aria-label="Now playing mini player">
      <div className="player-dock">
        {/* Left: Artwork + Title/Artist -> Opens Full-Screen Now Playing */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <button
            type="button"
            className="dock-track"
            onClick={() => setNowPlayingOpen(true)}
            aria-label={`Open full player for ${currentTrack.title}`}
            style={{ flex: 1 }}
          >
            <Artwork
              src={currentTrack.artwork}
              alt={`${currentTrack.title} cover`}
              className="dock-art"
              size={104}
            />
            <div style={{ minWidth: 0 }}>
              <div className="dock-title">{currentTrack.title}</div>
              <div className="dock-artist">{currentTrack.artist}</div>
            </div>
          </button>

          <button
            type="button"
            className={`dock-btn${liked ? " is-active" : ""}`}
            aria-label={liked ? "Unlike current song" : "Like current song"}
            onClick={() => {
              const added = toggleLike(currentTrack);
              notify(added ? `Saved "${currentTrack.title}" to Liked Songs` : `Removed from Liked Songs`, "info");
            }}
          >
            <Heart size={19} weight={liked ? "fill" : "regular"} />
          </button>
        </div>

        {/* Center (Desktop): Transport + Compact Waveform Scrubber */}
        <div className="dock-center">
          <div className="dock-controls">
            <button
              type="button"
              className={`dock-btn${shuffle ? " is-active" : ""}`}
              onClick={toggleShuffle}
              aria-label={shuffle ? "Disable shuffle" : "Enable shuffle"}
              aria-pressed={shuffle}
            >
              <Shuffle size={18} weight={shuffle ? "bold" : "regular"} />
            </button>

            <button
              type="button"
              className="dock-btn"
              onClick={() => void prevTrack()}
              aria-label="Previous track"
            >
              <SkipBack size={19} weight="fill" />
            </button>

            <button
              type="button"
              className="dock-play-btn"
              onClick={togglePlayPause}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isBuffering ? (
                <CircleNotch size={20} weight="bold" style={{ animation: "spin 0.8s linear infinite" }} />
              ) : isPlaying ? (
                <Pause size={20} weight="fill" />
              ) : (
                <Play size={20} weight="fill" style={{ marginLeft: 2 }} />
              )}
            </button>

            <button
              type="button"
              className="dock-btn"
              onClick={() => void nextTrack()}
              aria-label="Next track"
            >
              <SkipForward size={19} weight="fill" />
            </button>

            <button
              type="button"
              className={`dock-btn${repeat !== "off" ? " is-active" : ""}`}
              onClick={cycleRepeat}
              aria-label={`Repeat mode: ${repeat}`}
            >
              {repeat === "one" ? (
                <RepeatOnce size={18} weight="bold" />
              ) : (
                <Repeat size={18} weight={repeat === "all" ? "bold" : "regular"} />
              )}
            </button>
          </div>

          <WaveformScrubber
            trackId={currentTrack.id}
            currentTime={currentTime}
            duration={duration || currentTrack.durationSec}
            onSeek={seekTo}
            variant="dock"
            barCount={48}
          />
        </div>

        {/* Right: Mobile Play Button + Desktop Drawer & Volume Controls */}
        <div className="dock-right">
          <button
            type="button"
            className={`dock-btn dock-desktop-only${drawerOpen && drawerTab === "lyrics" ? " is-active" : ""}`}
            aria-label="Toggle synced lyrics panel"
            onClick={() => {
              if (drawerOpen && drawerTab === "lyrics") setDrawerOpen(false);
              else {
                setDrawerTab("lyrics");
                setDrawerOpen(true);
              }
            }}
          >
            <MicrophoneStage size={18} weight={drawerOpen && drawerTab === "lyrics" ? "fill" : "regular"} />
          </button>

          <button
            type="button"
            className={`dock-btn dock-desktop-only${drawerOpen && drawerTab === "queue" ? " is-active" : ""}`}
            aria-label="Toggle up next queue panel"
            onClick={() => {
              if (drawerOpen && drawerTab === "queue") setDrawerOpen(false);
              else {
                setDrawerTab("queue");
                setDrawerOpen(true);
              }
            }}
          >
            <Queue size={18} weight={drawerOpen && drawerTab === "queue" ? "fill" : "regular"} />
          </button>

          <button
            type="button"
            className="dock-btn dock-desktop-only"
            onClick={toggleMute}
            aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
          >
            {muted || volume === 0 ? <SpeakerSlash size={18} /> : <SpeakerHigh size={18} />}
          </button>

          <input
            type="range"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            aria-label="Playback volume"
            className="volume-slider dock-desktop-only"
          />

          <button
            type="button"
            className="dock-btn dock-desktop-only"
            onClick={() => setNowPlayingOpen(true)}
            aria-label="Expand full screen player"
          >
            <ArrowsOutSimple size={18} />
          </button>

          {/* Mobile compact play button on the right of the floating dark dock (matches reference!) */}
          <button
            type="button"
            className="dock-play-btn mobile-only-play"
            onClick={togglePlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            style={{ width: 42, height: 42 }}
          >
            {isBuffering ? (
              <CircleNotch size={19} weight="bold" style={{ animation: "spin 0.8s linear infinite" }} />
            ) : isPlaying ? (
              <Pause size={19} weight="fill" />
            ) : (
              <Play size={19} weight="fill" style={{ marginLeft: 2 }} />
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (min-width: 861px) {
          .mobile-only-play { display: none !important; }
        }
      `}</style>
    </div>
  );
}
