// Direct Client-Side YouTube IFrame Audio/Video Engine (Zero VPS Streaming Load)
// Supports playback speed control, cue-on-change, and non-occluded mobile resilience.

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: string | HTMLElement,
        opts: {
          height?: string;
          width?: string;
          videoId?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (e: { target: YTPlayerInstance }) => void;
            onStateChange?: (e: { data: number }) => void;
            onError?: (e: { data: number }) => void;
          };
        },
      ) => YTPlayerInstance;
      PlayerState: {
        UNSTARTED: -1;
        ENDED: 0;
        PLAYING: 1;
        PAUSED: 2;
        BUFFERING: 3;
        CUED: 5;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayerInstance {
  loadVideoById(videoId: string): void;
  cueVideoById(videoId: string): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  setVolume(volume: number): void;
  setPlaybackRate(rate: number): void;
  mute(): void;
  unMute(): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}

export interface EngineCallbacks {
  onStateChange: (state: "playing" | "paused" | "buffering" | "ended" | "idle") => void;
  onProgress: (currentTime: number, duration: number) => void;
  onError: (code: number) => void;
}

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;

  apiLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      resolve();
    };
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => reject(new Error("Failed to load YouTube IFrame API"));
      document.head.appendChild(script);
    }
  });
  return apiLoadPromise;
}

export class YouTubeAudioEngine {
  private player: YTPlayerInstance | null = null;
  private ready = false;
  private pendingVideoId: { id: string; autoplay: boolean } | null = null;
  private pendingVolume = 85;
  private pendingRate = 1;
  private pollTimer: number | null = null;
  private callbacks: EngineCallbacks;
  private userPaused = false;

  constructor(callbacks: EngineCallbacks) {
    this.callbacks = callbacks;
  }

  async mount(hostElement: HTMLElement): Promise<void> {
    if (this.player) return;
    await loadYouTubeApi();
    if (!window.YT?.Player) return;

    this.player = new window.YT.Player(hostElement, {
      width: "100%",
      height: "100%",
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        enablejsapi: 1,
        fs: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          this.ready = true;
          this.player?.setVolume(this.pendingVolume);
          this.player?.setPlaybackRate?.(this.pendingRate);
          if (this.pendingVideoId) {
            const { id, autoplay } = this.pendingVideoId;
            this.pendingVideoId = null;
            if (autoplay) this.player?.loadVideoById(id);
            else this.player?.cueVideoById(id);
          }
          this.startPolling();
        },
        onStateChange: (ev) => {
          const PS = window.YT?.PlayerState;
          if (!PS) return;
          if (ev.data === PS.PLAYING) {
            this.userPaused = false;
            this.player?.setPlaybackRate?.(this.pendingRate);
            this.callbacks.onStateChange("playing");
          } else if (ev.data === PS.PAUSED) {
            // Check if pause occurred without user intent (e.g. mobile tab switched, minimized, or screen locked)
            if (!this.userPaused) {
              // Immediately command YouTube player to keep playing in background
              try {
                this.player?.playVideo();
              } catch (_) {}
              setTimeout(() => {
                if (!this.userPaused && this.player) {
                  try {
                    this.player.playVideo();
                  } catch (_) {}
                }
              }, 80);
              setTimeout(() => {
                if (!this.userPaused && this.player) {
                  try {
                    this.player.playVideo();
                  } catch (_) {}
                }
              }, 240);
              return; // DO NOT emit 'paused' callback so app & mediaSession stay active in playing state!
            }
            this.callbacks.onStateChange("paused");
          } else if (ev.data === PS.BUFFERING) {
            this.callbacks.onStateChange("buffering");
          } else if (ev.data === PS.ENDED) {
            this.callbacks.onStateChange("ended");
          }
        },
        onError: (ev) => {
          this.callbacks.onError(ev.data);
        },
      },
    });
  }

  private startPolling(): void {
    if (this.pollTimer !== null) return;
    this.pollTimer = window.setInterval(() => {
      if (!this.player || !this.ready) return;
      try {
        const cur = this.player.getCurrentTime() || 0;
        const dur = this.player.getDuration() || 0;
        this.callbacks.onProgress(cur, dur);

        // Auto-recover if paused in background without user consent
        if (!this.userPaused) {
          const st = this.player.getPlayerState();
          const PS = window.YT?.PlayerState;
          if (PS && (st === PS.PAUSED || st === PS.UNSTARTED)) {
            this.player.playVideo();
          }
        }
      } catch {
        // ignore transient iframe errors
      }
    }, 400);
  }

  load(videoId: string, autoplay = true): void {
    if (autoplay) this.userPaused = false;
    if (!this.ready || !this.player) {
      this.pendingVideoId = { id: videoId, autoplay };
      return;
    }
    if (autoplay) {
      this.player.loadVideoById(videoId);
    } else {
      this.player.cueVideoById(videoId);
    }
  }

  play(): void {
    this.userPaused = false;
    if (this.ready && this.player) {
      try {
        this.player.playVideo();
      } catch (_) {}
      setTimeout(() => {
        if (!this.userPaused && this.player) {
          try {
            this.player.playVideo();
          } catch (_) {}
        }
      }, 80);
    }
  }

  pause(): void {
    this.userPaused = true;
    if (this.ready && this.player) {
      this.player.pauseVideo();
    }
  }

  seekTo(seconds: number): void {
    if (this.ready && this.player) {
      this.player.seekTo(Math.max(0, seconds), true);
    }
  }

  setVolume(vol: number): void {
    this.pendingVolume = Math.max(0, Math.min(100, vol));
    if (this.ready && this.player) {
      this.player.setVolume(this.pendingVolume);
    }
  }

  setPlaybackRate(rate: number): void {
    this.pendingRate = rate;
    if (this.ready && this.player) {
      try {
        this.player.setPlaybackRate(rate);
      } catch {
        // some environments clamp rate
      }
    }
  }

  setMuted(muted: boolean): void {
    if (!this.ready || !this.player) return;
    if (muted) this.player.mute();
    else this.player.unMute();
  }

  syncOnVisibility(): void {
    if (!this.ready || !this.player) return;
    try {
      const cur = this.player.getCurrentTime() || 0;
      const dur = this.player.getDuration() || 0;
      this.callbacks.onProgress(cur, dur);
      const st = this.player.getPlayerState();
      const PS = window.YT?.PlayerState;
      if (PS && st === PS.PLAYING) {
        this.callbacks.onStateChange("playing");
      } else if (!this.userPaused) {
        this.play();
        this.callbacks.onStateChange("playing");
      } else if (PS && st === PS.PAUSED) {
        this.callbacks.onStateChange("paused");
      }
    } catch {
      // ignore
    }
  }

  destroy(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    try {
      this.player?.destroy();
    } catch {
      // noop
    }
    this.player = null;
    this.ready = false;
  }
}
