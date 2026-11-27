import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  CaretDown,
  CircleNotch,
  FilmStrip,
  Gauge,
  Heart,
  List,
  Pause,
  Play,
  Playlist,
  Radio,
  Repeat,
  RepeatOnce,
  ShareNetwork,
  Shuffle,
  SkipBack,
  SkipForward,
} from "@phosphor-icons/react";
import type { Track } from "../types/music";
import { usePlayer } from "../context/PlayerContext";
import { useLibrary } from "../context/LibraryContext";
import { useSettings } from "../context/SettingsContext";
import { useToast } from "../context/ToastContext";
import { Artwork } from "./Artwork";
import { WaveformScrubber } from "./WaveformScrubber";
import { NowPlayingLyrics } from "./NowPlayingLyrics";
import { LyricsShareModal } from "./LyricsShareModal";
import { QuickSettingsModal } from "./QuickSettingsModal";
import { SpeedPitchModal } from "./SpeedPitchModal";

interface NowPlayingOverlayProps {
  onAddToPlaylist: (track: Track) => void;
  onOpenFullSettings?: () => void;
}

export function NowPlayingOverlay({
  onAddToPlaylist,
  onOpenFullSettings,
}: NowPlayingOverlayProps) {
  const {
    currentTrack,
    playbackState,
    currentTime,
    duration,
    shuffle,
    repeat,
    playbackRate,
    pitchSemitones,
    effectivePlaybackRate,
    eq,
    lyrics,
    lyricsLoading,
    nowPlayingOpen,
    setNowPlayingOpen,
    togglePlayPause,
    nextTrack,
    prevTrack,
    seekTo,
    toggleShuffle,
    cycleRepeat,
    startRadioFromTrack,
  } = usePlayer();

  const { isLiked, toggleLike } = useLibrary();
  const { settings, updateSettings } = useSettings();
  const { notify } = useToast();

  const [mobileView, setMobileView] = useState<"playing" | "lyrics">("playing");
  const [quickSettingsOpen, setQuickSettingsOpen] = useState(false);
  const [shareLyricsOpen, setShareLyricsOpen] = useState(false);
  const [speedPitchOpen, setSpeedPitchOpen] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!nowPlayingOpen) return;
    const onKey = (e: KeyboardEvent) => {
      // Do not dismiss Now Playing when a child dialog is open on top
      if (e.key === "Escape" && !quickSettingsOpen && !shareLyricsOpen && !speedPitchOpen) {
        setNowPlayingOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nowPlayingOpen, quickSettingsOpen, shareLyricsOpen, speedPitchOpen, setNowPlayingOpen]);

  const isPlaying = playbackState === "playing";
  const isBuffering = playbackState === "buffering";
  const liked = currentTrack ? isLiked(currentTrack.id) : false;
  const skipSec = settings.skipSeconds || 10;

  const handleShare = () => {
    if (!currentTrack) return;
    const shareUrl = currentTrack.videoId
      ? `https://music.youtube.com/watch?v=${currentTrack.videoId}`
      : window.location.href;
    navigator.clipboard?.writeText(shareUrl).then(() => {
      notify("Tautan lagu disalin ke clipboard", "success");
    });
  };

  const handleSwipeStart = (e: React.TouchEvent) => {
    if (!settings.swipeToChangeTrack) return;
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleSwipeEnd = (e: React.TouchEvent) => {
    if (!settings.swipeToChangeTrack || touchStartX.current === null) return;
    const endX = e.changedTouches[0]?.clientX ?? 0;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 60) return;
    if (delta < 0) void nextTrack();
    else void prevTrack();
  };

  const lyricLinesForShare = useMemo(() => {
    if (!lyrics?.found) return [];
    if (lyrics.synced && lyrics.lines && lyrics.lines.length > 0) {
      return lyrics.lines.map((l) => l.text);
    }
    if (lyrics.plainText) {
      return lyrics.plainText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
    }
    return [];
  }, [lyrics]);

  const currentLyricIndex = useMemo(() => {
    if (!lyrics?.synced || !lyrics.lines || lyrics.lines.length === 0) return 0;
    const offsetSeconds = settings.lyricsOffsetMs / 1000;
    const eff = currentTime + offsetSeconds;
    return lyrics.lines.reduce((acc, line, idx) => (line.time <= eff + 0.2 ? idx : acc), 0);
  }, [lyrics, currentTime, settings.lyricsOffsetMs]);

  const hasDspModification =
    Math.abs(playbackRate - 1) > 0.01 || Math.abs(pitchSemitones) > 0.01 || eq.enabled;

  const handleCopyLyrics = () => {
    const text = lyrics?.plainText || lyrics?.lines?.map((l) => l.text).join("\n");
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      notify("Lirik disalin ke clipboard", "success");
    });
  };

  const shiftLyricsOffset = (deltaMs: number) => {
    const next = Math.max(-2000, Math.min(2000, settings.lyricsOffsetMs + deltaMs));
    updateSettings({ lyricsOffsetMs: next });
  };

  if (!nowPlayingOpen || !currentTrack) return null;

  return (
    <div
      className="now-playing-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Now Playing: ${currentTrack.title}`}
    >
      {/* Top Header Strip */}
      <div className="np-topbar">
        <button
          type="button"
          className="icon-btn icon-btn-surface"
          onClick={() => setNowPlayingOpen(false)}
          aria-label="Tutup now playing"
          title="Tutup"
        >
          <CaretDown size={20} weight="bold" />
        </button>

        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: "0.96rem",
            color: "var(--ink)",
          }}
        >
          Now Playing
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            className="icon-btn icon-btn-surface np-hide-xs"
            onClick={handleShare}
            aria-label="Share track link"
            title="Bagikan Lagu"
          >
            <ShareNetwork size={18} />
          </button>

          {/* 3-Lines (≡) Button opening Unified Settings (Controls, Queue, Palette, Volume) */}
          <button
            type="button"
            className={`icon-btn icon-btn-surface${quickSettingsOpen ? " is-active" : ""}`}
            onClick={() => setQuickSettingsOpen(true)}
            aria-label="Buka Pengaturan & Kontrol (≡)"
            title="Pengaturan & Kontrol (≡)"
          >
            <List size={20} weight="bold" />
          </button>
        </div>
      </div>

      {/* Mobile 2-Segment Switcher: Lagu (Playing) | Lirik (Lyrics) - NO Queue here! */}
      <div className="np-mobile-tabs" role="tablist" aria-label="Tampilan pemutar">
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === "playing"}
          className={`drawer-tab${mobileView === "playing" ? " is-active" : ""}`}
          onClick={() => setMobileView("playing")}
        >
          Lagu
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === "lyrics"}
          className={`drawer-tab${mobileView === "lyrics" ? " is-active" : ""}`}
          onClick={() => setMobileView("lyrics")}
        >
          Lirik
        </button>
      </div>

      {/* Main Stage: Deck (Left) & Full Lyrics (Right on Desktop, or Toggled on Mobile) */}
      <div className={`np-stage${mobileView === "lyrics" ? " show-lyrics" : ""}`}>
        {/* Left: Tactile Player Deck */}
        <div className="np-deck">
          <div
            className={`np-cover${isPlaying ? " is-playing" : " is-paused"}`}
            onTouchStart={handleSwipeStart}
            onTouchEnd={handleSwipeEnd}
          >
            <Artwork
              src={currentTrack.artwork}
              alt={`${currentTrack.title} album art`}
              priority
              size={544}
            />
          </div>

          <div className="np-info-row">
            <button
              type="button"
              className={`icon-btn${liked ? " is-active" : ""}`}
              onClick={() => {
                const added = toggleLike(currentTrack);
                notify(
                  added ? `Disimpan ke Lagu Disukai` : `Dihapus dari Lagu Disukai`,
                  "info",
                );
              }}
              aria-label={liked ? "Unlike track" : "Like track"}
            >
              <Heart size={22} weight={liked ? "fill" : "regular"} />
            </button>

            <div className="np-info-center">
              <h2 className="np-track-title">{currentTrack.title}</h2>
              <p className="np-track-artist">{currentTrack.artist}</p>
            </div>

            <button
              type="button"
              className="icon-btn"
              onClick={() => onAddToPlaylist(currentTrack)}
              aria-label="Add track to playlist"
              title="Tambah ke Playlist"
            >
              <Playlist size={22} />
            </button>
          </div>

          <WaveformScrubber
            trackId={currentTrack.id}
            currentTime={currentTime}
            duration={duration || currentTrack.durationSec}
            onSeek={seekTo}
            variant="hero"
            barCount={56}
            isPlaying={isPlaying}
          />

          {/* Main 5-Button Transport Deck: Perfectly Balanced, Symmetrical, Never Squeezed */}
          <div className="np-transport">
            <button
              type="button"
              className={`icon-btn icon-btn-transport${shuffle ? " is-active" : ""}`}
              onClick={toggleShuffle}
              aria-label="Acak lagu"
              aria-pressed={shuffle}
            >
              <Shuffle size={22} weight={shuffle ? "bold" : "regular"} />
            </button>

            <button
              type="button"
              className="icon-btn icon-btn-transport"
              onClick={() => void prevTrack()}
              aria-label="Lagu sebelumnya"
            >
              <SkipBack size={26} weight="fill" />
            </button>

            <button
              type="button"
              className="np-play-hero"
              onClick={togglePlayPause}
              aria-label={isPlaying ? "Jeda pemutaran" : "Lanjutkan pemutaran"}
            >
              {isBuffering ? (
                <CircleNotch size={32} weight="bold" style={{ animation: "spin 0.8s linear infinite" }} />
              ) : isPlaying ? (
                <Pause size={30} weight="fill" />
              ) : (
                <Play size={30} weight="fill" style={{ marginLeft: 3 }} />
              )}
            </button>

            <button
              type="button"
              className="icon-btn icon-btn-transport"
              onClick={() => void nextTrack()}
              aria-label="Lagu selanjutnya"
            >
              <SkipForward size={26} weight="fill" />
            </button>

            <button
              type="button"
              className={`icon-btn icon-btn-transport${repeat !== "off" ? " is-active" : ""}`}
              onClick={cycleRepeat}
              aria-label={`Mode ulang: ${repeat}`}
            >
              {repeat === "one" ? (
                <RepeatOnce size={22} weight="bold" />
              ) : (
                <Repeat size={22} weight={repeat === "all" ? "bold" : "regular"} />
              )}
            </button>
          </div>

          {/* Secondary Utility Actions (Speed & Pitch, Lyrics Video Studio, Seek & Radio) */}
          <div className="np-secondary-actions">
            <button
              type="button"
              className="np-action-pill"
              onClick={() => seekTo(Math.max(0, currentTime - skipSec))}
              aria-label={`Mundur ${skipSec} detik`}
              title={`-${skipSec}s`}
            >
              <ArrowCounterClockwise size={14} weight="bold" />
              <span>-{skipSec}s</span>
            </button>

            <button
              type="button"
              className={`np-action-pill${hasDspModification ? " is-active" : ""}`}
              onClick={() => setSpeedPitchOpen(true)}
              title="Kontrol Kecepatan, Nada & Equalizer"
              aria-label="Buka Kontrol Kecepatan, Nada dan Equalizer"
            >
              <Gauge size={14} weight="bold" />
              <span>
                {playbackRate.toFixed(2).replace(/\.00$/, "")}x
                {pitchSemitones !== 0 ? ` · ${pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones}st` : ""}
                {eq.enabled ? " · EQ" : ""}
              </span>
            </button>

            <button
              type="button"
              className="np-action-pill"
              onClick={() => setShareLyricsOpen(true)}
              title="Studio Video & Kartu Lirik"
              aria-label="Buka Studio Video Lirik"
            >
              <FilmStrip size={14} weight="bold" />
              <span>Video</span>
            </button>

            <button
              type="button"
              className="np-action-pill"
              onClick={() => void startRadioFromTrack(currentTrack)}
              title="Mulai Radio Mix"
              aria-label="Mulai Radio Mix"
            >
              <Radio size={14} weight="bold" />
              <span>Radio</span>
            </button>

            <button
              type="button"
              className="np-action-pill"
              onClick={() => seekTo(currentTime + skipSec)}
              aria-label={`Maju ${skipSec} detik`}
              title={`+${skipSec}s`}
            >
              <ArrowClockwise size={14} weight="bold" />
              <span>+{skipSec}s</span>
            </button>
          </div>
        </div>

        {/* Right / Tabbed View: Full Synced Lyrics Panel */}
        <NowPlayingLyrics
          currentTrack={currentTrack}
          lyrics={lyrics}
          lyricsLoading={lyricsLoading}
          currentTime={currentTime}
          playbackState={playbackState}
          playbackRate={effectivePlaybackRate}
          lyricsFontSize={settings.lyricsFontSize}
          lyricsAlign={settings.lyricsAlign}
          lyricsAutoScroll={settings.lyricsAutoScroll}
          lyricsProgressiveBlur={settings.lyricsProgressiveBlur}
          lyricsOffsetMs={settings.lyricsOffsetMs}
          onShiftOffset={shiftLyricsOffset}
          onSeek={seekTo}
          onOpenShareModal={() => setShareLyricsOpen(true)}
          onCopyLyrics={handleCopyLyrics}
        />
      </div>

      {/* Lyrics Card & Video Studio Modal */}
      {currentTrack && (
        <LyricsShareModal
          open={shareLyricsOpen}
          onClose={() => setShareLyricsOpen(false)}
          track={currentTrack}
          lines={lyricLinesForShare}
          initialIndex={Math.max(0, currentLyricIndex)}
        />
      )}

      {/* Compact Speed, Pitch & Equalizer Popup Dialog */}
      <SpeedPitchModal
        open={speedPitchOpen}
        onClose={() => setSpeedPitchOpen(false)}
      />

      {/* Unified Settings & Controls Modal (Kontrol, EQ & DSP, Antrean, Info) */}
      <QuickSettingsModal
        open={quickSettingsOpen}
        onClose={() => setQuickSettingsOpen(false)}
        onOpenFullSettings={
          onOpenFullSettings
            ? () => {
                setQuickSettingsOpen(false);
                setNowPlayingOpen(false);
                onOpenFullSettings();
              }
            : undefined
        }
      />
    </div>
  );
}
