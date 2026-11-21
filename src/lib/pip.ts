import type { Track } from "../types/music";
import { formatTime } from "./waveform";

export type PipMode = "off" | "document-pip" | "canvas-pip" | "floating";

interface PipControllerOptions {
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

declare global {
  interface Window {
    documentPictureInPicture?: {
      requestWindow(opts?: { width?: number; height?: number }): Promise<Window>;
      window?: Window | null;
    };
  }
}

export class BackgroundPipController {
  private docPipWin: Window | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private mode: PipMode = "off";
  private opts: PipControllerOptions;

  constructor(opts: PipControllerOptions) {
    this.opts = opts;
  }

  getMode(): PipMode {
    return this.mode;
  }

  async open(
    track: Track,
    isPlaying: boolean,
    currentTime: number,
    duration: number,
  ): Promise<PipMode> {
    this.close(false);

    // 1. Prefer Document Picture-in-Picture (Chrome / Edge desktop)
    if (typeof window !== "undefined" && window.documentPictureInPicture) {
      try {
        const pipWin = await window.documentPictureInPicture.requestWindow({
          width: 340,
          height: 156,
        });
        this.docPipWin = pipWin;
        this.mode = "document-pip";
        this.setupDocPipDom(pipWin);
        this.update(track, isPlaying, currentTime, duration);
        pipWin.addEventListener("pagehide", () => {
          if (this.mode === "document-pip") {
            this.docPipWin = null;
            this.mode = "off";
            this.opts.onClose();
          }
        });
        return this.mode;
      } catch {
        // Fallback to Canvas Video PiP
      }
    }

    // 2. Canvas Video PiP fallback
    if (
      typeof document !== "undefined" &&
      document.pictureInPictureEnabled &&
      typeof HTMLCanvasElement !== "undefined" &&
      typeof HTMLCanvasElement.prototype.captureStream === "function"
    ) {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 480;
        canvas.height = 270;
        this.canvasEl = canvas;

        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.style.position = "fixed";
        video.style.left = "-9999px";
        video.style.width = "10px";
        video.style.height = "10px";
        document.body.appendChild(video);

        const stream = canvas.captureStream(1);
        video.srcObject = stream;
        this.videoEl = video;
        this.mode = "canvas-pip";

        this.drawCanvas(track, isPlaying, currentTime, duration);
        await video.play();
        await video.requestPictureInPicture();

        video.addEventListener("leavepictureinpicture", () => {
          if (this.mode === "canvas-pip") {
            this.cleanupCanvas();
            this.mode = "off";
            this.opts.onClose();
          }
        });
        return this.mode;
      } catch {
        this.cleanupCanvas();
      }
    }

    // 3. In-app Floating mini window fallback (ideal on mobile browsers)
    this.mode = "floating";
    return this.mode;
  }

  private setupDocPipDom(win: Window): void {
    const doc = win.document;
    doc.body.style.cssText =
      "margin:0;padding:12px 14px;background:#171B22;color:#F7F5F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;display:flex;flex-direction:column;justify-content:space-between;height:100vh;box-sizing:border-box;user-select:none;";

    doc.body.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;min-width:0;">
        <img id="m-art" src="" alt="" style="width:52px;height:52px;border-radius:10px;object-fit:cover;background:#232934;flex-shrink:0;" />
        <div style="min-width:0;flex:1;">
          <div id="m-title" style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"></div>
          <div id="m-artist" style="font-size:12px;color:#C1C5CF;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:2px;"></div>
        </div>
      </div>
      <div>
        <div style="height:4px;border-radius:999px;background:rgba(255,255,255,0.14);overflow:hidden;margin-bottom:8px;">
          <div id="m-prog" style="height:100%;width:0%;background:#8EB8E5;border-radius:999px;transition:width 0.25s linear;"></div>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span id="m-time" style="font-size:11px;color:#C1C5CF;font-variant-numeric:tabular-nums;">0:00 / 0:00</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <button id="m-prev" style="border:none;background:#232934;color:#F7F5F0;border-radius:999px;padding:6px 10px;cursor:pointer;font-size:12px;font-weight:600;">Prev</button>
            <button id="m-play" style="border:none;background:#F7F5F0;color:#171B22;border-radius:999px;padding:6px 14px;cursor:pointer;font-size:12px;font-weight:700;">Pause</button>
            <button id="m-next" style="border:none;background:#232934;color:#F7F5F0;border-radius:999px;padding:6px 10px;cursor:pointer;font-size:12px;font-weight:600;">Next</button>
          </div>
        </div>
      </div>
    `;

    doc.getElementById("m-prev")?.addEventListener("click", () => this.opts.onPrev());
    doc.getElementById("m-play")?.addEventListener("click", () => this.opts.onTogglePlay());
    doc.getElementById("m-next")?.addEventListener("click", () => this.opts.onNext());
  }

  update(track: Track, isPlaying: boolean, currentTime: number, duration: number): void {
    if (this.mode === "document-pip" && this.docPipWin && !this.docPipWin.closed) {
      const doc = this.docPipWin.document;
      const art = doc.getElementById("m-art") as HTMLImageElement | null;
      const title = doc.getElementById("m-title");
      const artist = doc.getElementById("m-artist");
      const prog = doc.getElementById("m-prog");
      const time = doc.getElementById("m-time");
      const play = doc.getElementById("m-play");
      if (art && art.src !== track.artwork) art.src = track.artwork;
      if (title) title.textContent = track.title;
      if (artist) artist.textContent = track.artist;
      const pct = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
      if (prog) prog.style.width = `${pct.toFixed(1)}%`;
      if (time) time.textContent = `${formatTime(currentTime)} / ${formatTime(duration)}`;
      if (play) play.textContent = isPlaying ? "Pause" : "Play";
    } else if (this.mode === "canvas-pip" && this.canvasEl) {
      this.drawCanvas(track, isPlaying, currentTime, duration);
    }
  }

  private drawCanvas(track: Track, isPlaying: boolean, currentTime: number, duration: number): void {
    if (!this.canvasEl) return;
    const ctx = this.canvasEl.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#171B22";
    ctx.fillRect(0, 0, 480, 270);

    ctx.fillStyle = "#8EB8E5";
    ctx.font = "600 14px sans-serif";
    ctx.fillText(isPlaying ? "NOW PLAYING · MELD" : "PAUSED · MELD", 28, 44);

    ctx.fillStyle = "#F7F5F0";
    ctx.font = "700 26px sans-serif";
    ctx.fillText(track.title.slice(0, 28), 28, 108);

    ctx.fillStyle = "#C1C5CF";
    ctx.font = "500 18px sans-serif";
    ctx.fillText(track.artist.slice(0, 34), 28, 142);

    const pct = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(28, 200, 424, 8);
    ctx.fillStyle = "#8EB8E5";
    ctx.fillRect(28, 200, Math.round(424 * pct), 8);

    ctx.fillStyle = "#C1C5CF";
    ctx.font = "500 14px monospace";
    ctx.fillText(`${formatTime(currentTime)} / ${formatTime(duration)}`, 28, 236);
  }

  private cleanupCanvas(): void {
    if (document.pictureInPictureElement === this.videoEl) {
      void document.exitPictureInPicture().catch(() => {});
    }
    this.videoEl?.remove();
    this.videoEl = null;
    this.canvasEl = null;
  }

  close(notify = true): void {
    if (this.docPipWin && !this.docPipWin.closed) {
      this.docPipWin.close();
    }
    this.docPipWin = null;
    this.cleanupCanvas();
    this.mode = "off";
    if (notify) this.opts.onClose();
  }
}
